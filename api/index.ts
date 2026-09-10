import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma';
import {
  listOperations, insertOperation, updateOperation, deleteOperation,
  listExtras, insertExtra, updateExtra, deleteExtra,
  getBank, saveBank, insertOperationsBulk, insertExtrasBulk,
} from './lib/db';

// Força runtime Node (adapter Neon usa API Node)
export const runtime = 'nodejs';

const app = new Hono().basePath('/api');
app.use('*', async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
});

// ---------- Auth ----------

app.post('/auth/register', async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  if (!email || !password) return c.json({ error: 'email e senha obrigatórios' }, 400);
  if (password.length < 6) return c.json({ error: 'senha precisa de 6+ caracteres' }, 400);

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return c.json({ error: 'e-mail já cadastrado' }, 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash },
  });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: '30d' });
  return c.json({ user: { id: user.id, email: user.email }, token }, 201);
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  if (!email || !password) return c.json({ error: 'email e senha obrigatórios' }, 400);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return c.json({ error: 'credenciais inválidas' }, 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return c.json({ error: 'credenciais inválidas' }, 401);

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: '30d' });
  return c.json({ user: { id: user.id, email: user.email }, token });
});

// ---------- Operations ----------

app.get('/operations', async (c) => c.json(await listOperations(c.req.raw)));
app.post('/operations', async (c) => c.json(await insertOperation(c.req.raw, await c.req.json()), 201));
app.post('/operations/bulk', async (c) => c.json(await insertOperationsBulk(c.req.raw, await c.req.json())));
app.put('/operations/:id', async (c) => c.json(await updateOperation(c.req.raw, c.req.param('id'), await c.req.json())));
app.delete('/operations/:id', async (c) => c.json(await deleteOperation(c.req.raw, c.req.param('id'))));

// ---------- Extras ----------

app.get('/extras', async (c) => c.json(await listExtras(c.req.raw)));
app.post('/extras', async (c) => c.json(await insertExtra(c.req.raw, await c.req.json()), 201));
app.post('/extras/bulk', async (c) => c.json(await insertExtrasBulk(c.req.raw, await c.req.json())));
app.put('/extras/:id', async (c) => c.json(await updateExtra(c.req.raw, c.req.param('id'), await c.req.json())));
app.delete('/extras/:id', async (c) => c.json(await deleteExtra(c.req.raw, c.req.param('id'))));

// ---------- Bank ----------

app.get('/bank', async (c) => c.json(await getBank(c.req.raw)));
app.put('/bank', async (c) => {
  const { value } = await c.req.json<{ value: number }>();
  return c.json(await saveBank(c.req.raw, value));
});

app.onError((err, c) => {
  const msg = err instanceof Error ? err.message : 'erro interno';
  return c.json({ error: msg }, msg === 'Não autenticado' ? 401 : 500);
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
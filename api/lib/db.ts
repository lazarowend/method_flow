import { prisma } from './prisma';
import type { Operation, Extra, Bank } from '../../src/lib/types';
import type { OperationInput, ExtraInput } from '../../src/lib/types';
import jwt from 'jsonwebtoken';

// ---------- util ----------

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function getUserId(req: Request): string | null {
  try {
    const token = getBearerToken(req);
    if (!token) return null;
    const { userId } = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as { userId: string };
    return userId;
  } catch {
    return null;
  }
}

// ---------- Operations ----------

export async function listOperations(req: Request) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rows = await prisma.operation.findMany({ where: { userId }, orderBy: { date: 'desc', time: 'desc' } });
  return { data: rows };
}

export async function insertOperation(req: Request, input: OperationInput) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rec = await prisma.operation.create({ data: { ...input, userId } });
  return { data: rec };
}

export async function updateOperation(req: Request, id: string, input: OperationInput) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rec = await prisma.operation.update({ where: { id, userId }, data: { ...input } });
  return { data: rec };
}

export async function deleteOperation(req: Request, id: string) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  await prisma.operation.delete({ where: { id, userId } });
  return { success: true };
}

// ---------- Extras ----------

export async function listExtras(req: Request) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rows = await prisma.extra.findMany({ where: { userId }, orderBy: { date: 'desc', time: 'desc' } });
  return { data: rows };
}

export async function insertExtra(req: Request, input: ExtraInput) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rec = await prisma.extra.create({ data: { ...input, userId } });
  return { data: rec };
}

export async function updateExtra(req: Request, id: string, input: ExtraInput) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rec = await prisma.extra.update({ where: { id, userId }, data: { ...input } });
  return { data: rec };
}

export async function deleteExtra(req: Request, id: string) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  await prisma.extra.delete({ where: { id, userId } });
  return { success: true };
}

// ---------- Bank ----------

export async function getBank(req: Request) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const row = await prisma.bank.findFirst({ where: { userId } });
  if (!row) {
    const created = await prisma.bank.create({ data: { userId, initialValue: 0 } });
    return { data: created };
  }
  return { data: row };
}

export async function saveBank(req: Request, value: number) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  const rec = await prisma.bank.upsert({
    where: { userId },
    update: { initialValue: value, updatedAt: new Date() },
    create: { userId, initialValue: value },
  });
  return { data: rec };
}

// ---------- bulk ----------

export async function insertOperationsBulk(req: Request, inputs: OperationInput[]) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  await prisma.operation.createMany({ data: inputs.map(i => ({ ...i, userId })), skipDuplicates: true });
  return { success: true };
}

export async function insertExtrasBulk(req: Request, inputs: ExtraInput[]) {
  const userId = getUserId(req);
  if (!userId) throw new Error('Não autenticado');
  await prisma.extra.createMany({ data: inputs.map(i => ({ ...i, userId })), skipDuplicates: true });
  return { success: true };
}
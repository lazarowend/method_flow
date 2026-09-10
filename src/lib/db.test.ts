import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  listOperations,
  insertOperation,
  insertOperationsBulk,
  updateOperation,
  deleteOperation,
  getBank,
  saveBank,
  insertExtra,
  updateExtra,
  listExtras,
  deleteExtra,
  insertExtrasBulk,
} from './db';
import type { OperationInput, ExtraInput } from './types';

async function clear() {
  await db.operations.clear();
  await db.extras.clear();
  await db.bank.clear();
}

const opInput: OperationInput = {
  date: '2026-09-08',
  time: '19:00',
  competition: 'Brasil - Campeonato Brasileiro Série A',
  game: 'Flamengo x Palmeiras',
  stake: 100,
  payout: 25,
  doubleGreen: 'Duplo',
  profit: 200,
  result: 125,
  notes: null,
  fixtureId: 42,
  league: 'Campeonato Brasileiro Série A',
};

const extraInput: ExtraInput = {
  date: '2026-09-08',
  time: '12:00',
  amount: 50,
  notes: 'recarga',
};

beforeEach(async () => {
  await clear();
});

describe('operations CRUD', () => {
  it('insere e lista operações ordenadas por data desc', async () => {
    const older = await insertOperation({ ...opInput, date: '2026-09-01', game: 'Older' });
    const newer = await insertOperation({ ...opInput, date: '2026-09-08', game: 'Newer' });
    expect(older.id).toBeTruthy();
    expect(newer.id).toBeTruthy();
    const all = await listOperations();
    expect(all.map((o) => o.game)).toEqual(['Newer', 'Older']);
  });

  it('atualiza operação existente preservando o id', async () => {
    const rec = await insertOperation(opInput);
    const updated = await updateOperation(rec.id, { ...opInput, stake: 250, result: 300 });
    expect(updated.id).toBe(rec.id);
    expect(updated.stake).toBe(250);
    const all = await listOperations();
    expect(all).toHaveLength(1);
    expect(all[0].stake).toBe(250);
  });

  it('deleta operação', async () => {
    const rec = await insertOperation(opInput);
    await deleteOperation(rec.id);
    expect(await listOperations()).toEqual([]);
  });

  it('insere em lote', async () => {
    const recs = await insertOperationsBulk([
      opInput,
      { ...opInput, game: 'Time A x Time B', date: '2026-09-02' },
    ]);
    expect(recs).toHaveLength(2);
    expect((await listOperations()).length).toBe(2);
  });

  it('lote vazio não falha', async () => {
    expect(await insertOperationsBulk([])).toEqual([]);
  });
});

describe('bank', () => {
  it('resgata o banco mais recente (ou null se vazio)', async () => {
    expect(await getBank()).toBeNull();
    const b = await saveBank(5000, null);
    expect(b.initialValue).toBe(5000);
    expect((await getBank())?.initialValue).toBe(5000);
  });

  it('atualiza mantendo o mesmo id', async () => {
    const b1 = await saveBank(1000, null);
    const b2 = await saveBank(2500, await getBank());
    expect(b2.id).toBe(b1.id);
    expect((await getBank())?.initialValue).toBe(2500);
  });
});

describe('extras CRUD', () => {
  it('insere e lista extras', async () => {
    await insertExtra(extraInput);
    await insertExtra({ ...extraInput, date: '2026-09-01', notes: 'ax' });
    const all = await listExtras();
    expect(all).toHaveLength(2);
    expect(all[0].date).toBe('2026-09-08'); // mais recente primeiro
  });

  it('atualiza extra', async () => {
    const rec = await insertExtra(extraInput);
    const up = await updateExtra(rec.id, { ...extraInput, amount: 99 });
    expect(up.amount).toBe(99);
    expect((await listExtras())[0].amount).toBe(99);
  });

  it('deleta extra', async () => {
    const rec = await insertExtra(extraInput);
    await deleteExtra(rec.id);
    expect(await listExtras()).toEqual([]);
  });

  it('insere extras em lote', async () => {
    await insertExtrasBulk([extraInput, { ...extraInput, amount: 10 }]);
    expect(await listExtras()).toHaveLength(2);
  });
});
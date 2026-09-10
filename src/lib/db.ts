import Dexie, { type Table } from 'dexie';
import type { Operation, OperationInput, Bank, Extra, ExtraInput } from './types';

/**
 * Camada de persistência local (IndexedDB via Dexie).
 * Sem rede, sem cota, sem RLS. Dados ficam no navegador e persistem entre sessões.
 */
class DuploGreenDB extends Dexie {
  operations!: Table<Operation, string>;
  bank!: Table<Bank, string>;
  extras!: Table<Extra, string>;

  constructor() {
    super('duplo_green_db');
    // v2: campos renomeados para inglês (anteriormente armazenados em pt-br).
    // v1 → v2 descarta dados de teste; não há migração de dados reais.
    this.version(2).stores({
      operations: 'id, date, time, competition, doubleGreen, createdAt',
      bank: 'id, updatedAt',
      extras: 'id, date, time, createdAt',
    });
  }
}

export const db = new DuploGreenDB();

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Operations ----------

export async function listOperations(): Promise<Operation[]> {
  return db.operations
    .orderBy('date')
    .reverse()
    .toArray()
    .then((rows) =>
      rows.sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        if (cmp !== 0) return -cmp; // mais recente primeiro
        return -a.time.localeCompare(b.time);
      })
    );
}

export async function insertOperation(input: OperationInput): Promise<Operation> {
  const rec: Operation = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  await db.operations.add(rec);
  return rec;
}

export async function updateOperation(id: string, input: OperationInput): Promise<Operation> {
  const rec: Operation = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };
  await db.operations.put(rec);
  return rec;
}

export async function deleteOperation(id: string): Promise<void> {
  await db.operations.delete(id);
}

export async function insertOperationsBulk(inputs: OperationInput[]): Promise<Operation[]> {
  if (inputs.length === 0) return [];
  const recs: Operation[] = inputs.map((input) => ({
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  }));
  await db.operations.bulkAdd(recs);
  return recs;
}

// ---------- Bank ----------

export async function getBank(): Promise<Bank | null> {
  const rows = await db.bank.orderBy('updatedAt').reverse().limit(1).toArray();
  return rows[0] ?? null;
}

export async function saveBank(initialValue: number, bank: Bank | null): Promise<Bank> {
  const rec: Bank = {
    id: bank?.id ?? newId(),
    initialValue,
    updatedAt: new Date().toISOString(),
  };
  await db.bank.put(rec);
  return rec;
}

// ---------- Extras ----------

export async function listExtras(): Promise<Extra[]> {
  return db.extras
    .orderBy('date')
    .reverse()
    .toArray()
    .then((rows) =>
      rows.sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        if (cmp !== 0) return -cmp;
        return -a.time.localeCompare(b.time);
      })
    );
}

export async function insertExtra(input: ExtraInput): Promise<Extra> {
  const rec: Extra = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  await db.extras.add(rec);
  return rec;
}

export async function updateExtra(id: string, input: ExtraInput): Promise<Extra> {
  const rec: Extra = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };
  await db.extras.put(rec);
  return rec;
}

export async function deleteExtra(id: string): Promise<void> {
  await db.extras.delete(id);
}

export async function insertExtrasBulk(inputs: ExtraInput[]): Promise<Extra[]> {
  if (inputs.length === 0) return [];
  const recs: Extra[] = inputs.map((input) => ({
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  }));
  await db.extras.bulkAdd(recs);
  return recs;
}
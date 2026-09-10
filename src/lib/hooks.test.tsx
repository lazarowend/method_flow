import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from './db';
import { useOperations } from './useOperations';
import { useExtras } from './useExtras';
import { useBank } from './useBank';

const opInput = {
  date: '2026-09-08',
  time: '20:00',
  competition: 'Brasil - Campeonato Brasileiro Série A',
  game: 'Flamengo x Palmeiras',
  stake: 100,
  payout: 25,
  doubleGreen: 'Duplo' as const,
  profit: 200,
  result: 125,
  notes: null,
  fixtureId: null,
  league: null,
};

const extraInput = { date: '2026-09-08', time: '20:00', amount: 30, notes: null };

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('useOperations', () => {
  it('carrega, insere e remove operações', async () => {
    const { result } = renderHook(() => useOperations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.insertOperation(opInput);
    });
    await waitFor(() => expect(result.current.operations).toHaveLength(1));
    expect(result.current.operations[0]).toMatchObject({ game: 'Flamengo x Palmeiras', result: 125 });

    const id = result.current.operations[0].id;
    await act(async () => {
      await result.current.deleteOperation(id);
    });
    await waitFor(() => expect(result.current.operations).toHaveLength(0));
  });

  it('importa operações em lote', async () => {
    const { result } = renderHook(() => useOperations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.importOperations([opInput, { ...opInput, date: '2026-09-09' }]);
    });
    await waitFor(() => expect(result.current.operations).toHaveLength(2));
  });
});

describe('useExtras', () => {
  it('carrega e insere extras', async () => {
    const { result } = renderHook(() => useExtras());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.insertExtra(extraInput);
    });
    await waitFor(() => expect(result.current.extras).toHaveLength(1));
    expect(result.current.extras[0]).toMatchObject({ amount: 30 });
  });
});

describe('useBank', () => {
  it('atualiza o valor do banco incrementalmente', async () => {
    const { result } = renderHook(() => useBank());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateBank(1000);
    });
    expect(result.current.bank?.initialValue).toBe(1000);
    await act(async () => {
      await result.current.updateBank(2500);
    });
    expect(result.current.bank?.initialValue).toBe(2500);
  });
});
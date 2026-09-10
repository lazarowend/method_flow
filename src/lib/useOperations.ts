import { useEffect, useState, useCallback } from 'react';
import { listOperations, insertOperation, updateOperation, deleteOperation, insertOperationsBulk } from './db';
import type { Operation, OperationInput } from './types';

export function useOperations() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOperations();
      setOperations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar operações.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const onInsert = useCallback(async (input: OperationInput) => {
    const rec = await insertOperation(input);
    setOperations((prev) => [rec, ...prev]);
    return rec;
  }, []);

  const onUpdate = useCallback(async (id: string, input: OperationInput) => {
    const rec = await updateOperation(id, input);
    setOperations((prev) => prev.map((o) => (o.id === id ? rec : o)));
  }, []);

  const onDelete = useCallback(async (id: string) => {
    await deleteOperation(id);
    setOperations((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const onImport = useCallback(async (inputs: OperationInput[]) => {
    const recs = await insertOperationsBulk(inputs);
    setOperations((prev) => [...recs, ...prev].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    }));
    return recs.length;
  }, []);

  return {
    operations,
    loading,
    error,
    refetch: fetchOperations,
    insertOperation: onInsert,
    updateOperation: onUpdate,
    deleteOperation: onDelete,
    importOperations: onImport,
  };
}
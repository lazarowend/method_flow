import { useEffect, useState, useCallback } from 'react';
import { listExtras, insertExtra, updateExtra, deleteExtra, insertExtrasBulk } from './db';
import type { Extra, ExtraInput } from './types';

export function useExtras() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExtras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listExtras();
      setExtras(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar extras.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  const onInsert = useCallback(async (input: ExtraInput) => {
    const rec = await insertExtra(input);
    setExtras((prev) => [rec, ...prev]);
    return rec;
  }, []);

  const onUpdate = useCallback(async (id: string, input: ExtraInput) => {
    const rec = await updateExtra(id, input);
    setExtras((prev) => prev.map((e) => (e.id === id ? rec : e)));
  }, []);

  const onDelete = useCallback(async (id: string) => {
    await deleteExtra(id);
    setExtras((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const onImport = useCallback(async (inputs: ExtraInput[]) => {
    const recs = await insertExtrasBulk(inputs);
    setExtras((prev) => [...recs, ...prev].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    }));
    return recs.length;
  }, []);

  return {
    extras,
    loading,
    error,
    refetch: fetchExtras,
    insertExtra: onInsert,
    updateExtra: onUpdate,
    deleteExtra: onDelete,
    importExtras: onImport,
  };
}
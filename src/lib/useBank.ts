import { useEffect, useState, useCallback } from 'react';
import { getBank, saveBank } from './db';
import type { Bank } from './types';

export function useBank() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBank = useCallback(async () => {
    setLoading(true);
    const data = await getBank();
    setBank(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBank();
  }, [fetchBank]);

  const updateBank = useCallback(async (value: number) => {
    const rec = await saveBank(value, bank);
    setBank(rec);
  }, [bank]);

  return { bank, loading, refetch: fetchBank, updateBank };
}
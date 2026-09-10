import { useState, type FormEvent } from 'react';
import { Input, Textarea } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { formatCurrency, todayISO, nowTime } from '@/lib/utils';
import type { Extra, ExtraInput } from '@/lib/types';

interface ExtraFormProps {
  onSubmit: (input: ExtraInput) => Promise<void>;
  onCancel: () => void;
  editing?: Extra | null;
}

export function ExtraForm({ onSubmit, onCancel, editing }: ExtraFormProps) {
  const [date, setDate] = useState(editing?.date || todayISO());
  const [time, setTime] = useState(editing?.time || nowTime());
  const [amount, setAmount] = useState(editing?.amount?.toString() || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = parseFloat(amount) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !time) {
      setError('Preencha data e horário.');
      return;
    }
    if (amountValue === 0) {
      setError('O valor não pode ser zero.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        time,
        amount: amountValue,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar extra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Data"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Horário"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>

      <Input
        label="Valor (R$)"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Ex: 50 para lucro, -10 para perda"
        required
      />

      <Textarea
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Descreva o motivo do lançamento extra..."
      />

      <div className="bg-slate-800/80 border border-slate-600/50 rounded-xl p-5 space-y-3 shadow-inner">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Resumo</h3>
        <div className="text-sm">
          <span className="text-slate-400">Resultado:</span>
          <p className={`text-xl font-bold ${amountValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {amountValue >= 0 ? '+' : ''}{formatCurrency(amountValue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {amountValue >= 0 ? 'Lucro extra' : 'Perda extra'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : editing ? 'Atualizar' : 'Registrar Extra'}
        </Button>
      </div>
    </form>
  );
}
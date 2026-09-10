import { useState } from 'react';
import { Wallet, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/FormFields';
import { formatCurrency } from '@/lib/utils';
import type { Operation } from '@/lib/types';

interface BankManagementProps {
  bankInitial: number;
  operations: Operation[];
  onUpdateBank: (value: number) => Promise<void>;
}

export function BankManagement({ bankInitial, operations, onUpdateBank }: BankManagementProps) {
  const [value, setValue] = useState(bankInitial.toString());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const netProfit = operations.reduce((s, o) => s + o.result, 0);
  const bankCurrent = bankInitial + netProfit;
  const totalStaked = operations.reduce((s, o) => s + o.stake, 0);
  const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onUpdateBank(parseFloat(value) || 0);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      {/* Banca atual destaque */}
      <Card tone="blue" className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20">
            <Wallet className="text-blue-400" size={22} />
          </div>
          <span className="text-sm text-slate-400 uppercase tracking-wider">Banca Atual</span>
        </div>
        <p className={`text-4xl font-bold tracking-tight ${bankCurrent >= bankInitial ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(bankCurrent)}
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-xs text-slate-500 uppercase">Banca Inicial</p>
            <p className="text-lg font-semibold text-slate-200 mt-1">{formatCurrency(bankInitial)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Lucro Líquido</p>
            <p className={`text-lg font-semibold mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">ROI</p>
            <p className={`text-lg font-semibold mt-1 ${roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {roi.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Editar banca inicial */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Definir Banca Inicial</h3>
        <p className="text-sm text-slate-500 mb-4">
          Informe o valor inicial da sua banca. A banca atual será recalculada automaticamente com base nos resultados das operações.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              label="Banca Inicial (R$)"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              <Save size={18} />
              {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 hover:border-slate-600/60 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/15">
              <TrendingUp className="text-emerald-400" size={18} />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Apostado</span>
          </div>
          <p className="text-2xl font-bold text-slate-100 tracking-tight">{formatCurrency(totalStaked)}</p>
        </Card>
        <Card className="p-5 hover:border-slate-600/60 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/15">
              <TrendingDown className="text-amber-400" size={18} />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total de Operações</span>
          </div>
          <p className="text-2xl font-bold text-slate-100 tracking-tight">{operations.length}</p>
        </Card>
      </div>
    </div>
  );
}
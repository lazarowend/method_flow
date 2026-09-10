import { useState, useMemo } from 'react';
import { Card } from '@/components/Card';
import { LineChart, BarChart } from '@/components/Charts';
import { groupByPeriod, getStreaks, formatCurrency } from '@/lib/utils';
import { Flame, AlertTriangle } from 'lucide-react';
import type { Operation } from '@/lib/types';

interface StatisticsProps {
  operations: Operation[];
  bankInitial: number;
}

export function Statistics({ operations, bankInitial }: StatisticsProps) {
  const [period, setPeriod] = useState<'dia' | 'semana' | 'mes'>('dia');

  const sorted = useMemo(() => {
    return [...operations].sort((a, b) => {
      const da = `${a.date} ${a.time}`;
      const db = `${b.date} ${b.time}`;
      return da.localeCompare(db);
    });
  }, [operations]);

  // Evolução da banca
  const bankEvolution = useMemo(() => {
    let accumulated = bankInitial;
    return sorted.map((op) => {
      accumulated += op.result;
      return {
        label: op.date.split('-').reverse().join('/'),
        value: accumulated,
      };
    });
  }, [sorted, bankInitial]);

  // Resultado acumulado
  const cumulativeResult = useMemo(() => {
    let total = 0;
    return sorted.map((op) => {
      total += op.result;
      return {
        label: op.date.split('-').reverse().join('/'),
        value: total,
      };
    });
  }, [sorted]);

  // Lucro/Prejuízo por operação
  const profitLoss = useMemo(() => {
    return sorted.map((op) => ({
      label: op.date.split('-').reverse().join('/'),
      value: op.result,
    }));
  }, [sorted]);

  // Agrupamento por período
  const grouped = useMemo(() => groupByPeriod(sorted, period), [sorted, period]);

  const periodData = useMemo(() => {
    return grouped.map((g) => ({
      label: g.label,
      value: g.lucro,
    }));
  }, [grouped]);

  const streaks = useMemo(() => getStreaks(operations), [operations]);

  // Estatísticas por período
  const periodStats = useMemo(() => {
    return grouped.map((g) => {
      return {
        label: g.label,
        operations: g.total,
        lucro: g.lucro,
        doubles: operations.filter((o) => {
          if (period === 'dia') return o.date === g.label && o.doubleGreen === 'Duplo';
          if (period === 'mes') {
            const [y, m] = g.label.split('-');
            return o.date.startsWith(`${y}-${m}`) && o.doubleGreen === 'Duplo';
          }
          return false;
        }).length,
      };
    });
  }, [grouped, period, operations]);

  return (
    <div className="space-y-6">
      {/* Sequências */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card tone="emerald" className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Sequência Atual de Duplos</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1 tracking-tight">{streaks.doubles}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Flame className="text-emerald-400" size={24} />
            </div>
          </div>
        </Card>
        <Card tone="rose" className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Sequência Atual de Não Duplos</p>
              <p className="text-3xl font-bold text-rose-400 mt-1 tracking-tight">{streaks.nonDoubles}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/20">
              <AlertTriangle className="text-rose-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico de evolução da banca */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 tracking-tight">Evolução da Banca</h3>
        <LineChart data={bankEvolution} height={250} color="#60a5fa" fillColor="rgba(96, 165, 250, 0.15)" formatValue={formatCurrency} />
      </Card>

      {/* Resultado acumulado */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 tracking-tight">Resultado Acumulado</h3>
        <LineChart data={cumulativeResult} height={250} color="#22d3ee" fillColor="rgba(34, 211, 238, 0.15)" formatValue={formatCurrency} />
      </Card>

      {/* Lucro/Prejuízo por operação */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 tracking-tight">Lucro/Prejuízo por Operação</h3>
        <BarChart data={profitLoss} height={250} formatValue={formatCurrency} />
      </Card>

      {/* Filtro de período */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-100 tracking-tight">Estatísticas por Período</h3>
          <div className="flex gap-1 bg-slate-800/90 rounded-lg p-1 border border-slate-600/70 shadow-sm w-full sm:w-auto">
            {(['dia', 'semana', 'mes'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === p ? 'bg-blue-600 text-white shadow-[0_2px_8px_-2px_rgba(59,130,246,0.6)]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'dia' ? 'Dia' : p === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {periodData.length > 0 && (
          <div className="mb-6">
            <BarChart data={periodData} height={200} formatValue={formatCurrency} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase text-xs tracking-wider">
                <th className="px-3 py-2 text-left font-medium">Período</th>
                <th className="px-3 py-2 text-right font-medium">Operações</th>
                <th className="px-3 py-2 text-right font-medium">Duplos</th>
                <th className="px-3 py-2 text-right font-medium">Lucro/Prejuízo</th>
              </tr>
            </thead>
            <tbody>
              {periodStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Sem dados para este período.
                  </td>
                </tr>
              ) : (
                periodStats.map((s) => (
                  <tr key={s.label} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                    <td className="px-3 py-2.5 text-slate-300">{s.label}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">{s.operations}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400">{s.doubles}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${s.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s.lucro >= 0 ? '+' : ''}{formatCurrency(s.lucro)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Repeat,
  BarChart3,
  Trophy,
  Percent,
  Activity,
  DollarSign,
  ArrowUpDown,
  Radio,
  Gauge,
  Zap,
} from 'lucide-react';
import { Card, StatCard } from '@/components/Card';
import { LineChart } from '@/components/Charts';
import { formatCurrency, formatPercent, calcDashboardStats, calcValueAtRisk, calcAverageLossPct, filterByPeriod, type PeriodFilter } from '@/lib/utils';
import type { Operation, Extra } from '@/lib/types';

interface DashboardProps {
  operations: Operation[];
  extras: Extra[];
  bankInitial: number;
}

const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

export function Dashboard({ operations, extras, bankInitial }: DashboardProps) {
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState<PeriodFilter>('all');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredOps = useMemo(() => filterByPeriod(operations, period, now), [operations, period, now]);
  // Stats completas (banca real) + stats do período filtrado (desempenho)
  const allStats = useMemo(() => calcDashboardStats(operations, bankInitial), [operations, bankInitial]);
  const stats = useMemo(() => calcDashboardStats(filteredOps, bankInitial), [filteredOps, bankInitial]);
  const valueAtRisk = calcValueAtRisk(filteredOps, now);
  const extrasTotal = extras.reduce((sum, e) => sum + e.amount, 0);
  const bankCurrentWithExtras = allStats.bankCurrent + extrasTotal;

  // Extras filtrados pela mesma lógica de período (para as métricas e a evolução)
  const extrasInPeriod = useMemo(() => {
    if (period === 'all') return extras;
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return extras.filter((e) => {
      if (period === 'today') return e.date === today;
      if (period === 'month') return e.date.slice(0, 7) === today.slice(0, 7);
      const opTs = new Date(e.date + 'T00:00:00').getTime();
      const startTs = new Date(today + 'T00:00:00').getTime() - 6 * 24 * 60 * 60 * 1000;
      return opTs >= startTs && opTs <= new Date(today + 'T00:00:00').getTime();
    });
  }, [extras, period, now]);

  const extrasTotalPeriod = useMemo(() => extrasInPeriod.reduce((sum, e) => sum + e.amount, 0), [extrasInPeriod]);
  const netProfitTotal = stats.netProfit + extrasTotalPeriod;
  const avgLossPct = calcAverageLossPct(filteredOps, extrasTotalPeriod);

  // Events for chart: operations + filtered extras
  const events: { date: string; time: string; value: number }[] = [
    ...filteredOps.map((o) => ({ date: o.date, time: o.time, value: o.result })),
    ...extrasInPeriod.map((e) => ({ date: e.date, time: e.time, value: e.amount })),
  ];

  // Build bank evolution: start with initial, then apply each event in chronological order
  const bankEvolution: { label: string; value: number }[] = [{ label: 'Início', value: bankInitial }];
  if (events.length > 0) {
    const sortedEvents = events.sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );
    let cumulative = bankInitial;
    for (const ev of sortedEvents) {
      cumulative += ev.value;
      bankEvolution.push({
        label: ev.date.split('-').reverse().join('/'),
        value: cumulative,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Dashboard</h2>
        <div className="flex gap-1 bg-slate-800/90 rounded-lg p-1 border border-slate-600/70 shadow-sm">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p.id
                  ? 'bg-blue-600 text-white shadow-[0_2px_8px_-2px_rgba(59,130,246,0.6)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card tone="blue" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Wallet size={20} />
            </div>
            <span className="text-sm text-slate-400 uppercase tracking-wider">Banca Atual</span>
          </div>
          <p className={`text-3xl font-bold tracking-tight ${bankCurrentWithExtras >= allStats.bankInitial ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(bankCurrentWithExtras)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-slate-500">Inicial:</span>
            <span className="text-slate-300">{formatCurrency(allStats.bankInitial)}</span>
          </div>
        </Card>

        <Card tone={netProfitTotal >= 0 ? 'emerald' : 'rose'} className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-slate-800/90">
              <ArrowUpDown className={netProfitTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'} size={20} />
            </div>
            <span className="text-sm text-slate-400 uppercase tracking-wider">Lucro Líquido</span>
          </div>
          <p className={`text-3xl font-bold tracking-tight ${netProfitTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netProfitTotal >= 0 ? '+' : ''}{formatCurrency(netProfitTotal)}
          </p>
          {extrasTotal !== 0 && (
            <div className="mt-1 text-xs text-amber-400/80">
              Extras: {extrasTotal >= 0 ? '+' : ''}{formatCurrency(extrasTotal)}
            </div>
          )}
          <div className="mt-3 text-sm text-slate-500">
            ROI: <span className={stats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatPercent(stats.roi)}</span>
          </div>
        </Card>

        <Card tone="amber" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Radio size={20} />
              {valueAtRisk.total > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </div>
            <span className="text-sm text-slate-400 uppercase tracking-wider">Valor em Jogo</span>
          </div>
          <p className={`text-3xl font-bold tracking-tight ${valueAtRisk.total > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
            {formatCurrency(valueAtRisk.total)}
          </p>
          <div className="mt-3 space-y-2">
            {valueAtRisk.count > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {valueAtRisk.live} ao vivo
                  </span>
                  {valueAtRisk.upcoming > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                      {valueAtRisk.upcoming} futuro(s)
                    </span>
                  )}
                </div>
                {valueAtRisk.upcoming > 0 && valueAtRisk.live === 0 && (
                  <div className="text-xs text-slate-500">Nenhum jogo ao vivo no momento</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500">Nenhum jogo em andamento</div>
            )}
          </div>
        </Card>

        <Card tone="violet" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
              <Target size={20} />
            </div>
            <span className="text-sm text-slate-400 uppercase tracking-wider">Taxa Duplo Green</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-violet-300">{formatPercent(stats.doubleGreenRate)}</p>
          <div className="mt-3 text-sm text-slate-500">
            {stats.totalDoubles} duplos / {stats.totalOperations} operações
          </div>
        </Card>
      </div>

      {/* Grid de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Operações"
          value={stats.totalOperations.toString()}
          accent="blue"
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Duplos"
          value={stats.totalDoubles.toString()}
          variant="profit"
          accent="emerald"
          icon={<Repeat size={18} />}
        />
        <StatCard
          label="Não Duplos"
          value={stats.totalNonDoubles.toString()}
          variant="loss"
          accent="rose"
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="Total Apostado"
          value={formatCurrency(stats.totalStaked)}
          variant="neutral"
          accent="cyan"
          icon={<DollarSign size={18} />}
        />
        <StatCard
          label="Média Apostada"
          value={formatCurrency(stats.avgStake)}
          accent="violet"
          icon={<Target size={18} />}
        />
        <StatCard
          label="Perda Média / 1.000"
          value={formatPercent(avgLossPct)}
          variant={avgLossPct <= 0 ? 'profit' : 'loss'}
          accent={avgLossPct <= 0 ? 'emerald' : 'rose'}
          icon={<Gauge size={18} />}
          sublabel="(perda + extras) / apostado"
        />
        <StatCard
          label="ROI"
          value={formatPercent(stats.roi)}
          variant={stats.roi >= 0 ? 'profit' : 'loss'}
          accent="cyan"
          icon={<Percent size={18} />}
        />
        <StatCard
          label="Maior Lucro"
          value={formatCurrency(stats.biggestWin)}
          variant="profit"
          accent="emerald"
          icon={<Trophy size={18} />}
        />
        <StatCard
          label="Maior Prejuízo"
          value={formatCurrency(stats.biggestLoss)}
          variant="loss"
          accent="rose"
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Lucro Médio/Duplo"
          value={formatCurrency(stats.avgDoubleProfit)}
          variant="profit"
          accent="amber"
          icon={<Zap size={18} />}
        />
      </div>

      {/* Gráfico de evolução da banca */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100 tracking-tight">Evolução da Banca</h3>
          <span className="text-xs text-slate-500">acumulado ao longo das operações</span>
        </div>
        <LineChart data={bankEvolution} height={260} color="#60a5fa" fillColor="rgba(96, 165, 250, 0.15)" formatValue={formatCurrency} />
      </Card>
    </div>
  );
}
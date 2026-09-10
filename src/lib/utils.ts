import type { Operation } from './types';

export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value < 0 ? '-' : ''}R$ ${formatted}`;
}

export function formatCurrencySigned(value: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value < 0 ? '-' : '+'}R$ ${formatted}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function nowTime(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Calcula a perda padrão: stake - payout
 */
export function calcLoss(stake: number, payout: number): number {
  return stake - payout;
}

/**
 * Calcula o resultado baseado nas regras de Duplo Green.
 * - Se "Não": resultado = payout - stake (= -perda)
 * - Se "Duplo": resultado = profit - perda, onde perda = stake - payout
 */
export function calcResult(
  stake: number,
  payout: number,
  doubleGreen: 'Duplo' | 'Não',
  profit: number
): number {
  const loss = stake - payout;
  if (doubleGreen === 'Não') {
    return -loss;
  }
  return profit - loss;
}

export interface DashboardStats {
  bankInitial: number;
  bankCurrent: number;
  netProfit: number;
  totalOperations: number;
  totalDoubles: number;
  totalNonDoubles: number;
  doubleGreenRate: number;
  totalStaked: number;
  roi: number;
  biggestWin: number;
  biggestLoss: number;
  avgDoubleProfit: number;
  avgStake: number;
}

export type PeriodFilter = 'all' | 'today' | 'week' | 'month';

/**
 * Filtra operações por período de tempo, com base na data de hoje (fuso local).
 * `all` retorna as operações sem filtrar (mesmo array de referência).
 */
export function filterByPeriod(
  operations: Operation[],
  period: PeriodFilter,
  now: Date = new Date()
): Operation[] {
  if (period === 'all') return operations;

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return operations.filter((o) => {
    if (period === 'today') return o.date === today;
    if (period === 'month') return o.date.slice(0, 7) === today.slice(0, 7);
    // week: últimos 7 dias
    const opTs = new Date(o.date + 'T00:00:00').getTime();
    const startTs = new Date(today + 'T00:00:00').getTime() - 6 * 24 * 60 * 60 * 1000;
    return opTs >= startTs && opTs <= new Date(today + 'T00:00:00').getTime();
  });
}

export function calcDashboardStats(operations: Operation[], bankInitial: number): DashboardStats {
  const totalOperations = operations.length;
  const totalDoubles = operations.filter((o) => o.doubleGreen === 'Duplo').length;
  const totalNonDoubles = operations.filter((o) => o.doubleGreen === 'Não').length;
  const doubleGreenRate = totalOperations > 0 ? (totalDoubles / totalOperations) * 100 : 0;
  const totalStaked = operations.reduce((sum, o) => sum + o.stake, 0);
  const netProfit = operations.reduce((sum, o) => sum + o.result, 0);
  const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;
  const biggestWin = operations.length > 0 ? Math.max(...operations.map((o) => o.result)) : 0;
  const biggestLoss = operations.length > 0 ? Math.min(...operations.map((o) => o.result)) : 0;
  const doubles = operations.filter((o) => o.doubleGreen === 'Duplo');
  const avgDoubleProfit = doubles.length > 0 ? doubles.reduce((s, o) => s + o.profit, 0) / doubles.length : 0;
  const avgStake = totalOperations > 0 ? totalStaked / totalOperations : 0;
  const bankCurrent = bankInitial + netProfit;

  return {
    bankInitial,
    bankCurrent,
    netProfit,
    totalOperations,
    totalDoubles,
    totalNonDoubles,
    doubleGreenRate,
    totalStaked,
    roi,
    biggestWin,
    biggestLoss,
    avgDoubleProfit,
    avgStake,
  };
}

/**
 * Perda média por R$ 1.000 apostados, em percentual.
 * A perda de cada operação é sempre contabilizada (duplo ou não):
 *   perda = stake - payout
 * Extras entram com seu valor bruto (negativo reduz a perda, positivo aumenta).
 */
export function calcAverageLossPct(operations: Operation[], extrasTotal: number): number {
  const totalStaked = operations.reduce((sum, o) => sum + o.stake, 0);
  if (totalStaked <= 0) return 0;
  const totalLoss = operations.reduce((sum, o) => sum + (o.stake - o.payout), 0);
  return ((totalLoss + extrasTotal) / totalStaked) * 100;
}

export function calcValueAtRisk(
  operations: Operation[],
  now: Date = new Date()
): { total: number; count: number; live: number; upcoming: number } {
  let total = 0;
  let count = 0;
  let live = 0;
  let upcoming = 0;

  for (const op of operations) {
    const h = op.time.length === 5 ? `${op.time}:00` : op.time;
    const start = new Date(`${op.date}T${h}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    if (now < end) {
      total += op.stake;
      count++;
      if (now >= start) {
        live++;
      } else {
        upcoming++;
      }
    }
  }

  return { total, count, live, upcoming };
}

export function getStreaks(operations: Operation[]): { doubles: number; nonDoubles: number } {
  const sorted = [...operations]
    .map((o) => ({ ...o, _seq: `${o.date} ${o.time}` }))
    .sort((a, b) => b._seq.localeCompare(a._seq));

  if (sorted.length === 0) return { doubles: 0, nonDoubles: 0 };

  const first = sorted[0].doubleGreen;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].doubleGreen === first) {
      run++;
    } else {
      break; // para na primeira quebra: só interessa a racha corrente
    }
  }

  return first === 'Duplo' ? { doubles: run, nonDoubles: 0 } : { doubles: 0, nonDoubles: run };
}

export function groupByPeriod(
  operations: Operation[],
  period: 'dia' | 'semana' | 'mes'
): { label: string; total: number; lucro: number; resultados: number[] }[] {
  const groups: Record<string, Operation[]> = {};

  for (const op of operations) {
    const date = new Date(op.date + 'T00:00:00');
    let key: string;
    if (period === 'dia') {
      key = op.date;
    } else if (period === 'semana') {
      const onejan = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      key = `${date.getFullYear()}-S${String(week).padStart(2, '0')}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(op);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, ops]) => ({
      label,
      total: ops.length,
      lucro: ops.reduce((s, o) => s + o.result, 0),
      resultados: ops.map((o) => o.result),
    }));
}
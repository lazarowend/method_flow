import { describe, it, expect } from 'vitest';
import type { Operation } from './types';
import {
  formatCurrency,
  formatCurrencySigned,
  formatPercent,
  formatDate,
  todayISO,
  nowTime,
  calcLoss,
  calcResult,
  filterByPeriod,
  calcDashboardStats,
  calcAverageLossPct,
  calcValueAtRisk,
  getStreaks,
  groupByPeriod,
} from './utils';

function op(partial: Partial<Operation>): Operation {
  return {
    id: '1',
    date: '2026-09-07',
    time: '15:30',
    competition: 'Brasil - Campeonato Brasileiro Série A',
    game: 'Flamengo x Palmeiras',
    stake: 100,
    payout: 25,
    doubleGreen: 'Duplo',
    profit: 75,
    result: 0,
    notes: null,
    fixtureId: null,
    league: null,
    createdAt: '2026-09-07T15:30:00.000Z',
    ...partial,
  };
}

describe('formatCurrency', () => {
  it('formata valores positivos em pt-BR com prefixo R$', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50');
  });
  it('prefixa sinal de menos para negativos', () => {
    expect(formatCurrency(-50)).toBe('-R$ 50,00');
  });
  it('usa 2 casas decimais mínimas', () => {
    expect(formatCurrency(7)).toBe('R$ 7,00');
  });
  it('trata zero como positivo', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });
});

describe('formatCurrencySigned', () => {
  it('exibe + para positivos', () => {
    expect(formatCurrencySigned(10)).toBe('+R$ 10,00');
  });
  it('exibe - para negativos', () => {
    expect(formatCurrencySigned(-10)).toBe('-R$ 10,00');
  });
});

describe('formatPercent / formatDate', () => {
  it('formata percentual com 1 casa', () => {
    expect(formatPercent(33.333)).toBe('33.3%');
  });
  it('converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDate('2026-09-07')).toBe('07/09/2026');
  });
});

describe('todayISO / nowTime', () => {
  it('retorna data ISO local no formato YYYY-MM-DD', () => {
    const iso = todayISO();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Math.abs(new Date().getDate() - Number(iso.slice(8, 10)))).toBeLessThanOrEqual(1);
  });
  it('retorna horário local no formato HH:MM', () => {
    expect(nowTime()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('calcLoss', () => {
  it('perda = stake - payout', () => {
    expect(calcLoss(100, 25)).toBe(75);
  });
});

describe('calcResult', () => {
  it('Nao: resultado = -perda (payout - stake)', () => {
    expect(calcResult(100, 25, 'Não', 0)).toBe(-75);
  });
  it('Duplo: resultado = profit - loss', () => {
    // loss = 100 - 25 = 75; profit=200 → 125
    expect(calcResult(100, 25, 'Duplo', 200)).toBe(125);
  });
  it('Duplo com profit menor que a perda dá positivo (green)', () => {
    expect(calcResult(100, 60, 'Duplo', 70)).toBe(30);
  });
});

describe('filterByPeriod', () => {
  const ops = [
    op({ date: '2026-09-01', id: 'a' }),
    op({ date: '2026-09-06', id: 'b' }),
    op({ date: '2026-09-08', id: 'c' }),
    op({ date: '2026-08-20', id: 'd' }),
  ];
  const now = new Date('2026-09-08T12:00:00');
  it('all retorna todas (mesmo array)', () => {
    const r = filterByPeriod(ops, 'all', now);
    expect(r).toHaveLength(4);
  });
  it('today retorna só o dia atual', () => {
    expect(filterByPeriod(ops, 'today', now).map((o) => o.id)).toEqual(['c']);
  });
  it('month retorna só os do mês atual', () => {
    expect(filterByPeriod(ops, 'month', now).map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });
  it('week retorna últimos 7 dias (08 - 6 dias = 02..08)', () => {
    // 01 está fora (antes de 02), 08/09/06 dentro, 20/08 fora
    expect(filterByPeriod(ops, 'week', now).map((o) => o.id)).toEqual(['b', 'c']);
  });
});

describe('calcDashboardStats', () => {
  const ops = [
    op({ id: 'a', doubleGreen: 'Duplo', stake: 100, payout: 25, profit: 200, result: 125 }),
    op({ id: 'b', doubleGreen: 'Duplo', stake: 100, payout: 40, profit: 90, result: 30 }),
    op({ id: 'c', doubleGreen: 'Não', stake: 50, payout: 0, profit: 0, result: -50 }),
  ];
  const stats = calcDashboardStats(ops, 1000);
  it('contabiliza operações', () => {
    expect(stats.totalOperations).toBe(3);
    expect(stats.totalDoubles).toBe(2);
    expect(stats.totalNonDoubles).toBe(1);
  });
  it('calcula taxa de duplos', () => {
    expect(stats.doubleGreenRate).toBeCloseTo(66.67, 1);
  });
  it('soma stake e resultado líquido', () => {
    expect(stats.totalStaked).toBe(250);
    expect(stats.netProfit).toBe(105);
  });
  it('calcula ROI e banca atual', () => {
    expect(stats.roi).toBeCloseTo(42, 1);
    expect(stats.bankCurrent).toBe(1105);
  });
  it('maior ganho/perda', () => {
    expect(stats.biggestWin).toBe(125);
    expect(stats.biggestLoss).toBe(-50);
  });
  it('média de lucro dos duplos e stake', () => {
    expect(stats.avgDoubleProfit).toBeCloseTo(145, 1);
    expect(stats.avgStake).toBeCloseTo(83.33, 1);
  });
  it('array vazio: vazios seguros', () => {
    const empty = calcDashboardStats([], 100);
    expect(empty.totalOperations).toBe(0);
    expect(empty.bankCurrent).toBe(100);
    expect(empty.roi).toBe(0);
    expect(empty.biggestWin).toBe(0);
  });
});

describe('calcAverageLossPct', () => {
  it('perda média por R$1k de stake, somando extras', () => {
    // stakes 100+100+50=250; perdas (100-25)+(100-40)+(50-0)=185; extras +15 → 200
    const ops = [
      op({ stake: 100, payout: 25 }), // loss 75
      op({ stake: 100, payout: 40 }), // loss 60
      op({ stake: 50, payout: 0 }), // loss 50
    ];
    expect(calcAverageLossPct(ops, 15)).toBeCloseTo(80, 1);
  });
  it('retorna 0 sem stake', () => {
    expect(calcAverageLossPct([], 0)).toBe(0);
  });
});

describe('calcValueAtRisk', () => {
  const now = new Date('2026-09-08T12:00:00');
  it('classifica live (em andamento) e upcoming (agendado)', () => {
    const ops = [
      op({ date: '2026-09-08', time: '11:00', stake: 100 }), // iniciou, ainda < +2h → live
      op({ date: '2026-09-08', time: '15:00', stake: 60 }), // futuro → upcoming
      op({ date: '2026-09-08', time: '08:00', stake: 200 }), // passou +2h → fora
    ];
    const r = calcValueAtRisk(ops, now);
    expect(r.total).toBe(160);
    expect(r.count).toBe(2);
    expect(r.live).toBe(1);
    expect(r.upcoming).toBe(1);
  });
});

describe('getStreaks', () => {
  it('conta a racha corrente mais recente (para na primeira quebra)', () => {
    const ops = [
      op({ date: '2026-09-01', time: '10:00', doubleGreen: 'Não' }),
      op({ date: '2026-09-02', time: '10:00', doubleGreen: 'Duplo' }),
      op({ date: '2026-09-03', time: '10:00', doubleGreen: 'Duplo' }),
      op({ date: '2026-09-04', time: '10:00', doubleGreen: 'Duplo' }),
    ];
    // mais recente (04/09) é Duplo → racha de 3 duplos; o Não de 01/09 não quebra a corrente atual
    const r = getStreaks(ops);
    expect(r.doubles).toBe(3);
    expect(r.nonDoubles).toBe(0);
  });
  it('racha de não-duplos quando o mais recente é Não', () => {
    const ops = [
      op({ date: '2026-09-01', time: '10:00', doubleGreen: 'Duplo' }),
      op({ date: '2026-09-02', time: '10:00', doubleGreen: 'Não' }),
      op({ date: '2026-09-03', time: '10:00', doubleGreen: 'Não' }),
    ];
    const r = getStreaks(ops);
    expect(r.doubles).toBe(0);
    expect(r.nonDoubles).toBe(2);
  });
  it('lista vazia', () => {
    expect(getStreaks([])).toEqual({ doubles: 0, nonDoubles: 0 });
  });
});

describe('groupByPeriod', () => {
  const ops = [
    op({ date: '2026-09-01', result: 50 }),
    op({ date: '2026-09-02', result: -10 }),
    op({ date: '2026-08-20', result: 100 }),
  ];
  it('agrupa por giorno (dia)', () => {
    const groups = groupByPeriod(ops, 'dia');
    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe('2026-08-20');
    expect(groups[0].total).toBe(1);
  });
  it('acumula lucro por dia', () => {
    const groups = groupByPeriod(ops, 'dia');
    const day = groups.find((g) => g.label === '2026-09-02');
    expect(day?.lucro).toBe(-10);
    expect(day?.resultados).toEqual([-10]);
  });
});
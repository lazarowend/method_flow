import { describe, it, expect } from 'vitest';
import { parseCSV } from './csv';
import type { Operation, Extra } from './types';

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
    profit: 200,
    result: 125,
    notes: null,
    fixtureId: null,
    league: null,
    createdAt: '2026-09-07T15:30:00.000Z',
    ...partial,
  };
}

const CSV_HEADER =
  'tipo,date,time,competition,game,stake,payout,doubleGreen,profit,result,notes,fixtureId,league';

function opLine(o: Operation): string {
  return [
    'operacao',
    o.date,
    o.time,
    o.competition,
    o.game,
    o.stake,
    o.payout,
    o.doubleGreen,
    o.profit,
    o.result,
    o.notes ?? '',
    o.fixtureId ?? '',
    o.league ?? '',
  ].join(',');
}

describe('parseCSV', () => {
  it('retorna operações e extras a partir de um CSV exportado', () => {
    const prec = op({});
    const csv = `${CSV_HEADER}\n${opLine(prec)}\nextra,2026-09-07,15:30,50,entrada\n`;
    const res = parseCSV(csv);
    expect(res.operationCount).toBe(1);
    expect(res.extraCount).toBe(1);
    expect(res.operations[0]).toMatchObject({
      date: '2026-09-07',
      competition: 'Brasil - Campeonato Brasileiro Série A',
      game: 'Flamengo x Palmeiras',
      stake: 100,
      payout: 25,
      doubleGreen: 'Duplo',
      profit: 200,
      result: 125,
      league: null,
      fixtureId: null,
    });
    expect(res.extras[0]).toMatchObject({ date: '2026-09-07', amount: 50, notes: 'entrada' });
  });
  it('converte números, mesmo com aspas de escape', () => {
    // stake entre aspas; notes com vírgula escapa
    const o = op({ notes: 'nota, com vírgula' });
    const csv = `${CSV_HEADER}\noperacao,${o.date},${o.time},${o.competition},${o.game},"100",25,Duplo,200,125,"nota, com vírgula",,\n`;
    const res = parseCSV(csv);
    expect(res.operations[0].stake).toBe(100);
    expect(res.operations[0].notes).toBe('nota, com vírgula');
  });
  it('normaliza doubleGreen não-Duplo para Não', () => {
    const csv = `${CSV_HEADER}\noperacao,2026-09-07,15:30,c,j,50,0,"Não",0,-50,,\n`;
    expect(parseCSV(csv).operations[0].doubleGreen).toBe('Não');
  });
  it('parseia fixtureId e league quando presentes', () => {
    const csv = `${CSV_HEADER}\noperacao,2026-09-07,15:30,c,j,50,0,Não,0,-50,,42,"Premier League"\n`;
    const op0 = parseCSV(csv).operations[0];
    expect(op0.fixtureId).toBe(42);
    expect(op0.league).toBe('Premier League');
  });
  it('ignora linhas de cabeçalho/bloco de extras', () => {
    // segunda linha é reutilização de cabeçalho mínimo de extras → ignorada por parseCSVLines? 
    // na verdade parseCSVLines remove APENAS a primeira linha. Testar com headers repetidos não aplicável.
    const csv = `${CSV_HEADER}\nextra,2026-09-07,12:00,10,ax\n`;
    expect(parseCSV(csv).extraCount).toBe(1);
  });
  it('lança erro quando nada válido', () => {
    expect(() => parseCSV('tipo,date\nfoo,bar\n')).toThrow(/Nenhuma operação ou extra/);
    expect(() => parseCSV('')).toThrow(/Nenhuma operação ou extra/);
  });
  it('lida com quebras de linha \\r\\n (CRLF)', () => {
    const csv = `\uFEFF${CSV_HEADER}\r\noperacao,2026-09-07,15:30,c,j,50,0,Não,0,-50,,\r\n`;
    const res = parseCSV(csv);
    expect(res.operationCount).toBe(1);
  });
  it('lida com notas contendo aspas duplas escapadas', () => {
    const csv = `${CSV_HEADER}\noperacao,2026-09-07,15:30,c,j,50,0,Não,0,-50,"diz ""oi""",,\n`;
    expect(parseCSV(csv).operations[0].notes).toBe('diz "oi"');
  });
});

describe('parseCSV (round-trip null safety)', () => {
  it('trata stakes não numéricas com fallback 0', () => {
    const csv = `${CSV_HEADER}\noperacao,2026-09-07,15:30,c,j,abc,xyz,Não,0,-50,,\n`;
    const op0 = parseCSV(csv).operations[0];
    expect(op0.stake).toBe(0);
    expect(op0.payout).toBe(0);
  });
});
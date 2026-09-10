import type { Operation, OperationInput, Extra, ExtraInput } from './types';

/**
 * Utilitários de exportação/importação em CSV.
 * Formato unificado por linha, com coluna `tipo` ("operacao" | "extra"):
 * permite restaurar o histórico completo (operações + extras) depois.
 */

export interface ParsedImport {
  operations: OperationInput[];
  extras: ExtraInput[];
  operationCount: number;
  extraCount: number;
}

function esc(v: string | number | null | undefined): string {
  if (v == null || v === '') return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function operationHeaders(): string {
  return 'tipo,date,time,competition,game,stake,payout,doubleGreen,profit,result,notes,fixtureId,league';
}

function operationRow(o: Operation): string {
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
    esc(o.notes),
    o.fixtureId ?? '',
    esc(o.league),
  ]
    .map((v) => esc(v))
    .join(',');
}

function extraHeaders(): string {
  return 'tipo,date,time,amount,notes';
}

function extraRow(e: Extra): string {
  return ['extra', e.date, e.time, e.amount, esc(e.notes)].map((v) => esc(v)).join(',');
}

/**
 * Gera o CSV completo (operações + extras) e dispara o download no navegador.
 */
export function exportToCSV(operations: Operation[], extras: Extra[]): void {
  const lines: string[] = [operationHeaders()];
  for (const o of operations) lines.push(operationRow(o));
  // Bloco de extras reusa cabeçalho mínimo (colunas desalinhadas ficam no fim)
  lines.push(extraHeaders());
  for (const e of extras) lines.push(extraRow(e));

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `duplo-green-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Faz o parse de um CSV exportado por exportToCSV, separando operações e extras.
 * Lança Error com mensagem amigável se nenhuma linha válida for encontrada.
 */
export function parseCSV(text: string): ParsedImport {
  const operations: OperationInput[] = [];
  const extras: ExtraInput[] = [];

  const rows = parseCSVLines(text);

  for (const row of rows) {
    const tipo = (row[0] ?? '').trim();
    if (tipo === 'operacao') {
      const strike = Number(row[5]);
      const pay = Number(row[6]);
      const doubleV = (row[7] ?? 'Não').trim();
      operations.push({
        date: (row[1] ?? '').trim(),
        time: (row[2] ?? '').trim(),
        competition: (row[3] ?? '').trim(),
        game: (row[4] ?? '').trim(),
        stake: Number.isFinite(strike) ? strike : 0,
        payout: Number.isFinite(pay) ? pay : 0,
        doubleGreen: doubleV === 'Duplo' ? 'Duplo' : 'Não',
        profit: Number(row[8]) || 0,
        result: Number(row[9]) || 0,
        notes: (row[10] ?? '').trim() || null,
        fixtureId: row[11] ? Number(row[11]) || null : null,
        league: (row[12] ?? '').trim() || null,
      });
    } else if (tipo === 'extra') {
      extras.push({
        date: (row[1] ?? '').trim(),
        time: (row[2] ?? '').trim(),
        amount: Number(row[3]) || 0,
        notes: (row[4] ?? '').trim() || null,
      });
    }
  }

  if (operations.length === 0 && extras.length === 0) {
    throw new Error('Nenhuma operação ou extra válido encontrado no arquivo.');
  }
  return { operations, extras, operationCount: operations.length, extraCount: extras.length };
}

/**
 * Parser CSV simples e robusto (suporta aspas, vírgulas e quebras dentro de campos).
 */
function parseCSVLines(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      // ignora \r da quebra de linha
      if (row.length === 1 && row[0] === '') {
        row = [];
      } else if (row.some((c) => c !== '')) {
        result.push(row);
      }
      row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  // última linha
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c !== '')) result.push(row);
  }

  // remove linha de cabeçalho (a primeira)
  if (result.length > 0) return result.slice(1);
  return [];
}
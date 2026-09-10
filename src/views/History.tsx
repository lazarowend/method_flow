import { useState, useMemo, useRef } from 'react';
import { Search, Pencil, Trash2, Calendar, X, Download, Upload } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { OperationForm } from './OperationForm';
import { ExtraForm } from './ExtraForm';
import { formatCurrency, formatDate, calcLoss } from '@/lib/utils';
import { exportToCSV, parseCSV } from '@/lib/csv';
import type { Operation, OperationInput, Extra, ExtraInput } from '@/lib/types';

interface HistoryProps {
  operations: Operation[];
  extras: Extra[];
  onEdit: (id: string, input: OperationInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditExtra: (id: string, input: ExtraInput) => Promise<void>;
  onDeleteExtra: (id: string) => Promise<void>;
  onImportOperations: (inputs: OperationInput[]) => Promise<number>;
  onImportExtras: (inputs: ExtraInput[]) => Promise<number>;
}

type UnifiedItem =
  | { tipo: 'operacao'; id: string; date: string; time: string; operation: Operation }
  | { tipo: 'extra'; id: string; date: string; time: string; extra: Extra };

export function History({ operations, extras, onEdit, onDelete, onEditExtra, onDeleteExtra, onImportOperations, onImportExtras }: HistoryProps) {
  const [search, setSearch] = useState('');
  const [doubleFilter, setDoubleFilter] = useState<'all' | 'Duplo' | 'Não' | 'extra'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [deletingOp, setDeletingOp] = useState<Operation | null>(null);
  const [deletingExtra, setDeletingExtra] = useState<Extra | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Import CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = () => {
    exportToCSV(operations, extras);
  };

  const handleImportFile = async (file: File) => {
    setImportMsg(null);
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      await Promise.all([
        onImportOperations(parsed.operations),
        onImportExtras(parsed.extras),
      ]);
      setImportMsg(`Importado com sucesso: ${parsed.operationCount} operação(ões) e ${parsed.extraCount} extra(s).`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao importar o arquivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const unified: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [
      ...operations.map((o) => ({
        tipo: 'operacao' as const,
        id: o.id,
        date: o.date,
        time: o.time,
        operation: o,
      })),
      ...extras.map((e) => ({
        tipo: 'extra' as const,
        id: e.id,
        date: e.date,
        time: e.time,
        extra: e,
      })),
    ];
    return items.sort((a, b) => {
      const da = `${a.date} ${a.time}`;
      const db = `${b.date} ${b.time}`;
      return db.localeCompare(da);
    });
  }, [operations, extras]);

  const filtered = useMemo(() => {
    return unified.filter((item) => {
      if (doubleFilter !== 'all' && doubleFilter !== 'extra' && item.tipo === 'operacao') {
        if (item.operation.doubleGreen !== doubleFilter) return false;
      }
      if (doubleFilter === 'extra' && item.tipo !== 'extra') return false;
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      if (search) {
        const q = search.toLowerCase();
        if (item.tipo === 'operacao') {
          return (
            item.operation.competition.toLowerCase().includes(q) ||
            item.operation.game.toLowerCase().includes(q) ||
            (item.operation.notes?.toLowerCase().includes(q) ?? false)
          );
        } else {
          return (item.extra.notes?.toLowerCase().includes(q) ?? false);
        }
      }
      return true;
    });
  }, [unified, search, doubleFilter, startDate, endDate]);

  const handleEditOp = async (input: OperationInput) => {
    if (!editingOp) return;
    setSubmitting(true);
    try {
      await onEdit(editingOp.id, input);
      setEditingOp(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExtra = async (input: ExtraInput) => {
    if (!editingExtra) return;
    setSubmitting(true);
    try {
      await onEditExtra(editingExtra.id, input);
      setEditingExtra(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOp = async () => {
    if (!deletingOp) return;
    setSubmitting(true);
    try {
      await onDelete(deletingOp.id);
      setDeletingOp(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExtra = async () => {
    if (!deletingExtra) return;
    setSubmitting(true);
    try {
      await onDeleteExtra(deletingExtra.id);
      setDeletingExtra(null);
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDoubleFilter('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-5">
      {/* Exportar / Importar */}
      {!editingOp && !editingExtra && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 tracking-tight">Histórico</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exporte um backup CSV ou restaure dados de um arquivo anterior.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button variant="secondary" onClick={handleExport}>
                <Download size={16} />
                Exportar CSV
              </Button>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                Importar CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                }}
              />
            </div>
          </div>
          {importMsg && (
            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-emerald-400 text-sm">
              {importMsg}
            </div>
          )}
          {importError && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm">
              {importError}
            </div>
          )}
        </Card>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por campeonato, jogo, observação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[color:var(--input-bg)] border border-[color:var(--input-border)] rounded-xl pl-10 pr-4 py-2.5 text-[color:var(--input-text)] placeholder-[color:var(--input-placeholder)] shadow-sm focus:outline-none focus:border-[color:var(--input-focus-border)] focus:ring-2 focus:ring-[color:var(--input-focus-ring)] transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <select
              value={doubleFilter}
              onChange={(e) => setDoubleFilter(e.target.value as 'all' | 'Duplo' | 'Não' | 'extra')}
              className="bg-[color:var(--input-bg)] border border-[color:var(--input-border)] rounded-xl px-3.5 py-2.5 text-[color:var(--input-text)] shadow-sm focus:outline-none focus:border-[color:var(--input-focus-border)] focus:ring-2 focus:ring-[color:var(--input-focus-ring)] transition-all w-full sm:w-auto cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="Duplo">Apenas Duplo</option>
              <option value="Não">Apenas Não</option>
              <option value="extra">Apenas Extras</option>
            </select>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-500 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[color:var(--input-bg)] border border-[color:var(--input-border)] rounded-xl px-3 py-2.5 text-[color:var(--input-text)] shadow-sm focus:outline-none focus:border-[color:var(--input-focus-border)] focus:ring-2 focus:ring-[color:var(--input-focus-ring)] transition-all w-full"
                />
              </div>
              <span className="text-slate-500 hidden sm:inline">até</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-500 shrink-0 sm:hidden" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[color:var(--input-bg)] border border-[color:var(--input-border)] rounded-xl px-3 py-2.5 text-[color:var(--input-text)] shadow-sm focus:outline-none focus:border-[color:var(--input-focus-border)] focus:ring-2 focus:ring-[color:var(--input-focus-ring)] transition-all w-full"
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 w-full sm:w-auto">
              <X size={15} />
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/70 border-b border-slate-700 text-slate-400 uppercase text-xs tracking-wider">
                <th className="px-4 py-3.5 text-left font-semibold">Data</th>
                <th className="px-4 py-3.5 text-left font-semibold">Jogo / Descrição</th>
                <th className="px-4 py-3.5 text-right font-semibold">Apostado</th>
                <th className="px-4 py-3.5 text-right font-semibold">Retorno</th>
                <th className="px-4 py-3.5 text-right font-semibold">Perda</th>
                <th className="px-4 py-3.5 text-center font-semibold">Tipo</th>
                <th className="px-4 py-3.5 text-right font-semibold">Lucro</th>
                <th className="px-4 py-3.5 text-right font-semibold">Resultado</th>
                <th className="px-4 py-3.5 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  if (item.tipo === 'operacao') {
                    const op = item.operation;
                    const loss = calcLoss(op.stake, op.payout);
                    return (
                      <tr key={item.id} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {formatDate(op.date)}
                          <span className="text-slate-500 text-xs ml-1">{op.time.slice(0, 5)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200">{op.game}</div>
                          <div className="text-slate-500 text-xs">{op.competition}</div>
                          {op.notes && (
                            <div className="text-slate-600 text-xs mt-0.5">{op.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">{formatCurrency(op.stake)}</td>
                        <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">{formatCurrency(op.payout)}</td>
                        <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">{formatCurrency(loss)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${op.doubleGreen === 'Duplo' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'}`}>
                            {op.doubleGreen === 'Duplo' ? 'Duplo' : 'Não'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {op.profit > 0 ? <span className="text-emerald-400">{formatCurrency(op.profit)}</span> : <span className="text-slate-500">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${op.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {op.result >= 0 ? '+' : ''}{formatCurrency(op.result)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingOp(op)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/40 transition-all"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingOp(op)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/40 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    const ex = item.extra;
                    return (
                      <tr key={item.id} className="border-b border-slate-700/40 hover:bg-amber-900/10 transition-colors">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {formatDate(ex.date)}
                          <span className="text-slate-500 text-xs ml-1">{ex.time.slice(0, 5)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-amber-300/80 text-xs font-semibold uppercase tracking-wider">Extra</div>
                          {ex.notes && (
                            <div className="text-slate-400 text-sm mt-0.5">{ex.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">—</td>
                        <td className="px-4 py-3 text-right text-slate-600">—</td>
                        <td className="px-4 py-3 text-right text-slate-600">—</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            Extra
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">—</td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${ex.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ex.amount >= 0 ? '+' : ''}{formatCurrency(ex.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingExtra(ex)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/40 transition-all"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingExtra(ex)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/40 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
            {filtered.length} registro(s) exibido(s) de {unified.length} total.
          </div>
        )}
      </Card>

      {/* Modal editar operação */}
      <Modal open={!!editingOp} onClose={() => setEditingOp(null)} title="Editar Operação">
        {editingOp && (
          <OperationForm
            editing={editingOp}
            onSubmit={handleEditOp}
            onCancel={() => setEditingOp(null)}
          />
        )}
      </Modal>

      {/* Modal editar extra */}
      <Modal open={!!editingExtra} onClose={() => setEditingExtra(null)} title="Editar Extra">
        {editingExtra && (
          <ExtraForm
            editing={editingExtra}
            onSubmit={handleEditExtra}
            onCancel={() => setEditingExtra(null)}
          />
        )}
      </Modal>

      {/* Modal excluir operação */}
      <Modal open={!!deletingOp} onClose={() => setDeletingOp(null)} title="Excluir Operação" maxWidth="max-w-md">
        {deletingOp && (
          <div className="space-y-4">
            <p className="text-slate-300">
              Tem certeza que deseja excluir a operação <span className="font-semibold text-slate-100">{deletingOp.game}</span> de {formatDate(deletingOp.date)}?
            </p>
            <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setDeletingOp(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteOp} disabled={submitting}>
                {submitting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal excluir extra */}
      <Modal open={!!deletingExtra} onClose={() => setDeletingExtra(null)} title="Excluir Extra" maxWidth="max-w-md">
        {deletingExtra && (
          <div className="space-y-4">
            <p className="text-slate-300">
              Tem certeza que deseja excluir o registro extra de {formatDate(deletingExtra.date)}?
            </p>
            <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setDeletingExtra(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteExtra} disabled={submitting}>
                {submitting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
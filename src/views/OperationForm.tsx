import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Input, Select, Textarea } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { calcLoss, calcResult, formatCurrency, todayISO, nowTime } from '@/lib/utils';
import { COMPETITIONS } from '@/lib/competitions';
import { fetchMatches, type Fixture, type MatchSearchResult } from '@/lib/apiFootball';
import type { Operation, OperationInput } from '@/lib/types';

const COMPETITION_OTHER = '__other__';

function isStandardCompetition(value: string): boolean {
  return (COMPETITIONS as readonly string[]).includes(value);
}

interface OperationFormProps {
  onSubmit: (input: OperationInput) => Promise<void>;
  onCancel: () => void;
  onOpenExtras?: () => void;
  editing?: Operation | null;
}

export function OperationForm({ onSubmit, onCancel, onOpenExtras, editing }: OperationFormProps) {
  const [date, setDate] = useState(editing?.date || todayISO());
  const [time, setTime] = useState(editing?.time || nowTime());
  const isEditingOther = editing?.competition ? !isStandardCompetition(editing.competition) : false;
  const [competitionSelect, setCompetitionSelect] = useState(
    editing?.competition && isStandardCompetition(editing.competition)
      ? editing.competition
      : isEditingOther ? COMPETITION_OTHER : ''
  );
  const [competitionOther, setCompetitionOther] = useState(
    isEditingOther ? editing?.competition || '' : ''
  );

  const finalCompetition =
    competitionSelect === COMPETITION_OTHER ? competitionOther.trim() : competitionSelect;
  const [game, setGame] = useState(editing?.game || '');
  const [stake, setStake] = useState(editing?.stake?.toString() || '');
  const [payout, setPayout] = useState(editing?.payout?.toString() || '');
  const [doubleGreen, setDoubleGreen] = useState<'Duplo' | 'Não'>(editing?.doubleGreen || 'Não');
  const [profit, setProfit] = useState(editing?.profit?.toString() || '0');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca de jogos via providers (ESPN principal, SportAPI7 fallback)
  const [matches, setMatches] = useState<Fixture[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('');
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matchesSource, setMatchesSource] = useState<string | null>(null);
  // Modo manual: permite digitar o jogo quando a busca falha ou não retorna nada.
  const [manualMode, setManualMode] = useState(false);
  const [manualGame, setManualGame] = useState(editing?.game || '');

  const stakeValue = parseFloat(stake) || 0;
  const payoutValue = parseFloat(payout) || 0;
  const profitValue = parseFloat(profit) || 0;
  const loss = calcLoss(stakeValue, payoutValue);
  const result = calcResult(stakeValue, payoutValue, doubleGreen, profitValue);

  // Reseta o lucro se não for duplo
  useEffect(() => {
    if (doubleGreen === 'Não') {
      setProfit('0');
    }
  }, [doubleGreen]);

  useEffect(() => {
    let active = true;
    const standardCompetition = competitionSelect && competitionSelect !== COMPETITION_OTHER;

    if (!date || !standardCompetition) {
      setMatches([]);
      setMatchesError(null);
      return;
    }

    setLoadingMatches(true);
    setMatchesError(null);
    setMatchesSource(null);
    fetchMatches(competitionSelect, date)
      .then((res: MatchSearchResult) => {
        if (!active) return;
        setMatches(res.matches);
        if (res.matches.length > 0) {
          setMatchesSource(res.source);
          setManualMode(false);
        } else if (res.status === 'no-key') {
          setMatchesError('Nenhuma chave de API configurada. Digite o jogo manualmente abaixo.');
          setManualMode(true);
        } else {
          setMatchesError('Nenhum jogo encontrado. Você pode digitar manualmente abaixo.');
          setManualMode(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setMatches([]);
        setMatchesError('Não foi possível buscar os jogos. Digite manualmente abaixo.');
        setManualMode(true);
      })
      .finally(() => {
        if (active) setLoadingMatches(false);
      });

    return () => {
      active = false;
    };
  }, [date, competitionSelect]);

  const handleSelectFixture = useCallback(
    (id: string) => {
      setSelectedFixtureId(id);
      const fix = matches.find((m) => String(m.id) === id);
      if (fix) {
        setSelectedFixture(fix);
        setGame(fix.game);
        if (fix.time) {
          setTime(fix.time);
        }
      } else {
        setSelectedFixture(null);
      }
    },
    [matches],
  );

  // Pré-seleciona o jogo salvo ao editar (via fixtureId)
  useEffect(() => {
    if (editing?.fixtureId != null && matches.length > 0) {
      const match = matches.find((m) => String(m.id) === String(editing.fixtureId));
      if (match) {
        setSelectedFixtureId(String(match.id));
        setSelectedFixture(match);
      }
    }
  }, [editing, matches]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!finalCompetition || !game.trim()) {
      setError('Preencha campeonato e jogo.');
      return;
    }
    if (stakeValue <= 0 || payoutValue < 0) {
      setError('Valor apostado deve ser maior que zero.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        time,
        competition: finalCompetition,
        game: game.trim(),
        stake: stakeValue,
        payout: payoutValue,
        doubleGreen,
        profit: doubleGreen === 'Duplo' ? profitValue : 0,
        result,
        notes: notes.trim() || null,
        fixtureId: selectedFixture ? Number(selectedFixture.id) : null,
        league: selectedFixture?.league ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar operação.');
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

      {/* Modo automático = camp. padrão com API; modo manual = digitação livre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Data"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        {(() => {
          const isAuto = !manualMode && Boolean(competitionSelect) && competitionSelect !== COMPETITION_OTHER;
          const hasFixture = selectedFixtureId !== '';
          return (
            <Input
              label="Horário do Jogo"
              type="time"
              value={isAuto && !hasFixture ? '' : time}
              onChange={(e) => setTime(e.target.value)}
              disabled={isAuto}
              readOnly={isAuto}
              placeholder={isAuto ? 'Selecione o jogo acima' : undefined}
              title={
                isAuto
                  ? hasFixture
                    ? 'Horário definido automaticamente pelo jogo selecionado'
                    : 'Selecione um jogo acima para preencher o horário'
                  : undefined
              }
            />
          );
        })()}
      </div>

      <div>
        <Select
          label="Campeonato"
          value={competitionSelect}
          onChange={(e) => {
            setCompetitionSelect(e.target.value);
            setSelectedFixtureId('');
            setGame('');
            setManualMode(false);
            setManualGame('');
          }}
        >
          <option value="">Selecione um campeonato...</option>
          {COMPETITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value={COMPETITION_OTHER}>Outros</option>
        </Select>
      </div>

      {competitionSelect === COMPETITION_OTHER ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome do campeonato"
            value={competitionOther}
            onChange={(e) => setCompetitionOther(e.target.value)}
            placeholder="Digite o nome do campeonato"
            required
          />
          <Input
            label="Jogo"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="Ex: Time A x Time B"
            required
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-300">Jogo</label>
            {!loadingMatches && date && competitionSelect && (
              <button
                type="button"
                onClick={() => {
                  setManualMode(!manualMode);
                  if (!manualMode) {
                    setSelectedFixtureId('');
                    setSelectedFixture(null);
                    setGame(manualGame.trim());
                  }
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {manualMode ? 'Usar seleção automática' : 'Digitar manualmente'}
              </button>
            )}
          </div>

          {manualMode ? (
            <Input
              label=""
              value={manualGame}
              onChange={(e) => {
                setManualGame(e.target.value);
                setGame(e.target.value);
              }}
              placeholder="Ex: Time A x Time B"
              required
            />
          ) : (
            <select
              value={selectedFixtureId}
              onChange={(e) => handleSelectFixture(e.target.value)}
              disabled={loadingMatches || !date || !competitionSelect}
              className={`w-full bg-[color:var(--input-bg)] border border-[color:var(--input-border)] rounded-xl px-3.5 py-2.5 text-[color:var(--input-text)] placeholder-[color:var(--input-placeholder)] shadow-sm focus:outline-none focus:border-[color:var(--input-focus-border)] focus:ring-2 focus:ring-[color:var(--input-focus-ring)] transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <option value="">
                {loadingMatches
                  ? 'Buscando jogos...'
                  : !date || !competitionSelect
                  ? 'Selecione data e campeonato'
                  : 'Selecione um jogo...'}
              </option>
              {matches.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.game}
                  {m.time ? ` (${m.time})` : ''}
                </option>
              ))}
            </select>
          )}

          {matchesError && !manualMode && (
            <p className="text-xs text-amber-400 mt-1.5">{matchesError}</p>
          )}
          {matches.length > 0 && !matchesError && !manualMode && (
            <p className="text-xs text-slate-500 mt-1.5">
              {matches.length} jogo(s) encontrado(s) via {matchesSource ?? 'API'}. O horário é preenchido automaticamente.
            </p>
          )}
          {manualMode && (
            <p className="text-xs text-slate-500 mt-1.5">
              Preencha o jogo manualmente. Horário não será preenchido automaticamente.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Valor Apostado (R$)"
          type="number"
          step="0.01"
          min="0"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="0,00"
          required
        />
        <Input
          label="Retorno (R$)"
          type="number"
          step="0.01"
          min="0"
          value={payout}
          onChange={(e) => setPayout(e.target.value)}
          placeholder="0,00"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Duplo Green"
          value={doubleGreen}
          onChange={(e) => setDoubleGreen(e.target.value as 'Duplo' | 'Não')}
        >
          <option value="Não">Não</option>
          <option value="Duplo">Duplo</option>
        </Select>
        <Input
          label="Lucro Duplo Green (R$)"
          type="number"
          step="0.01"
          min="0"
          value={profit}
          onChange={(e) => setProfit(e.target.value)}
          disabled={doubleGreen === 'Não'}
          placeholder={doubleGreen === 'Não' ? 'R$ 0,00 (apenas para Duplo)' : '0,00'}
        />
      </div>

      <Textarea
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas adicionais sobre a operação..."
      />

      {/* Resumo financeiro */}
      <div className="bg-slate-800/80 border border-slate-600/50 rounded-xl p-5 space-y-3 shadow-inner">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Resumo Financeiro</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Perda padrão:</span>
            <p className={`font-bold ${loss >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
              {formatCurrency(loss)} {stakeValue > 0 && payoutValue > 0 ? `(${((loss / stakeValue) * 100).toFixed(1)}%)` : ''}
            </p>
          </div>
          <div>
            <span className="text-slate-400">{doubleGreen === 'Duplo' ? 'Lucro Duplo Green:' : 'Lucro:'}</span>
            <p className={`font-bold ${profitValue > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
              {formatCurrency(doubleGreen === 'Duplo' ? profitValue : 0)}
            </p>
          </div>
          {doubleGreen === 'Duplo' && loss > 0 && (
            <div className="col-span-2">
              <span className="text-slate-400">Lucro líquido (Lucro - Perda):</span>
              <p className={`font-bold ${profitValue - loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(profitValue - loss)}
              </p>
            </div>
          )}
          <div className="col-span-2 pt-3 border-t border-slate-700/50">
            <span className="text-slate-400">Resultado:</span>
            <p className={`text-xl font-bold ${result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result >= 0 ? '+' : ''}{formatCurrency(result)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        {onOpenExtras && !editing && (
          <Button type="button" variant="ghost" onClick={onOpenExtras}>
            Registrar Extras
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : editing ? 'Atualizar' : 'Registrar Operação'}
        </Button>
      </div>
    </form>
  );
}
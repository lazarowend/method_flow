import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OperationForm } from './OperationForm';
import { fetchMatches } from '@/lib/apiFootball';

const COMP = 'Brasil - Campeonato Brasileiro Série A';
const FIXTURE = {
  id: 1,
  game: 'Flamengo x Palmeiras',
  time: '20:00',
  league: 'Campeonato Brasileiro Série A',
};

vi.mock('@/lib/apiFootball', () => ({ fetchMatches: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchMatches).mockResolvedValue({ status: 'ok', matches: [FIXTURE], source: 'ESPN' });
});

function timeInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="time"]') as HTMLInputElement;
}

describe('OperationForm — horário do jogo', () => {
  it('inicialmente o horário está liberado (editável)', () => {
    const { container } = render(<OperationForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(timeInput(container).disabled).toBe(false);
    expect(screen.getByText('Horário do Jogo')).toBeInTheDocument();
  });

  it('trava o horário ao selecionar campeonato padrão e o preenche ao escolher o jogo', async () => {
    const { container } = render(<OperationForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const compSel = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(compSel, { target: { value: COMP } });

    // espera a busca trazer o jogo → fica em modo automático
    expect(await screen.findByText('Flamengo x Palmeiras (20:00)')).toBeInTheDocument();

    // campeonato padrão selecionado + sem jogo → horário desabilitado e vazio
    const t = timeInput(container);
    expect(t.disabled).toBe(true);
    expect(t.value).toBe('');

    // escolhe o jogo → horário preenchido automaticamente, ainda travado
    const gameSel = container.querySelectorAll('select')[1] as HTMLSelectElement;
    fireEvent.change(gameSel, { target: { value: '1' } });
    expect(timeInput(container).value).toBe('20:00');
    expect(timeInput(container).disabled).toBe(true);
  });

  it('libera o horário no modo manual', async () => {
    const { container } = render(<OperationForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const compSel = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(compSel, { target: { value: COMP } });
    await screen.findByText('Flamengo x Palmeiras (20:00)');
    expect(timeInput(container).disabled).toBe(true);

    fireEvent.click(screen.getByText('Digitar manualmente'));
    expect(timeInput(container).disabled).toBe(false);
    // e ainda permite voltar pra automático
    fireEvent.click(screen.getByText('Usar seleção automática'));
    expect(timeInput(container).disabled).toBe(true);
  });

  it('envia horário do jogo e fixtureId ao salvar em modo automático', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<OperationForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const compSel = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(compSel, { target: { value: COMP } });
    await screen.findByText('Flamengo x Palmeiras (20:00)');
    fireEvent.change(container.querySelectorAll('select')[1] as HTMLSelectElement, {
      target: { value: '1' },
    });
    // stake/payout + duplo/profit
    const nums = container.querySelectorAll('input[type="number"]');
    fireEvent.change(nums[0], { target: { value: '100' } });
    fireEvent.change(nums[1], { target: { value: '25' } });
    fireEvent.change(container.querySelectorAll('select')[2] as HTMLSelectElement, {
      target: { value: 'Duplo' },
    });
    fireEvent.change(nums[2], { target: { value: '200' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Registrar Operação'));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.competition).toBe(COMP);
    expect(payload.game).toBe('Flamengo x Palmeiras');
    expect(payload.time).toBe('20:00');
    expect(payload.fixtureId).toBe(1);
    expect(payload.league).toBe('Campeonato Brasileiro Série A');
    expect(payload.result).toBe(125); // 200 - 75
  });

  it('envia jogo digitado sem fixtureId no modo manual', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<OperationForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, {
      target: { value: COMP },
    });
    await screen.findByText('Flamengo x Palmeiras (20:00)');
    fireEvent.click(screen.getByText('Digitar manualmente'));

    const manualGame = screen.getByPlaceholderText('Ex: Time A x Time B') as HTMLInputElement;
    fireEvent.change(manualGame, { target: { value: 'Time X x Time Y' } });
    const nums = container.querySelectorAll('input[type="number"]');
    fireEvent.change(nums[0], { target: { value: '50' } });
    fireEvent.change(nums[1], { target: { value: '0' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Registrar Operação'));
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.game).toBe('Time X x Time Y');
    expect(payload.fixtureId).toBeNull();
    expect(payload.league).toBeNull();
  });

  it('bloqueia o submit sem campeonato/jogo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<OperationForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    // preenche stake/payout p/ passar pela validação nativa e alcançar o guard do handler
    const nums = container.querySelectorAll('input[type="number"]');
    fireEvent.change(nums[0], { target: { value: '100' } });
    fireEvent.change(nums[1], { target: { value: '25' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Registrar Operação'));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Preencha campeonato e jogo.')).toBeInTheDocument();
  });
});
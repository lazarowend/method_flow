import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza nada quando fechado', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="T">x</Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título e conteúdo quando aberto', () => {
    render(
      <Modal open onClose={() => {}} title="Nova Operação">
        <span>conteúdo</span>
      </Modal>,
    );
    expect(screen.getByText('Nova Operação')).toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('fecha ao apertar Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">x</Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha ao clicar no backdrop (fora da caixa)', async () => {
    const onClose = vi.fn();
    const { container } = render(<Modal open onClose={onClose} title="T">x</Modal>);
    // backdrop é o primeiro div absoluto
    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeTruthy();
    await userEvent.click(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
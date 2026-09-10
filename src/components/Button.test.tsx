import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza children', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('aplica classe por variante', () => {
    const { container } = render(<Button variant="danger">X</Button>);
    expect(container.firstChild).toHaveClass('bg-rose-600/15');
  });

  it('aplica tamanho', () => {
    const { container } = render(<Button size="lg">X</Button>);
    expect(container.firstChild).toHaveClass('px-6 py-3 text-base');
  });

  it('desabilita e bloqueia clique', async () => {
    const fn = vi.fn();
    render(<Button disabled onClick={fn}>Ok</Button>);
    const btn = screen.getByRole('button', { name: 'Ok' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('chama onClick', async () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('repassa type', () => {
    render(<Button type="submit">S</Button>);
    expect(screen.getByRole('button', { name: 'S' })).toHaveAttribute('type', 'submit');
  });
});
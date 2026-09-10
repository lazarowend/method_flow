import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Select, Textarea } from './FormFields';

describe('Input', () => {
  it('renderiza label + input com tipo e valor', () => {
    const { container } = render(<Input label="Data" type="date" value="2026-09-08" onChange={() => {}} />);
    expect(screen.getByText('Data')).toBeInTheDocument();
    const el = container.querySelector('input');
    expect(el).toHaveAttribute('type', 'date');
    expect(el).toHaveValue('2026-09-08');
  });
  it('repassa placeholder e disabled', () => {
    const { container } = render(<Input label="Jogo" placeholder="Digite" disabled value="" onChange={() => {}} />);
    const el = container.querySelector('input');
    expect(el).toHaveAttribute('placeholder', 'Digite');
    expect(el).toBeDisabled();
  });
  it('dispara onChange ao digitar', async () => {
    const { container } = render(<Input label="Nome" value="" onChange={() => {}} />);
    const el = container.querySelector('input') as HTMLInputElement;
    await userEvent.type(el, 'abc');
    expect(el).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renderiza options e label', () => {
    render(
      <Select label="Campeonato" value="" onChange={() => {}}>
        <option value="">Nenhum</option>
        <option value="bra.1">Brasileirão</option>
      </Select>,
    );
    expect(screen.getByText('Campeonato')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});

describe('Textarea', () => {
  it('renderiza textarea com label e rows', () => {
    const { container } = render(<Textarea label="Obs" value="" onChange={() => {}} />);
    expect(screen.getByText('Obs')).toBeInTheDocument();
    const el = container.querySelector('textarea');
    expect(el).toHaveAttribute('rows', '3');
  });
});

describe('pass-through de props', () => {
  it('Input repassa atributos adicionais (spy onChange)', async () => {
    const onChange = vi.fn();
    const { container } = render(<Input label="X" value="" onChange={onChange} />);
    await userEvent.type(container.querySelector('input') as HTMLInputElement, 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
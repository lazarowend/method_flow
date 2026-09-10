export interface Operation {
  id: string;
  date: string;
  time: string;
  competition: string;
  game: string;
  stake: number;
  payout: number;
  doubleGreen: 'Duplo' | 'Não';
  profit: number;
  result: number;
  notes: string | null;
  /** ID do evento na API (ESPN/SportAPI7) — habilita reconciliação automática */
  fixtureId: number | null;
  /** Nome da liga retornado pela API */
  league: string | null;
  createdAt: string;
}

export interface Bank {
  id: string;
  initialValue: number;
  updatedAt: string;
}

export type OperationInput = Omit<Operation, 'id' | 'createdAt'>;

export interface Extra {
  id: string;
  date: string;
  time: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

export type ExtraInput = Omit<Extra, 'id' | 'createdAt'>;
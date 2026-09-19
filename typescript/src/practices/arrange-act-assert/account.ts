export interface AccountState {
  balanceCents: number;
  overdraftCents: number;
}

export type Withdrawal =
  | { ok: true; balanceCents: number }
  | { ok: false; reason: 'insufficient-funds' | 'not-a-positive-amount' };

export class Account {
  private balance: number;

  constructor(private readonly state: AccountState) {
    this.balance = state.balanceCents;
  }

  get balanceCents(): number {
    return this.balance;
  }

  withdraw(cents: number): Withdrawal {
    if (!Number.isInteger(cents) || cents <= 0) {
      return { ok: false, reason: 'not-a-positive-amount' };
    }
    if (cents > this.balance + this.state.overdraftCents) {
      return { ok: false, reason: 'insufficient-funds' };
    }
    this.balance -= cents;
    return { ok: true, balanceCents: this.balance };
  }
}

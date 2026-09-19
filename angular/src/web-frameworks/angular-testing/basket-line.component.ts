import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/* A standalone component, so the TestBed configuration is one import
   rather than a module declaration. */
@Component({
  selector: 'app-basket-line',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3>{{ sku }}</h3>
    <label [attr.for]="'qty-' + sku">Quantity</label>
    <input
      [id]="'qty-' + sku"
      type="number"
      [value]="raw()"
      (input)="enter($any($event.target).value)"
    />
    <p *ngIf="error()" role="alert">{{ error() }}</p>
    <p data-testid="line-total">{{ total() }}</p>
    <button type="button" [disabled]="committed() >= maxQuantity" (click)="enter(String(committed() + 1))">
      Add one
    </button>
  `
})
export class BasketLineComponent {
  @Input({ required: true }) sku!: string;
  @Input({ required: true }) unitCents!: number;
  @Input() maxQuantity = 10;

  @Output() change = new EventEmitter<{ sku: string; quantity: number }>();

  readonly raw = signal('1');
  readonly committed = signal(1);

  readonly String = String;

  readonly error = computed(() => {
    const parsed = Number(this.raw());
    if (this.raw().trim() === '' || !Number.isInteger(parsed) || parsed < 1) {
      return 'Quantity must be at least 1';
    }
    if (parsed > this.maxQuantity) return `Only ${this.maxQuantity} in stock`;
    return null;
  });

  readonly total = computed(() => `£${((this.unitCents * this.committed()) / 100).toFixed(2)}`);

  enter(next: string): void {
    this.raw.set(next);
    if (this.error() === null) {
      this.committed.set(Number(next));
      this.change.emit({ sku: this.sku, quantity: this.committed() });
    }
  }
}

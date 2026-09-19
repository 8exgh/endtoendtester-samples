import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { useRef, useState } from 'react';

expect.extend(toHaveNoViolations);

/* Roughly a third of WCAG is machine-checkable. This covers that third,
   plus the two things worth writing yourself that axe cannot see.
   https://endtoendtester.com/quality/accessibility-testing */

function PriceTag({ cents, wasCents }: { cents: number; wasCents?: number }) {
  return (
    <p>
      <span>£{(cents / 100).toFixed(2)}</span>
      {wasCents && (
        <s>
          <span className="sr-only">Was </span>£{(wasCents / 100).toFixed(2)}
        </s>
      )}
    </p>
  );
}

function BrokenField() {
  // No label, no accessible name — exactly what axe is for.
  return <input type="text" />;
}

function AddressDialog() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button type="button" ref={trigger} onClick={() => setOpen(true)}>
        Edit address
      </button>
      {open && (
        <div role="dialog" aria-label="Edit address" aria-modal="true">
          <label htmlFor="line1">Address line 1</label>
          <input id="line1" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              // Focus returns to where it came from. The single most common
              // accessibility defect in a single-page application.
              trigger.current?.focus();
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

describe('automated scanning', () => {
  it('finds no violations in a well-formed component', async () => {
    const { container } = render(<PriceTag cents={1_200} wasCents={1_500} />);

    expect(await axe(container)).toHaveNoViolations();
  });

  /* Proof the scanner is actually doing something: a component with a real
     defect must fail it. A green scan means nothing if nothing can be red. */
  it('reports a form field with no accessible name', async () => {
    const { container } = render(<BrokenField />);

    const results = await axe(container);

    expect(results.violations.map((v) => v.id)).toContain('label');
  });
});

describe('what a scanner cannot see', () => {
  it('returns focus to the trigger when a dialog closes', async () => {
    const user = userEvent.setup();
    render(<AddressDialog />);
    const trigger = screen.getByRole('button', { name: 'Edit address' });

    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(trigger).toHaveFocus();
  });

  it('reaches every control in reading order with the keyboard alone', async () => {
    const user = userEvent.setup();
    render(<AddressDialog />);

    await user.tab();

    expect(screen.getByRole('button', { name: 'Edit address' })).toHaveFocus();
  });
});

import { getByRole, getByLabelText, getByTestId, queryByRole, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

/* The layer underneath every framework. These queries work identically
   against React, Vue, Angular, Knockout or a template string — which is
   the whole reason to prefer them.
   https://endtoendtester.com/web-frameworks/dom-testing */

function render(html: string): HTMLElement {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.getElementById('root')!;
}

describe('the accessible name', () => {
  it('comes from aria-labelledby first', () => {
    const root = render('<button aria-labelledby="lbl"><span id="lbl">Pay</span></button>');

    expect(getByRole(root, 'button', { name: 'Pay' })).toBeInTheDocument();
  });

  it('falls back to aria-label', () => {
    const root = render('<button aria-label="Close dialog">×</button>');

    expect(getByRole(root, 'button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('falls back to an associated label for an input', () => {
    const root = render('<label for="card">Card number</label><input id="card" />');

    expect(getByLabelText(root, 'Card number')).toBe(root.querySelector('#card'));
  });

  it('falls back to the element\'s own text content', () => {
    const root = render('<button>Add to cart</button>');

    expect(getByRole(root, 'button', { name: 'Add to cart' })).toBeInTheDocument();
  });

  /* An icon-only button has no accessible name — and neither a test nor a
     screen-reader user can find it. The failure is correct. */
  it('is absent for an icon-only button, so the query correctly finds nothing', () => {
    const root = render('<button><svg aria-hidden="true"></svg></button>');

    expect(queryByRole(root, 'button', { name: /./ })).toBeNull();
    expect(getByRole(root, 'button')).toBeInTheDocument(); // the button exists; its name does not
  });
});

describe('why structural selectors rot', () => {
  const beforeRedesign = '<div class="card"><span>x</span><div><input id="card" aria-label="Card number" /></div></div>';
  const afterRedesign = '<section class="panel"><div><input id="card" aria-label="Card number" /></div></section>';

  it('a role query survives a complete restructure', () => {
    for (const html of [beforeRedesign, afterRedesign]) {
      const root = render(html);

      expect(getByRole(root, 'textbox', { name: 'Card number' })).toBeInTheDocument();
    }
  });

  it('a CSS structural selector does not', () => {
    expect(render(beforeRedesign).querySelector('.card > div input')).not.toBeNull();
    expect(render(afterRedesign).querySelector('.card > div input')).toBeNull();
  });
});

describe('user-event versus fireEvent', () => {
  /* A component that listens for pointerdown rather than click passes a
     fireEvent.click test and fails for real users. userEvent dispatches
     the whole sequence. */
  it('dispatches the full pointer sequence a real click produces', async () => {
    const root = render('<button id="pay">Pay</button>');
    const seen: string[] = [];
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      root.querySelector('#pay')!.addEventListener(type, () => seen.push(type));
    }

    await userEvent.setup().click(getByRole(root, 'button', { name: 'Pay' }));

    expect(seen).toEqual(['pointerdown', 'mousedown', 'mouseup', 'click']);
  });

  it('respects a disabled control instead of firing anyway', async () => {
    const root = render('<button id="pay" disabled>Pay</button>');
    const clicks: string[] = [];
    root.querySelector('#pay')!.addEventListener('click', () => clicks.push('click'));

    await userEvent.setup().click(getByRole(root, 'button', { name: 'Pay' }));

    expect(clicks).toEqual([]);
  });
});

describe('what jsdom cannot answer', () => {
  /* Honest about the boundary: jsdom implements the DOM, not a browser.
     Anything about size or position needs a real one. */
  it('reports zero for every layout measurement', () => {
    const root = render('<div style="width: 400px; height: 200px">wide</div>');
    const box = root.firstElementChild!.getBoundingClientRect();

    expect(box.width).toBe(0);
    expect(box.height).toBe(0);
  });
});

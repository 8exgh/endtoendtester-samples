import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

/* getBy throws, queryBy returns null, findBy returns a promise. Getting
   those three straight removes most of the confusion people have with this
   library. https://endtoendtester.com/web-frameworks/testing-library */

function DelayedGreeting({ delayMs = 10 }: { delayMs?: number }) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    setName('Alice');
    setLoading(false);
  }

  return (
    <div>
      <button type="button" onClick={load}>
        Load
      </button>
      {loading && <div role="progressbar" aria-label="Loading" />}
      {name && <h1>Hello, {name}</h1>}
    </div>
  );
}

describe('the three prefixes', () => {
  it('getBy throws a message listing the roles it could see', () => {
    render(<DelayedGreeting />);

    expect(() => screen.getByRole('heading')).toThrow(/Unable to find an accessible element/);
  });

  it('queryBy is the only one that can assert absence', () => {
    render(<DelayedGreeting />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('findBy waits for something that appears later', async () => {
    const user = userEvent.setup();
    render(<DelayedGreeting />);

    await user.click(screen.getByRole('button', { name: 'Load' }));

    expect(await screen.findByRole('heading', { name: 'Hello, Alice' })).toBeVisible();
  });

  it('waitForElementToBeRemoved waits for something to go away', async () => {
    const user = userEvent.setup();
    render(<DelayedGreeting delayMs={30} />);

    await user.click(screen.getByRole('button', { name: 'Load' }));

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));
    expect(screen.getByRole('heading')).toBeVisible();
  });

  it('waitFor retries an arbitrary assertion until it holds', async () => {
    const user = userEvent.setup();
    render(<DelayedGreeting />);

    await user.click(screen.getByRole('button', { name: 'Load' }));

    await waitFor(() => expect(screen.getByRole('heading')).toHaveTextContent('Alice'));
  });
});

describe('the guiding principle, applied', () => {
  /* There is no API for reading state or calling an instance method, and
     that is the feature: a test can only fail for a reason a user would
     notice. */
  it('exposes nothing but what is rendered', () => {
    const { container } = render(<DelayedGreeting />);

    expect(Object.keys(screen)).not.toContain('state');
    expect(container.querySelector('h1')).toBeNull();
  });

  it('finds a control the way a screen reader announces it', () => {
    render(<DelayedGreeting />);

    expect(screen.getByRole('button', { name: 'Load' })).toBeEnabled();
  });
});

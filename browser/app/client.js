/* The browser half. Deliberately asynchronous: the confirmation appears
   only after the request completes, which is what makes the difference
   between waiting for a duration and waiting for a condition visible. */

const session = (() => {
  let id = sessionStorage.getItem('session');
  if (!id) {
    id = Math.random().toString(36).slice(2);
    sessionStorage.setItem('session', id);
  }
  return id;
})();

const add = document.querySelector('#add');
if (add) {
  add.addEventListener('click', async () => {
    const quantity = Number(document.querySelector('#qty').value);
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, slug: add.dataset.slug, quantity })
    });
    const body = await response.json();
    document.querySelector('[data-testid=cart-status]').textContent =
      `${body.items} item${body.items === 1 ? '' : 's'} in cart`;
  });
}

const pay = document.querySelector('#pay');
if (pay) {
  (async () => {
    const summary = document.querySelector('[data-testid=summary]');
    try {
      const [cart, rate] = await Promise.all([
        fetch(`/api/cart?session=${session}`).then((r) => r.json()),
        fetch('/api/shipping-rate').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      ]);
      const shipping = cart.subtotalCents >= rate.freeOverCents ? 0 : rate.standardCents;
      summary.textContent = `${cart.items} item(s) — £${((cart.subtotalCents + shipping) / 100).toFixed(2)}`;
      summary.dataset.total = String(cart.subtotalCents + shipping);
    } catch {
      summary.textContent = 'We cannot calculate shipping right now.';
      summary.setAttribute('role', 'alert');
      pay.disabled = true;
    }
  })();

  pay.addEventListener('click', async () => {
    pay.disabled = true;
    const outcome = document.querySelector('#outcome');
    outcome.innerHTML = '<p role="progressbar" aria-label="Placing your order">Placing your order…</p>';

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, card: document.querySelector('#card').value })
    });

    if (!response.ok) {
      const error = await response.json();
      outcome.innerHTML = `<p role="alert">${
        error.error === 'card_declined' ? 'Your card was declined.' : 'Your basket is empty.'
      }</p>`;
      pay.disabled = false;
      return;
    }

    const order = await response.json();
    outcome.innerHTML = `<h2>Order confirmed</h2>
      <p data-testid="order-id">${order.id}</p>
      <p data-testid="order-total">£${(order.totalCents / 100).toFixed(2)}</p>
      <p>We have emailed your receipt.</p>`;
  });
}

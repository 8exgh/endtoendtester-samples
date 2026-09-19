import express from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* A shop small enough to read in one sitting and awkward enough to be worth
   automating: an asynchronous total, a late-appearing confirmation, a
   declinable card, and a rate that comes from "upstream" so a test can
   make it fail. */

const PORT = Number(process.env.PORT ?? 4321);
const here = path.dirname(new URL(import.meta.url).pathname);

const CATALOGUE = {
  'field-notes': { name: 'Field Notes', priceCents: 1_200 },
  'blackwing': { name: 'Pencil, blackwing', priceCents: 500 },
  'standing-desk': { name: 'Standing desk', priceCents: 40_000 }
};

const app = express();
app.use(express.json());

const carts = new Map();
const orders = new Map();

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/shipping-rate', (_req, res) => {
  // The "upstream" a test can intercept and fail.
  res.json({ standardCents: 395, freeOverCents: 5_000 });
});

app.post('/api/cart', (req, res) => {
  const { session, slug, quantity } = req.body ?? {};
  const product = CATALOGUE[slug];
  if (!product) return res.status(404).json({ error: 'unknown_product' });

  const cart = carts.get(session) ?? [];
  cart.push({ slug, quantity: Number(quantity) || 1, priceCents: product.priceCents });
  carts.set(session, cart);
  res.status(201).json({ items: cart.reduce((n, l) => n + l.quantity, 0) });
});

app.get('/api/cart', (req, res) => {
  const cart = carts.get(req.query.session) ?? [];
  res.json({
    lines: cart,
    items: cart.reduce((n, l) => n + l.quantity, 0),
    subtotalCents: cart.reduce((n, l) => n + l.quantity * l.priceCents, 0)
  });
});

app.post('/api/checkout', async (req, res) => {
  const { session, card } = req.body ?? {};
  const cart = carts.get(session) ?? [];
  if (!cart.length) return res.status(422).json({ error: 'empty_cart' });
  if (card === '4000000000000002') return res.status(402).json({ error: 'card_declined' });

  // Deliberately slow: a test that waits for a fixed duration will be
  // flaky against this, and one that waits for the confirmation will not.
  await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));

  const subtotal = cart.reduce((n, l) => n + l.quantity * l.priceCents, 0);
  const shipping = subtotal >= 5_000 ? 0 : 395;
  const id = `ORD-${orders.size + 1}`;
  orders.set(id, { id, subtotalCents: subtotal, shippingCents: shipping, totalCents: subtotal + shipping });
  carts.delete(session);

  res.status(201).json(orders.get(id));
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json(order);
});

const page = (body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sample Shop</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; }
  .muted { color: #666; } button { padding: .5rem .9rem; } label { display:block; margin-top:.6rem; }
  input { padding: .4rem; } [role=alert] { color: #a00; }
</style></head>
<body>${body}<script type="module" src="/app.js"></script></body></html>`;

app.get('/', (_req, res) =>
  res.type('html').send(
    page(`<h1>Sample Shop</h1>
      <ul>${Object.entries(CATALOGUE)
        .map(([slug, p]) => `<li><a href="/products/${slug}">${p.name}</a></li>`)
        .join('')}</ul>
      <p><a href="/checkout">Checkout</a></p>`)
  )
);

app.get('/products/:slug', (req, res) => {
  const product = CATALOGUE[req.params.slug];
  if (!product) return res.status(404).type('html').send(page('<h1>Not found</h1>'));
  res.type('html').send(
    page(`<h1>${product.name}</h1>
      <p data-testid="price">£${(product.priceCents / 100).toFixed(2)}</p>
      <label for="qty">Quantity</label>
      <input id="qty" type="number" value="1" min="1">
      <p><button id="add" data-slug="${req.params.slug}">Add to cart</button></p>
      <p role="status" data-testid="cart-status"></p>
      <p><a href="/checkout">Checkout</a></p>`)
  );
});

app.get('/checkout', (_req, res) =>
  res.type('html').send(
    page(`<h1>Checkout</h1>
      <p data-testid="summary" class="muted">Loading your basket…</p>
      <label for="card">Card number</label>
      <input id="card" autocomplete="cc-number">
      <p><button id="pay">Pay</button></p>
      <div id="outcome"></div>`)
  )
);

app.get('/app.js', (_req, res) => {
  res.type('js').send(readFileSync(path.join(here, 'client.js'), 'utf8'));
});

app.listen(PORT, '127.0.0.1', () => console.log(`sample shop on http://127.0.0.1:${PORT}`));

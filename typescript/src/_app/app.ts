import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { shippingCents, subtotalCents, type Line } from './pricing';

/* A small shop service. No database: the samples that need a real one start
   a container instead. Everything else here is deliberately realistic —
   status codes, tenant scoping, idempotency, security headers and a sign-in
   lockout, because those are the things the tests are about. */

export interface Order {
  id: string;
  tenantId: string;
  ownerId: string;
  lines: Line[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: 'reserved' | 'paid';
  placedAt: string;
}

export interface Caller {
  userId: string;
  tenantId: string;
  role: 'member' | 'admin';
}

const CATALOGUE: Record<string, number> = {
  'book-1': 1_200,
  'pen-2': 500,
  'desk-3': 40_000
};

export interface AppOptions {
  /** Injected so tests can pin timestamps and ids. See /practices/dependency-injection. */
  now?: () => number;
  newId?: () => string;
  /** Cards that should be declined, so the 402 path is reachable on demand. */
  declineCardTokens?: string[];
  maxSignInAttempts?: number;
}

export function createApp(options: AppOptions = {}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const declined = new Set(options.declineCardTokens ?? ['tok_declined']);
  const maxAttempts = options.maxSignInAttempts ?? 5;

  const orders = new Map<string, Order>();
  const idempotency = new Map<string, string>();
  const failedSignIns = new Map<string, number>();

  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.disable('x-powered-by');

  // Headers a browser needs to defend itself. See /quality/security-testing.
  app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  /* A deliberately simple bearer scheme: "<userId>:<tenantId>:<role>".
     Nothing here is a real auth system; it exists so the authorization
     matrix in /quality/authorization-testing has something to assert on. */
  function caller(req: Request): Caller | null {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    const [userId, tenantId, role] = header.slice(7).split(':');
    if (!userId || !tenantId) return null;
    return { userId, tenantId, role: role === 'admin' ? 'admin' : 'member' };
  }

  function requireCaller(req: Request, res: Response, next: NextFunction) {
    const who = caller(req);
    if (!who) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    (req as Request & { caller: Caller }).caller = who;
    next();
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', orders: orders.size });
  });

  app.post('/signin', (req, res) => {
    const { email, password } = req.body ?? {};
    const attempts = failedSignIns.get(email) ?? 0;

    // Locked out: the correct password fails too, which is what makes the
    // lockout real rather than decorative.
    if (attempts >= maxAttempts) {
      res.status(429).json({ error: 'too_many_attempts', retryAfterSeconds: 900 });
      return;
    }
    if (password !== 'correct-horse') {
      failedSignIns.set(email, attempts + 1);
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    failedSignIns.delete(email);
    res.json({ token: `${email}:acme:member` });
  });

  app.post('/orders', requireCaller, (req, res) => {
    const who = (req as Request & { caller: Caller }).caller;
    const { sku, quantity, cardToken, note } = req.body ?? {};

    const key = req.get('idempotency-key');
    if (key && idempotency.has(key)) {
      const existing = idempotency.get(key)!;
      res.status(200).location(`/orders/${existing}`).json(orders.get(existing));
      return;
    }

    if (typeof sku !== 'string' || !(sku in CATALOGUE)) {
      res.status(422).json({ error: 'unknown_sku', field: 'sku' });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      res.status(422).json({ error: 'invalid_quantity', field: 'quantity' });
      return;
    }
    if (typeof cardToken === 'string' && declined.has(cardToken)) {
      res.status(402).json({ error: 'card_declined' });
      return;
    }

    const lines: Line[] = [{ sku, unitCents: CATALOGUE[sku], quantity }];
    const subtotal = subtotalCents(lines);
    const shipping = shippingCents(subtotal, 'standard');

    const order: Order = {
      id: newId(),
      tenantId: who.tenantId,
      ownerId: who.userId,
      lines,
      subtotalCents: subtotal,
      shippingCents: shipping,
      totalCents: subtotal + shipping,
      status: cardToken ? 'paid' : 'reserved',
      placedAt: new Date(now()).toISOString(),
      // Stored verbatim. The security sample asserts it round-trips
      // unchanged rather than being executed or mangled.
      ...(typeof note === 'string' ? { note } : {})
    } as Order;

    orders.set(order.id, order);
    if (key) idempotency.set(key, order.id);

    res.status(201).location(`/orders/${order.id}`).json(order);
  });

  app.get('/orders/:id', requireCaller, (req, res) => {
    const who = (req as Request & { caller: Caller }).caller;
    const order = orders.get(String(req.params.id));

    // 404 rather than 403 across a tenant boundary: confirming the order
    // exists would itself be the leak. See /quality/authorization-testing.
    if (!order || order.tenantId !== who.tenantId) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(order);
  });

  app.delete('/orders/:id', requireCaller, (req, res) => {
    const who = (req as Request & { caller: Caller }).caller;
    const order = orders.get(String(req.params.id));

    if (!order || order.tenantId !== who.tenantId) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    // Known to the caller, but not theirs to delete: 403 is right here.
    if (who.role !== 'admin' && order.ownerId !== who.userId) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    orders.delete(order.id);
    res.status(204).end();
  });

  app.get('/orders', requireCaller, (req, res) => {
    const who = (req as Request & { caller: Caller }).caller;
    const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

    const mine = [...orders.values()]
      .filter((order) => order.tenantId === who.tenantId)
      .sort((a, b) => (a.id < b.id ? -1 : 1)); // stable order, or pages overlap

    const start = cursor ? mine.findIndex((o) => o.id === cursor) + 1 : 0;
    const page = mine.slice(start, start + limit);

    res.json({ items: page, next: page.length === limit ? page[page.length - 1]?.id ?? null : null });
  });

  return app;
}

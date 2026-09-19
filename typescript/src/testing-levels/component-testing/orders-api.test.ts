import request from 'supertest';
import { createApp } from '../../_app/app';

/* One whole deployable, through the interface its callers actually use.
   Real routing, real middleware, real validation — only what is beyond the
   service's boundary is faked.
   https://endtoendtester.com/testing-levels/component-testing */

const app = createApp({
  now: () => Date.parse('2026-01-01T12:00:00Z'),
  declineCardTokens: ['tok_declined']
});

const alice = 'Bearer alice:acme:member';

describe('POST /orders', () => {
  it('creates an order and returns its location', async () => {
    const response = await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .send({ sku: 'book-1', quantity: 2 })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(response.headers.location).toMatch(/^\/orders\/[0-9a-f-]{36}$/);

    // Read it back through the API, not the store: the test then describes
    // the contract rather than the internal shape.
    const read = await request(app)
      .get(response.headers.location)
      .set('Authorization', alice)
      .expect(200);

    expect(read.body).toMatchObject({
      status: 'reserved',
      subtotalCents: 2_400,
      shippingCents: 395,
      totalCents: 2_795
    });
  });

  it('charges no shipping once the basket reaches the threshold', async () => {
    const { body } = await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .send({ sku: 'desk-3', quantity: 1 })
      .expect(201);

    expect(body.shippingCents).toBe(0);
    expect(body.totalCents).toBe(40_000);
  });

  it('returns 402 and creates nothing when the card is declined', async () => {
    const before = await request(app).get('/orders').set('Authorization', alice).expect(200);

    await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .send({ sku: 'book-1', quantity: 1, cardToken: 'tok_declined' })
      .expect(402)
      .expect(({ body }) => expect(body.error).toBe('card_declined'));

    const after = await request(app).get('/orders').set('Authorization', alice).expect(200);
    expect(after.body.items).toHaveLength(before.body.items.length);
  });

  it.each([
    [{ sku: 'nope', quantity: 1 }, 'unknown_sku'],
    [{ sku: 'book-1', quantity: 0 }, 'invalid_quantity'],
    [{ sku: 'book-1', quantity: 1.5 }, 'invalid_quantity'],
    [{ sku: 'book-1', quantity: 101 }, 'invalid_quantity']
  ])('rejects %j with 422 %s', async (body, error) => {
    await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .send(body)
      .expect(422)
      .expect((res) => expect(res.body.error).toBe(error));
  });

  it('is idempotent: the same key returns the same order', async () => {
    const key = `ORD-${Date.now()}`;

    const first = await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .set('Idempotency-Key', key)
      .send({ sku: 'book-1', quantity: 1 })
      .expect(201);

    const second = await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .set('Idempotency-Key', key)
      .send({ sku: 'book-1', quantity: 1 })
      .expect(200);

    expect(second.body.id).toBe(first.body.id);
  });
});

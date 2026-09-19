import request from 'supertest';
import { createApp } from '../../_app/app';

/* The interface is the contract: status codes, error shapes, pagination
   and idempotency. All of it an order of magnitude cheaper here than
   through a browser. https://endtoendtester.com/platforms/api-testing */

const app = createApp({ now: () => Date.parse('2026-01-01T12:00:00Z') });
const alice = 'Bearer alice:acme:member';

describe('error shapes', () => {
  /* Most services are wrong about these, because nothing tests them. */
  it.each([
    ['no credentials', {}, 401, 'unauthenticated'],
    ['unknown sku', { sku: 'nope', quantity: 1 }, 422, 'unknown_sku']
  ])('%s returns %i %s', async (_name, body, status, error) => {
    const call = request(app).post('/orders');
    if (status !== 401) call.set('Authorization', alice);

    const response = await call.send(body).expect(status);
    expect(response.body).toMatchObject({ error });
  });

  it('names the offending field so a client can point at it', async () => {
    const { body } = await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .send({ sku: 'book-1', quantity: -1 })
      .expect(422);

    expect(body).toEqual({ error: 'invalid_quantity', field: 'quantity' });
  });
});

describe('pagination', () => {
  beforeAll(async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/orders').set('Authorization', alice).send({ sku: 'pen-2', quantity: 1 });
    }
  });

  it('never repeats or skips an order across pages', async () => {
    const first = await request(app).get('/orders?limit=2').set('Authorization', alice).expect(200);
    const second = await request(app)
      .get(`/orders?limit=2&cursor=${first.body.next}`)
      .set('Authorization', alice)
      .expect(200);

    expect(first.body.items).toHaveLength(2);
    expect(second.body.items).toHaveLength(2);

    const firstIds = new Set(first.body.items.map((o: { id: string }) => o.id));
    const overlap = second.body.items.filter((o: { id: string }) => firstIds.has(o.id));
    expect(overlap).toEqual([]);
  });

  it('caps an absurd limit rather than trusting it', async () => {
    const { body } = await request(app)
      .get('/orders?limit=100000')
      .set('Authorization', alice)
      .expect(200);

    expect(body.items.length).toBeLessThanOrEqual(100);
  });
});

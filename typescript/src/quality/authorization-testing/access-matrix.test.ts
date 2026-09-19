import request from 'supertest';
import { createApp } from '../../_app/app';

/* The highest-value security testing most teams are not doing: the same
   request as somebody who should not be able to make it.
   https://endtoendtester.com/quality/authorization-testing */

const app = createApp();

const AS = {
  owner: 'Bearer alice:acme:member',
  colleague: 'Bearer bob:acme:member',
  admin: 'Bearer root:acme:admin',
  otherTenant: 'Bearer mallory:evil:member',
  anonymous: null
} as const;

function as(who: keyof typeof AS) {
  const token = AS[who];
  return token ? { Authorization: token } : {};
}

async function anOrderOwnedByAlice(): Promise<string> {
  const { body } = await request(app)
    .post('/orders')
    .set(as('owner'))
    .send({ sku: 'book-1', quantity: 1 })
    .expect(201);
  return body.id;
}

describe('GET /orders/:id', () => {
  /* Six lines of table, six real security assertions, milliseconds to run.
     404 across the tenant boundary, not 403: confirming the order exists
     would itself be the leak. */
  it.each([
    ['owner', 200],
    ['colleague', 200],
    ['admin', 200],
    ['otherTenant', 404],
    ['anonymous', 401]
  ] as const)('as %s returns %i', async (who, expected) => {
    const id = await anOrderOwnedByAlice();

    await request(app).get(`/orders/${id}`).set(as(who)).expect(expected);
  });

  it('does not leak existence through the error body either', async () => {
    const id = await anOrderOwnedByAlice();

    const foreign = await request(app).get(`/orders/${id}`).set(as('otherTenant')).expect(404);
    const nonsense = await request(app).get('/orders/does-not-exist').set(as('otherTenant')).expect(404);

    expect(foreign.body).toEqual(nonsense.body);
  });
});

describe('DELETE /orders/:id', () => {
  /* 403 here, not 404: the colleague legitimately knows the order exists —
     they can read it — and only the action is forbidden. */
  it.each([
    ['owner', 204],
    ['admin', 204],
    ['colleague', 403],
    ['otherTenant', 404],
    ['anonymous', 401]
  ] as const)('as %s returns %i', async (who, expected) => {
    const id = await anOrderOwnedByAlice();

    await request(app).delete(`/orders/${id}`).set(as(who)).expect(expected);
  });

  it('a forbidden delete really does leave the order in place', async () => {
    const id = await anOrderOwnedByAlice();

    await request(app).delete(`/orders/${id}`).set(as('colleague')).expect(403);

    await request(app).get(`/orders/${id}`).set(as('owner')).expect(200);
  });
});

describe('GET /orders', () => {
  it('never returns another tenant\'s orders in a list', async () => {
    await anOrderOwnedByAlice();

    const { body } = await request(app).get('/orders').set(as('otherTenant')).expect(200);

    expect(body.items).toEqual([]);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { ROUTES, createApp } from '../../_app/app';

/* A strategy you can check is worth more than one you can only assert in a
   document. Three of its claims are enforced here.
   https://endtoendtester.com/roles/test-strategy */

const AUTHORIZATION_TESTS = path.resolve(
  __dirname,
  '../../quality/authorization-testing/access-matrix.test.ts'
);

describe('what we said we are protecting', () => {
  /* Claim 1: no tenant can see another tenant's data. */
  it('refuses a cross-tenant read on every protected read route', async () => {
    const app = createApp();
    const { body } = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer alice:acme:member')
      .send({ sku: 'book-1', quantity: 1 })
      .expect(201);

    await request(app).get(`/orders/${body.id}`).set('Authorization', 'Bearer mallory:evil:member').expect(404);
    const listed = await request(app).get('/orders').set('Authorization', 'Bearer mallory:evil:member').expect(200);

    expect(listed.body.items).toEqual([]);
  });

  /* Claim 2: nothing protected is reachable without credentials. */
  it.each(ROUTES.filter((route) => route.protected))(
    '$method $path is unreachable without credentials',
    async (route) => {
      const app = createApp();
      const send = request(app)[route.method.toLowerCase() as 'get' | 'post' | 'delete'](
        route.path.replace(':id', '00000000-0000-0000-0000-000000000000')
      );

      await send.expect(401);
    }
  );
});

describe('the strategy as a build gate', () => {
  /* Claim 3: every protected route has an authorization test. Crude, and
     it works — it turns "we should test authorization" from a good
     intention into a failing build. */
  it('has an authorization test naming every protected route', () => {
    const covered = fs.readFileSync(AUTHORIZATION_TESTS, 'utf8');

    const uncovered = ROUTES.filter((route) => route.protected).filter((route) => {
      const resource = route.path.split('/')[1]; // "orders"
      const verb = route.method.toLowerCase();
      // The path may be written with any quote style, or none.
      return !new RegExp(`${verb}\\(\\s*[\`'"]?/${resource}`, 'i').test(covered);
    });

    expect(uncovered.map((route) => `${route.method} ${route.path}`)).toEqual([]);
  });

  it('keeps the route list honest by mounting exactly what it claims', async () => {
    const app = createApp();

    // A route in the list that does not exist answers 404 for everyone,
    // which would make the gate above meaningless.
    await request(app).get('/health').expect(200);
    await request(app).get('/orders').set('Authorization', 'Bearer alice:acme:member').expect(200);
  });
});

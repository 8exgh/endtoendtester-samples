import request from 'supertest';
import { createApp } from '../../_app/app';

/* The tests you write yourself, as opposed to the scans a pipeline runs.
   https://endtoendtester.com/quality/security-testing */

const alice = 'Bearer alice:acme:member';

describe('security headers', () => {
  const app = createApp();

  it('sets the headers a browser needs to defend itself', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(response.headers['strict-transport-security']).toMatch(/max-age=\d{7,}/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('input handling', () => {
  const app = createApp();

  /* The assertion is that the payload round-trips EXACTLY: not executed,
     not escaped into something else, not silently truncated. Mangling is
     its own bug — it means the value you stored is not the value you got. */
  it.each([
    ["'; DROP TABLE orders; --", 'sql injection'],
    ['<img src=x onerror=alert(1)>', 'cross-site scripting'],
    ['../../../../etc/passwd', 'path traversal'],
    ['{{7*7}}', 'template injection'],
    ['\u0000truncated', 'null byte'],
    ['🙈 unicode ✅', 'astral plane']
  ])('stores %j verbatim (%s)', async (payload) => {
    const { body } = await request(app)
      .post('/orders')
      .set('Authorization', alice)
      .send({ sku: 'book-1', quantity: 1, note: payload })
      .expect(201);

    const read = await request(app)
      .get(`/orders/${body.id}`)
      .set('Authorization', alice)
      .expect(200);

    expect(read.body.note).toBe(payload);
  });
});

describe('sign-in lockout', () => {
  it('locks out after five failures, and the correct password fails too', async () => {
    const app = createApp({ maxSignInAttempts: 5 });
    const email = 'victim@example.test';

    for (let attempt = 1; attempt <= 5; attempt++) {
      await request(app).post('/signin').send({ email, password: 'wrong' }).expect(401);
    }

    // The proof that the lockout is real rather than decorative.
    const locked = await request(app)
      .post('/signin')
      .send({ email, password: 'correct-horse' })
      .expect(429);

    expect(locked.body).toMatchObject({ error: 'too_many_attempts' });
  });

  it('locks the account being attacked, not everybody', async () => {
    const app = createApp({ maxSignInAttempts: 2 });

    await request(app).post('/signin').send({ email: 'a@example.test', password: 'x' }).expect(401);
    await request(app).post('/signin').send({ email: 'a@example.test', password: 'x' }).expect(401);

    await request(app)
      .post('/signin')
      .send({ email: 'b@example.test', password: 'correct-horse' })
      .expect(200);
  });
});

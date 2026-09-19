/* https://endtoendtester.com/tools/cypress
 *
 * Cypress runs inside the browser, in the same run loop as the
 * application. That single decision explains the retry-ability, the
 * time-travel debugging, and the limits.
 */

describe('retry-ability', () => {
  it('waits for the confirmation without any waiting code', () => {
    cy.visit('/products/field-notes');
    cy.findByRole('button', { name: 'Add to cart' }).click();
    cy.findByRole('status').should('have.text', '1 item in cart');

    cy.visit('/checkout');
    cy.findByLabelText('Card number').type('4242424242424242');
    cy.findByRole('button', { name: 'Pay' }).click();

    // The server sleeps 250-500ms. Every assertion retries until it holds.
    cy.findByRole('heading', { name: 'Order confirmed' }).should('be.visible');
    cy.get('[data-testid=order-total]').should('have.text', '£15.95');
  });

  it('asserts absence without throwing', () => {
    cy.visit('/products/field-notes');

    cy.findByRole('alert').should('not.exist');
  });
});

describe('cy.intercept', () => {
  /* Waiting on a named request is the cleanest network-driven waiting
     model of the three major tools. */
  it('waits on an aliased request rather than on a duration', () => {
    cy.intercept('POST', '/api/cart').as('addToCart');

    cy.visit('/products/blackwing');
    cy.findByRole('button', { name: 'Add to cart' }).click();

    cy.wait('@addToCart').its('response.statusCode').should('eq', 201);
  });

  it('makes a dependency fail on demand, which the real one will not', () => {
    cy.intercept('GET', '/api/shipping-rate', { statusCode: 503, body: '' }).as('rate');

    cy.visit('/checkout');

    cy.wait('@rate');
    cy.findByRole('alert').should('have.text', 'We cannot calculate shipping right now.');
    cy.findByRole('button', { name: 'Pay' }).should('be.disabled');
  });

  it('rewrites a response rather than only failing it', () => {
    cy.intercept('GET', '/api/shipping-rate', { standardCents: 0, freeOverCents: 0 }).as('rate');

    cy.visit('/products/field-notes');
    cy.findByRole('button', { name: 'Add to cart' }).click();
    cy.findByRole('status').should('contain.text', '1 item');

    cy.visit('/checkout');
    cy.wait('@rate');
    cy.get('[data-testid=summary]').should('have.text', '1 item(s) — £12.00');
  });
});

describe('the command queue', () => {
  /* cy.get() does not return an element; it enqueues a command. Mixing it
     with ordinary JavaScript is the single most common source of
     confusion for people arriving from Playwright. */
  it('yields its subject into then rather than returning it', () => {
    cy.visit('/products/standing-desk');

    cy.get('[data-testid=price]')
      .invoke('text')
      .then((text) => {
        expect(text).to.equal('£400.00');
      });
  });

  it('reaches into the application, which running in-process allows', () => {
    cy.visit('/products/field-notes');

    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('session')).to.be.a('string');
    });
  });
});

describe('a declined card', () => {
  it('is reported to the customer and leaves the basket intact', () => {
    cy.visit('/products/field-notes');
    cy.findByRole('button', { name: 'Add to cart' }).click();
    cy.findByRole('status').should('contain.text', '1 item');

    cy.visit('/checkout');
    cy.findByLabelText('Card number').type('4000000000000002');
    cy.findByRole('button', { name: 'Pay' }).click();

    cy.findByRole('alert').should('have.text', 'Your card was declined.');
    cy.findByRole('button', { name: 'Pay' }).should('be.enabled');
  });
});

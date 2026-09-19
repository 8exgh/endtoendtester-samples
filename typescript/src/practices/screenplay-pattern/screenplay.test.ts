import { Actor } from './screenplay';
import { CanEdit, CreateDocument, ShareDocument, Shop, TheDocuments, UseTheShop } from './shop';

/* https://endtoendtester.com/practices/screenplay-pattern */

function cast() {
  const shop = new Shop();
  const alice = new Actor('Alice').whoCan(new UseTheShop(shop, 'alice'));
  const bob = new Actor('Bob').whoCan(new UseTheShop(shop, 'bob'));
  return { shop, alice, bob };
}

describe('an actor performing tasks', () => {
  it('reads as a user story rather than as a script', async () => {
    const { alice } = cast();

    await alice.attemptsTo(CreateDocument.titled('Field notes'));

    expect(await alice.asks(TheDocuments.visible())).toEqual(['Field notes']);
  });

  it('refuses an ability the actor was never given', async () => {
    const stranger = new Actor('Stranger');

    await expect(stranger.attemptsTo(CreateDocument.titled('x'))).rejects.toThrow(
      'Stranger cannot UseTheShop'
    );
  });
});

describe('two actors in one scenario', () => {
  /* This is the pattern's strongest argument. Expressing it with page
     objects means threading two drivers through helper functions by hand;
     here it falls out of the model. */
  it('shares a document with a colleague who can then see it', async () => {
    const { shop, alice, bob } = cast();
    await alice.attemptsTo(CreateDocument.titled('Field notes'));
    const [doc] = [...shop.documents.values()];

    await alice.attemptsTo(ShareDocument.withTheActor(bob).as('commenter').theDocument(doc.id));

    expect(await bob.asks(TheDocuments.visible())).toEqual(['Field notes']);
  });

  it('shares it as a commenter, so the colleague still cannot edit', async () => {
    const { shop, alice, bob } = cast();
    await alice.attemptsTo(CreateDocument.titled('Field notes'));
    const [doc] = [...shop.documents.values()];

    await alice.attemptsTo(ShareDocument.withTheActor(bob).as('commenter').theDocument(doc.id));

    expect(await bob.asks(CanEdit.theDocument(doc.id))).toBe(false);
    expect(await alice.asks(CanEdit.theDocument(doc.id))).toBe(true);
  });

  it('lets a colleague edit once shared as an editor', async () => {
    const { shop, alice, bob } = cast();
    await alice.attemptsTo(CreateDocument.titled('Field notes'));
    const [doc] = [...shop.documents.values()];

    await alice.attemptsTo(ShareDocument.withTheActor(bob).as('editor').theDocument(doc.id));

    expect(await bob.asks(CanEdit.theDocument(doc.id))).toBe(true);
  });

  it('does not let a colleague share a document they do not own', async () => {
    const { shop, alice, bob } = cast();
    await alice.attemptsTo(CreateDocument.titled('Field notes'));
    const [doc] = [...shop.documents.values()];

    await expect(
      bob.attemptsTo(ShareDocument.withTheActor(alice).as('editor').theDocument(doc.id))
    ).rejects.toThrow('bob does not own');
  });

  it('keeps one actor\'s documents invisible to the other by default', async () => {
    const { alice, bob } = cast();

    await alice.attemptsTo(CreateDocument.titled('Private'));

    expect(await bob.asks(TheDocuments.visible())).toEqual([]);
  });
});

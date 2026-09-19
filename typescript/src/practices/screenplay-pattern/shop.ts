import { Actor, type Ability, type Question, type Task } from './screenplay';

/* An ability, three tasks and two questions over a tiny in-memory shop.
   The point of the pattern is the last test in the suite: two actors in one
   scenario, which page objects make awkward. */

export interface Document {
  id: string;
  owner: string;
  title: string;
  sharedWith: Map<string, 'viewer' | 'commenter' | 'editor'>;
}

export class Shop {
  readonly documents = new Map<string, Document>();

  create(owner: string, title: string): Document {
    const doc: Document = { id: `doc-${this.documents.size + 1}`, owner, title, sharedWith: new Map() };
    this.documents.set(doc.id, doc);
    return doc;
  }
}

export class UseTheShop implements Ability {
  constructor(
    readonly shop: Shop,
    readonly as: string
  ) {}
  static of(actor: Actor): UseTheShop {
    return actor.abilityTo(UseTheShop);
  }
}

export class CreateDocument implements Task {
  private constructor(private readonly title: string) {}
  static titled(title: string) {
    return new CreateDocument(title);
  }
  async performAs(actor: Actor) {
    const { shop, as } = UseTheShop.of(actor);
    shop.create(as, this.title);
  }
}

export class ShareDocument implements Task {
  private constructor(
    private readonly documentId: string,
    private readonly withWhom: Actor,
    private readonly role: 'viewer' | 'commenter' | 'editor'
  ) {}

  static withTheActor(withWhom: Actor) {
    return {
      as: (role: 'viewer' | 'commenter' | 'editor') => ({
        theDocument: (documentId: string) => new ShareDocument(documentId, withWhom, role)
      })
    };
  }

  async performAs(actor: Actor) {
    const { shop, as } = UseTheShop.of(actor);
    const doc = shop.documents.get(this.documentId);
    if (!doc) throw new Error(`no such document: ${this.documentId}`);
    if (doc.owner !== as) throw new Error(`${as} does not own ${this.documentId}`);
    doc.sharedWith.set(UseTheShop.of(this.withWhom).as, this.role);
  }
}

export const TheDocuments = {
  visible: (): Question<string[]> => ({
    async answeredBy(actor) {
      const { shop, as } = UseTheShop.of(actor);
      return [...shop.documents.values()]
        .filter((doc) => doc.owner === as || doc.sharedWith.has(as))
        .map((doc) => doc.title);
    }
  })
};

export const CanEdit = {
  theDocument: (documentId: string): Question<boolean> => ({
    async answeredBy(actor) {
      const { shop, as } = UseTheShop.of(actor);
      const doc = shop.documents.get(documentId);
      if (!doc) return false;
      return doc.owner === as || doc.sharedWith.get(as) === 'editor';
    }
  })
};

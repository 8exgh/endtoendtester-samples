/* The whole pattern is four small interfaces. No framework required.
   https://endtoendtester.com/practices/screenplay-pattern */

export interface Ability {}

export interface Task {
  performAs(actor: Actor): Promise<void>;
}

export interface Question<T> {
  answeredBy(actor: Actor): Promise<T>;
}

export class Actor {
  private readonly abilities = new Map<Function, Ability>();

  constructor(readonly name: string) {}

  whoCan(...abilities: Ability[]): this {
    for (const ability of abilities) this.abilities.set(ability.constructor, ability);
    return this;
  }

  abilityTo<A extends Ability>(type: new (...args: never[]) => A): A {
    const ability = this.abilities.get(type);
    if (!ability) throw new Error(`${this.name} cannot ${type.name}`);
    return ability as A;
  }

  async attemptsTo(...tasks: Task[]): Promise<void> {
    for (const task of tasks) await task.performAs(this);
  }

  async asks<T>(question: Question<T>): Promise<T> {
    return question.answeredBy(this);
  }
}

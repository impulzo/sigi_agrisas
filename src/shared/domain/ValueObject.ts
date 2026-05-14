export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    return this._value;
  }

  equals(vo: ValueObject<T>): boolean {
    return JSON.stringify(this._value) === JSON.stringify(vo._value);
  }
}

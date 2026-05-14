export class Result<T, E extends Error = Error> {
  private constructor(
    private readonly _ok: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>(true, value);
  }

  static fail<E extends Error>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  get isOk(): boolean {
    return this._ok;
  }

  get isFail(): boolean {
    return !this._ok;
  }

  getValue(): T {
    if (!this._ok) throw new Error("Cannot get value of a failed result");
    return this._value as T;
  }

  getError(): E {
    if (this._ok) throw new Error("Cannot get error of a successful result");
    return this._error as E;
  }
}

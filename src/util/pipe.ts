declare interface Next<T, U> {
  (arg0: T, ...rest: any[]) : U
}
/**
 * minimalistic functional pipeline for typescript
 * allows for code organization similar to 
 * to the |> operator from Elixir
 */
export default class Pipe<T> {
  /**
   * create a new Pipe with an initial value
   */
  static of<T> (val : T) : Pipe<T> {
    return new Pipe(val)
  }
  /**
   * maybe apply a function to a value if it's a "safe"
   * value at runtime 
   */
  static maybe<A, B> (val : A, fn: (a: A, ...args: any[])=> B, ...args: any[]) : B | void {
    if (val === undefined || val === null) return void(0)
    return fn(val, ...args)
  }
  
  data: T;  
  private constructor (data : T) {
    this.data = data
  }
  /**
   * do something with the data but do not mutate the value
   * and discard the result
   */
  tap <U>(fn: Next<T, U>, ...args: any[]) : Pipe<T> {
    const outcome = fn(this.data, ...args)
    return new Pipe<T>(this.data)
  }
  /**
   * |>
   */
  fmap <U>(fn: Next<T, U>, ...args: any[]) : Pipe<U> {
    const outcome = fn(this.data, ...args)
    return new Pipe<U>(outcome)
  }
}
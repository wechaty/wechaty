/**
 * Should be removed after Nov 16
 * @see https://github.com/huan/clone-class/issues/58
 */
type ClassInterface<C> = {
  [key in keyof C]: C[key]
}

type InstanceInterface <I> = {
  new (...args: any[]): I
  prototype: I
}

/**
 * @deprecated wait for TS4.5 and remove this by using the `clone-class` module
 */
type Constructor<
  I extends {} = {},
  C = {}
> = ClassInterface<C> & InstanceInterface<I>

export type {
  Constructor,
}

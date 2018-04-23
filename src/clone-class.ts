
/**
 * Clone Class for easy savig Information into Static Properties
 * https://github.com/Chatie/wechaty/issues/518
 */

// https://github.com/Microsoft/TypeScript/issues/10262
// https://github.com/Microsoft/TypeScript/pull/13743
export type Constructor<T> = new(...args: any[]) => T

// tslint:disable-next-line:variable-name
export function cloneClass<T extends Constructor<{}>>(OrignalClass: T): T {
  class NewClass extends OrignalClass {
    constructor(...args: any[]) {
      super(...arguments)
    }
  }
  return NewClass as any as T
}

export default cloneClass

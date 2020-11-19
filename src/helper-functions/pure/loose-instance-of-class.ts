/**
 * Huan(202011)
 *  Create a `looseInstanceOfClass` to check `FileBox` and `Puppet` instances #2090
 *    https://github.com/wechaty/wechaty/issues/2090
 */

function looseInstanceOfClass<T extends { new (...args: any): any }> (klass: T) {
  return (o: any): o is InstanceType<T> => {
    if (o instanceof klass) {
      return true
    } else if (o && o.constructor && o.constructor.name === klass.name) {
      return true
    }

    return false
  }
}

export { looseInstanceOfClass }

const noop = (x: any) => x
// TODO: finish the middleware compose logic
export const compose = function (middlewares: any[]) {
  noop(middlewares)
  return (...args: any) => {
    noop(args)
  }
}

import {
  Transform,
}             from 'stronger-typed-streams'

class TypedTransform<In, Out> extends Transform<In, Out> {}

export * from 'stronger-typed-streams'
export {
  TypedTransform,
}

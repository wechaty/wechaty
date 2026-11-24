/**
 * Public \`helpers\` of \`wechaty\`: sayable conversions and the puppet's
 * \`typeName()\`.
 */
// `typeName()` turns a puppet type value back into its name, for example
// `typeName(ScanStatus, status)`: the 2.0 type maps (`as const` objects)
// have no reverse mapping like the 1.x TypeScript enums.
export {
  typeName,
}                           from 'wechaty-puppet/helpers'
export {
  messageToSayable,
  payloadToSayableWechaty,
  sayableToPayload,
}                           from '../sayable/mod.ts'

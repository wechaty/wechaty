/* eslint @typescript-eslint/no-unused-vars: off */

export function throwUnsupportedError (..._: any): never {
  throw new Error([
    'Wechaty Puppet Unsupported API Error.',
    ' ',
    'Learn More At https://github.com/wechaty/wechaty-puppet/wiki/Compatibility',
  ].join(''))
}

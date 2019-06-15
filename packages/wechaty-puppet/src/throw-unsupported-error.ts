export function throwUnsupportedError (...args: any[]): never {
  throw new Error([
    'Wechaty Puppet Unsupported API Error.',
    ' ',
    'Learn More At https://github.com/Chatie/wechaty-puppet/wiki/Compatibility',
  ].join(''))
}

/* eslint-disable sort-keys */
import {
  command,
  option,
  optional,
  string,
}                 from 'cmd-ts'

import { WechatyToken } from '../wechaty-token.js'

async function handler (args: any) {
  try {
    const result = await WechatyToken.generate(args.type)
    console.error(result)
  } catch (e) {
    console.error(e)
  }
}

const generate = command({
  name: 'generate',
  description: 'Generate a new Wechaty Token',
  args: {
    type: option({
      description: 'The type of the Wechaty Puppet Service',
      long: 'type',
      short: 't',
      type: optional(string),
    }),
  },
  handler,
})

export { generate }

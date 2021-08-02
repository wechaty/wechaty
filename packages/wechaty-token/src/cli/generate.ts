/* eslint-disable sort-keys */
import {
  command,
  option,
  optional,
  string,
}                 from 'cmd-ts'

import { WechatyToken } from '../wechaty-token'

async function handler (args: any) {
  const wechatyToken = new WechatyToken()
  try {
    const result = await wechatyToken.generate(args.type)
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

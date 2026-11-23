/**
 * `wechaty-token generate [--type <sni>]`: prints a new token for a puppet
 * service, `<type>_<uuid>` (default type `uuid`).
 */
import {
  command,
  option,
  optional,
  string,
}                 from 'cmd-ts'

import { WechatyToken } from '../wechaty-token.ts'

/**
 * Prints a new token of the requested type (default `uuid`). It writes to
 * stderr (`console.error`), as the 1.x CLI did.
 */
async function handler (args: any) {
  try {
    const result = await WechatyToken.generate(args.type)
    console.error(result)
  } catch (e) {
    console.error(e)
  }
}

/** The `generate [--type <sni>]` subcommand. */
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

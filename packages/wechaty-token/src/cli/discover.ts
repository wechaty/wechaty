/* eslint-disable sort-keys */
import {
  command,
  positional,
  string,
}                 from 'cmd-ts'

import { WechatyToken } from '../wechaty-token'

async function handler (args: any) {
  let address

  try {
    address = await new WechatyToken(args.token).discover()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  if (address) {
    /**
      * Huan(202108): `ip` is deprecated. use `host` instead
      *   See: https://github.com/wechaty/wechaty-puppet-service/issues/154
      */
    delete (address as any)['ip']

    // print the result
    console.info(address)
  } else {
    console.info('NotFound')
    process.exit(1)
  }

}

const discover = command({
  name: 'discover',
  description: 'Wechaty TOKEN Service Discovery',
  args: {
    token: positional({
      type: string,
      description: 'Wechaty Puppet Service TOKEN',
    }),
  },
  handler,
})

export { discover }

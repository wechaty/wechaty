/* eslint-disable sort-keys */
import {
  command,
  option,
  optional,
  string,
  number,
}                 from 'cmd-ts'

import {
  log,
}                 from 'wechaty-puppet'
import { WechatyToken } from 'wechaty-token'
import getPort from 'get-port'

import {
  VERSION,
}                           from '../config.js'
import {
  IoClient,
  IoClientOptions,
}                           from '../io-client.js'
import { WechatyBuilder }   from '../wechaty-builder.js'
import {
  isPuppetModuleName,
  PUPPET_DEPENDENCIES,
  PUPPET_NAME_DEFAULT,
}                           from '../puppet-config.js'

async function onError (
  this : IoClient,
  e    : Error,
) {
  log.error('TokenGateway', 'Error: %s', e)
  await this.quit()
  process.exit(-1)
}

const tokenGateway = command({
  name: 'token-gateway',
  description: 'Create a gateway for publishing a DIY token as Wechaty Puppet Service, based on your existing puppet provider/service',
  args: {
    token: option({
      description: 'Specify a TOKEN for your DIY Wechaty Puppet Service (WPS). It is the standard token service for TypeScript and Polyglot Wechaty (like Python, Rust, Go, etc.). If it not specified, it will be generated automatically.',
      long: 'token',
      short: 't',
      type: optional(string),
    }),
    port: option({
      description: 'Specify a Port for your DIY Wechaty Puppet Service (WPS). If it not specified, it will select a free port automatically. This port MUST be public accessiable via the internet.',
      long: 'port',
      short: 'p',
      type: optional(number),
    }),
    puppet: option({
      description: 'Specify a Wechaty Puppet Provider (WPP). If it not specified, it will use the environment variable `WECHATY_PUPPET`.',
      long: 'puppet',
      short: 'P',
      type: optional(string),
    }),
    puppetToken: option({
      description: 'Specify the WEchaty Puppet Provider TOKEN. If it not specified, it will use the environment variable `WECHATY_PUPPET_XXX_TOKEN` (`XXX` is your WPP name).',
      long: 'puppet-token',
      short: 'T',
      type: optional(string),
    }),
  },
  handler: async args => {
    log.info('TokenGateway', 'Wechaty version %s', VERSION)

    let {
      token,
      port,
      puppet,
      puppetToken,
    } = args

    /**
     * Token
     */
    if (!token) {
      log.info('TokenGateway', 'no `--token` specified, generating random Wechaty Puppet Service TOKEN ...')
      token = WechatyToken.generate('insecure')
    }
    log.info('TokenGateway', 'Wechaty Puppet Service TOKEN: %s', token)

    /**
     * Puppet Service Server Port
     */
    if (!port) {
      log.info('TokenGateway', 'no `--port` specified, selecting random free Wechaty Puppet Service Server Port ...')
      port = await getPort({
        port: 8788,
      })

    }
    log.info('TokenGateway', 'Wechaty Puppet Service Server Port: %d', port)

    /**
     * Puppet Provider
     */
    if (!puppet) {
      log.info('TokenGateway', 'no `--puppet` specified, reading from environment variable `WECHATY_PUPPET` for Wechaty Puppet Provider ...')
      puppet = process.env['WECHATY_PUPPET']
      if (!puppet) {
        log.info('TokenGateway', `environment variable "WECHATY_PUPPET" is not available. Using system default puppet "${PUPPET_NAME_DEFAULT}"`)
        puppet = PUPPET_NAME_DEFAULT
      }
    }
    if (!isPuppetModuleName(puppet)) {
      console.error(`The puppet name "${puppet}" is not a valid puppet name.`)
      console.error(`Valid puppet names are: ${Object.keys(PUPPET_DEPENDENCIES).join(', ')}`)
      return 1
    }
    log.info('TokenGateway', 'Wechaty Puppet Provider: %s', puppet)

    /**
     * Puppet Token
     */
    if (!puppetToken) {
      log.info('TokenGateway', 'no `--puppet-token` specified, reading from environment variable `WECHATY_PUPPET_TOKEN` for your Wechaty Puppet Provider ...')
      puppetToken = process.env['WECHATY_PUPPET_TOKEN']
      if (!puppetToken) {
        log.info('TokenGateway', 'WECHATY_PUPPET_TOKEN environment variable not available. Token disabled.')
      }
    }
    log.info('TokenGateway', 'Wechaty Puppet Provider Token: %s', puppetToken ? `"${puppetToken}"` : 'disabled')

    const wechaty = WechatyBuilder.build({
      name: 'TokenGateway',
      puppet,
      puppetOptions: {
        puppetToken,
      },
    })

    const options: IoClientOptions = {
      token,
      wechaty,
    }

    const client = new IoClient(options)

    client.start()
      .catch(onError.bind(client))

    const wechatyToken = new WechatyToken(token)
    let address
    while (true) {
      log.info('TokenGateway', 'Registering Wechaty Puppet Token Gateway Service Discovery ...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      address = await wechatyToken.discover()
      if (address) {
        log.info('TokenGateway', 'Registering Wechaty Puppet Token Gateway Service Discovery ... success')
        break
      }
      log.info('TokenGateway', 'Registering Wechaty Puppet Token Gateway Service Discovery ... timeout')
    }

    console.info(`

    Your have successfully ran Wechaty Token Gateway with the below settings:
      1. token: ${token}
      2. port: ${port}
      3. puppet: ${puppet}
      4. puppetToken: ${puppetToken || ''}

    The Wechaty Puppet Token Gateway Service Address is ${address.host}:${address.port}, please make sure it can be public accessed via the internet.

    You can save the below command to restore the token gateway in future:

    $ wechaty-puppet-token-gateway --token ${token} --port ${port} --puppet ${puppet} --puppet-token ${puppetToken || ''}

    You can set the below environment variables for your Wechaty program to use the DIY token provided by this gateway:
    __________________________________________________________________________
    $ export WECHATY_PUPPET=wechaty-puppet-service
    $ export WECHATY_PUPPET_SERVICE_TOKEN=${token}
    $ npm start

    Please file an issue if you found any bug or have feature request at https://github.com/wechaty/wechaty/issues
    Join the Wechaty Community Gitter Channel at https://gitter.im/wechaty/wechaty if you have any questions.

    `)

    return 0
  },
})

export { tokenGateway }

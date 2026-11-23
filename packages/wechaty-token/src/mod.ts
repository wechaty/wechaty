/**
 * Public entry point of `wechaty-token`: Wechaty token parsing and service
 * discovery (`WechatyToken`), the `wechaty://` gRPC name resolver
 * (`WechatyResolver`), the CLI commands (`cmds`), and the package `VERSION`.
 */
import { WechatyToken }     from './wechaty-token.ts'
import { WechatyResolver }  from './resolver-wechaty.ts'
import { VERSION }          from './version.ts'
import { cmds }             from './cli/mod.ts'

export {
  VERSION,
  WechatyToken,
  WechatyResolver,
  cmds,
}

/**
 * The `wechaty-token` CLI subcommands, keyed by name, for `bin/cli.ts`.
 */
import { generate } from './generate.ts'
import { discover } from './discover.ts'

const cmds = {
  discover,
  generate,
}

export {
  cmds,
}

/**
 * Bridge from this ESM package to the CommonJS stubs that protoc generates
 * into `out/`: the `puppet` and `google` aggregates and `codeRoot`, all from the
 * wrappers in `commonjs/`.
 */
import puppet from '../commonjs/generated/puppet.cjs'
import google from '../commonjs/generated/google.cjs'

import { codeRoot } from '../commonjs/code-root.cjs'

export {
  codeRoot,
  google,
  puppet,
}

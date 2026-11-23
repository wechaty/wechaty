/**
 * `codeRoot`: the package root (one level above this folder), so ESM code can
 * find `proto/` and `out/` both in the sources and in the packed `dist/esm/`.
 */
const path = require('path')

const codeRoot = path.join(
  __dirname,
  '..',
)

module.exports = {
  codeRoot,
}

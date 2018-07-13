import readPkgUp  from 'read-pkg-up'

const pkg = readPkgUp.sync({ cwd: __dirname }).pkg
export const VERSION = pkg.version

export { log } from 'brolog'

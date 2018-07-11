// tslint:disable:no-var-requires

import {
  log,
}               from 'brolog'

/**
 * VERSION
 */
let VERSION: string = '0.0.0'
try {
  VERSION = require('../../package.json').version
} catch (e) {
  VERSION = require('../package.json').version
}

/**
 * exports
 */
export {
  VERSION,
  log,
}

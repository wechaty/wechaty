/**
 * Modern Web Test Runner configuration for the packed browser consumer smoke test.
 *
 * Why this module exists:
 * Configures Modern Web Test Runner to execute the packed consumer smoke suite inside
 * headless Chromium. It ensures that the browser runner resolves bare imports strictly
 * from the consumer's installed `node_modules` under standard export conditions, with
 * workspace-only source mappings (`wechaty-source`) and Node polyfills deliberately absent.
 *
 * Architectural boundaries:
 * Loaded by Modern Web Test Runner (`wtr`). Configures the test server root directory,
 * Playwright Chromium launcher, and esbuild transpiler. Does NOT inject Node polyfills
 * (`rollup-plugin-node-polyfills`, `process`, `Buffer`).
 *
 * Relationships:
 * - `scripts/pack-browser-test.sh`: Launches WTR with this configuration.
 * - `scripts/fixtures/browser-consumer-smoke.ts`: The compiled test suite executed under this config.
 */
import path from 'node:path'
import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'

const consumerDir = process.env['CONSUMER_DIR'] || process.cwd()

/**
 * Resolves external dependency imports of event emitter and memory-card storage
 * stubs for browser environments without injecting Node polyfills.
 */
function consumerBrowserPlugin () {
  return {
    name: 'consumer-browser-resolver',
    resolveImport ({ source, context }) {
      if (source === 'node:events' || source === 'events') {
        return '/node_modules/wechaty-puppet/dist/esm/src/events/event-emitter.js'
      }
      if (source === '@pipeletteio/nop') {
        return '/__browser_nop_stub__.js'
      }
      if (source === 'ix/asynciterable/index.js') {
        return '/node_modules/ix/asynciterable/index.mjs'
      }
      if (context && context.path && context.path.includes('node_modules/memory-card/')) {
        if (source === 'fs' || source === 'node:fs') {
          return '/__browser_fs_stub__.js'
        }
        if (source === 'path' || source === 'node:path') {
          return '/__browser_path_stub__.js'
        }
      }
      return undefined
    },
    serve (context) {
      if (context.path === '/__browser_nop_stub__.js' || context.path.includes('@pipeletteio/nop')) {
        return {
          body: 'export function nop() {} export function isNop() { return false } export default { nop, isNop }',
          type: 'js',
        }
      }
      if (context.path === '/__browser_fs_stub__.js') {
        return {
          body: 'export default { existsSync: () => false, readFile: () => {} }; export const existsSync = () => false; export const readFile = () => {};',
          type: 'js',
        }
      }
      if (context.path === '/__browser_path_stub__.js') {
        return {
          body: 'export default { isAbsolute: () => false, resolve: (...args) => args.join("/") }; export const isAbsolute = () => false; export const resolve = (...args) => args.join("/");',
          type: 'js',
        }
      }
      return undefined
    },
    transform (context) {
      if (context.path && context.path.includes('xstate/es/environment.js')) {
        return {
          body: 'export var IS_PRODUCTION = false;',
        }
      }
      return undefined
    },
  }
}

export default {
  files: [
    path.join(consumerDir, 'browser-consumer-smoke.js'),
  ],
  rootDir: consumerDir,

  nodeResolve: {
    rootDir: consumerDir,
    exportConditions: ['browser', 'default'],
  },

  plugins: [
    consumerBrowserPlugin(),
    esbuildPlugin({
      target: 'es2022',
      ts: false,
    }),
  ],

  browsers: [
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    }),
  ],

  testFramework: {
    config: {
      timeout: 15000,
      ui: 'bdd',
    },
  },
}

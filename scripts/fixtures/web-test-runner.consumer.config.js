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

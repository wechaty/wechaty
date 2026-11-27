/**
 * Configuration for Modern Web Test Runner (@web/test-runner).
 *
 * Runs Wechaty unit tests natively inside headless Chromium as first-class in-browser
 * processes, mapping `node:test` and `node:assert/strict` to browser-safe shims and
 * polyfilling Node standard built-ins without modifying source test files.
 */
import path from 'path'
import { fileURLToPath } from 'node:url'
import { esbuildPlugin } from '@web/dev-server-esbuild'
import { playwrightLauncher } from '@web/test-runner-playwright'
import { fromRollup } from '@web/dev-server-rollup'
import nodePolyfills from 'rollup-plugin-node-polyfills'

import { browserTestFiles } from './web-test-runner.files.ts'

const poly = nodePolyfills()

/** Maps a resolved dependency file to its URL under the test server root. */
function browserModuleUrl (specifier) {
  const filePath = fileURLToPath(import.meta.resolve(specifier))
  return '/' + path.relative(process.cwd(), filePath).replace(/\\/g, '/')
}

/**
 * Custom dev-server plugin resolving Node test, assert, and runtime built-in specifiers
 * to browser shims.
 */
function browserShimsPlugin () {
  return {
    name: 'browser-shims-resolver',
    resolveImport ({ source }) {
      if (source === 'node:test' || source === 'test') {
        return '/tests/browser-shims/node-test.ts'
      }
      if (
        source === 'node:assert/strict' ||
        source === 'node:assert' ||
        source === 'assert/strict' ||
        source === 'assert'
      ) {
        return '/tests/browser-shims/assert.ts'
      }
      if (source === 'events/base') {
        return browserModuleUrl('rollup-plugin-node-polyfills/polyfills/events.js')
      }
      if (source === 'ix/asynciterable/index.js') {
        // rx-queue names the .js entry. Ix publishes this same API as ESM.
        return browserModuleUrl('ix/asynciterable/index.mjs')
      }
      if (source === 'mime') {
        return '/tests/browser-shims/mime.ts'
      }

      const cleanSource = source.startsWith('node:') ? source.slice(5) : source
      if (cleanSource === 'events') {
        return '/tests/browser-shims/events.ts'
      }
      const res = poly.resolveId(cleanSource)
      const id = typeof res === 'string' ? res : res?.id
      if (id) {
        return '/' + path.relative(process.cwd(), id).replace(/\\/g, '/')
      }

      return undefined
    },
  }
}

export default {
  files: browserTestFiles,

  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },

  plugins: [
    browserShimsPlugin(),
    fromRollup(nodePolyfills)(),
    esbuildPlugin({
      define: {
        'process.env.NODE_ENV': '"test"',
      },
      // The `fs` polyfill, which test fixtures import, loads JSON modules.
      json: true,
      target: 'es2022',
      ts: true,
    }),
  ],

  browsers: [
    playwrightLauncher({
      product: 'chromium',
    }),
  ],

  testFramework: {
    config: {
      timeout: 15000,
      ui: 'bdd',
    },
  },

  testRunnerHtml: (testFrameworkImport) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <script>
          window.global = window;
          window.setImmediate = function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            return setTimeout(function () { fn.apply(null, args); }, 0);
          };
          window.clearImmediate = function (id) {
            clearTimeout(id);
          };
          window.process = {
            env: { NODE_ENV: 'test' },
            version: 'v20.0.0',
            nextTick: function (cb) {
              var args = Array.prototype.slice.call(arguments, 1);
              queueMicrotask(function () { cb.apply(null, args); });
            },
            stdout: { write: function () {} },
            stderr: { write: function () {} },
          };
        </script>
      </head>
      <body>
        <script type="module" src="${testFrameworkImport}"></script>
      </body>
    </html>
  `,
}

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
      if (source === 'node:stream/promises' || source === 'stream/promises') {
        return '/tests/browser-shims/stream-promises.ts'
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
  files: [
    'tests/browser-shims/shims.test.ts',
    'packages/scopelet/src/**/*.test.ts',
    '!packages/scopelet/src/**/*.{native,integration}.test.ts',
    // These suites use the filesystem and subprocesses.
    '!packages/scopelet/src/{diagnostics,generation}.test.ts',
    'packages/wechaty-grpc/{src,tests/unit}/**/*.test.ts',
    // Raw .proto reads and the chunk adapters use local files and native Node streams.
    '!packages/wechaty-grpc/src/{proto,chunk-transformer}.test.ts',
    'packages/wechaty-puppet-service/{src,tests/unit}/**/*.test.ts',
    // Network server, TLS sockets, and gRPC streaming require native Node environment:
    // grpc-manager requires @connectrpc/connect-node HTTP/2 client (browser transport follow-up in #3110).
    '!packages/wechaty-puppet-service/src/client/{grpc-manager,puppet-service}.test.ts',
    // ca.test.ts tests https.createServer and TLS certs on Node.
    '!packages/wechaty-puppet-service/src/auth/ca.test.ts',
    // normalize-filebox tests local filesystem reads and native stream buffers.
    '!packages/wechaty-puppet-service/src/file-box-helper/normalize-filebox.test.ts',
    // puppet-server and mod export/start Node http2 servers.
    '!packages/wechaty-puppet-service/src/{server/puppet-server,mod}.test.ts',
    // Deprecated streaming chunk transformers rely on stronger-typed-streams (media streaming follow-up in #3111).
    '!packages/wechaty-puppet-service/src/deprecated/**/*.test.ts',
    // Full simulation and integration suites spin up native HTTP/2 gRPC servers over TCP ports.
    '!packages/wechaty-puppet-service/tests/unit/**/*.test.ts',
    'packages/wechaty-puppet/{src,tests/unit}/**/*.test.ts',
    // This suite looks up installed ESM providers by package name using the native module loader.
    '!packages/wechaty-puppet/src/puppet/puppet-resolver.test.ts',
    'packages/wechaty-puppet-mock/src/**/*.test.ts',
    'packages/wechaty-token/src/**/*.test.ts',
    // The main token entry exports the native CLI and gRPC resolver.
    '!packages/wechaty-token/src/{mod,resolver-wechaty}.test.ts',
    'packages/wechaty/{src,scripts,tests/unit}/**/*.test.ts',
    // Native test cases in mixed suites are colocated separately. Integration
    // tests exercise real TCP and WebSocket servers.
    '!packages/wechaty/src/**/*.{native,integration}.test.ts',
    // These suites use filesystem metadata or subprocesses.
    '!packages/wechaty/src/{cli/gateway,puppet-config}.test.ts',
    // The legacy Io transport and public entry that exports it are server-side.
    '!packages/wechaty/src/{io,io-client,io-peer/io-peer,mods/mod}.test.ts',
  ],

  nodeResolve: {
    exportConditions: ['wechaty-source', 'browser', 'development'],
  },

  plugins: [
    browserShimsPlugin(),
    fromRollup(nodePolyfills)(),
    esbuildPlugin({
      define: {
        'process.env.NODE_ENV': '"test"',
      },
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

/**
 * Inventory of unit test files executed in headless Chromium via Modern Web Test Runner.
 *
 * Defines the complete inclusion and exclusion patterns governing browser test execution
 * across all workspace packages in the Wechaty monorepo.
 */
export const browserTestFiles: string[] = [
  'tests/browser-shims/shims.test.ts',
  'packages/scopelet/src/**/*.test.ts',
  '!packages/scopelet/src/**/*.{native,integration}.test.ts',
  // These suites use the filesystem and subprocesses.
  '!packages/scopelet/src/{diagnostics,generation}.test.ts',
  'packages/wechaty-grpc/{src,tests/unit}/**/*.test.ts',
  // Raw .proto reads and the chunk adapters use local files and native Node streams.
  '!packages/wechaty-grpc/src/{proto,chunk-transformer}.test.ts',
  'packages/wechaty-puppet-service/{src,tests/unit}/**/*.test.ts',
  // Native code and cases: LMDB folders, file boxes from local paths.
  '!packages/wechaty-puppet-service/src/node/**/*.test.ts',
  '!packages/wechaty-puppet-service/src/**/*.native.test.ts',
  // TLS certificates and an https server.
  '!packages/wechaty-puppet-service/src/auth/ca.test.ts',
  // GrpcManager and PuppetServer, and the package entry that exports them, need
  // the Node.js HTTP/2 transport (browser transport: #3110).
  '!packages/wechaty-puppet-service/src/client/{grpc-manager,puppet-service}.test.ts',
  '!packages/wechaty-puppet-service/src/{server/puppet-server,mod}.test.ts',
  // Chunk adapters over stronger-typed-streams, i.e. native Node streams (media: #3111).
  '!packages/wechaty-puppet-service/src/deprecated/{chunk-pb,conversation-id-file-box,file-box-chunk,file-box-pb}.test.ts',
  // Simulations that connect a PuppetService to a PuppetServer over a TCP port.
  // Listed one by one so that a new suite runs in Chromium unless it is classified here.
  '!packages/wechaty-puppet-service/tests/unit/{conversation-read,grpc-client,grpc-stream,integration}.test.ts',
  '!packages/wechaty-puppet-service/tests/unit/{message-stream,performance,ready-event,uuid-file-box}.test.ts',
  '!packages/wechaty-puppet-service/tests/unit/simulation-{core-rpc,event-stream,resiliency}.test.ts',
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
]

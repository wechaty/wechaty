/**
 * Browser-portable entry point for `wechaty-puppet-mock/tck`.
 *
 * Exports only Web-Standard / WinterTC-compatible helpers (`createMockWorld`)
 * with no `node:*` imports so Chromium and browser bundles resolve cleanly.
 */

export {
  createMockWorld,
  type MockWorld,
  type MockWorldOptions,
  type MockWorldTestContext,
} from './harness/mock-world.ts'

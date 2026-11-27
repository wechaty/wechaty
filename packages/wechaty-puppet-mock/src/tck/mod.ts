/**
 * Public entry point for `wechaty-puppet-mock/tck`.
 *
 * Exports the Puppet SPI TCK runner (`runPuppetTCK`) and the reusable
 * `createMockWorld` simulation harness.
 */

export {
  runPuppetTCK,
  type PuppetTCKOptions,
} from './puppet-tck.ts'
export {
  createMockWorld,
  type MockWorld,
  type MockWorldOptions,
  type MockWorldTestContext,
} from './harness/mock-world.ts'

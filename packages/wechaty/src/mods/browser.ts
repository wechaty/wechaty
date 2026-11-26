/**
 * Browser-compatible public entry point for Wechaty (`wechaty/browser`).
 *
 * Why this module exists:
 * Exposes the Wechaty SDK for in-browser execution (such as headless Chromium or browser-based
 * bot environments) where Node.js built-ins (`node:*`), process globals, and native server
 * transports (`PuppetServer`, `IoClient`) are absent. Users supply an explicit Puppet instance
 * (such as `PuppetMock` or a browser-compatible gRPC-web puppet) and reuse the full Wechaty
 * builder, event bridge, and user modules.
 *
 * Architectural boundaries:
 * Part of `wechaty`. Exports browser-safe classes, user interfaces, types, and helpers.
 * Deliberately excludes server-side I/O clients and CLI entry points.
 *
 * Relationships:
 * - `wechaty/browser`: Public package export mapped in `package.json`.
 * - `wechaty-builder.ts`: Wechaty builder used to instantiate bots with explicit puppets.
 * - Issue #3108: Run a local Wechaty bot natively in the browser (Stage 3 under Epic #3104).
 */

export {
  Wechaty,
  type WechatyOptions,
  type WechatyState,
  type LegacyStateView,
  legacyStateView,
} from '../wechaty/mod.ts'
export {
  WechatyBuilder,
  type BuilderInterface,
} from '../wechaty-builder.ts'

export type {
  SayableSayer,
  Sayable,
} from '../sayable/mod.ts'

export * as types from 'wechaty-puppet/types'
export * as payloads from 'wechaty-puppet/payloads'

export * from './users.ts'
export * as users from './users.ts'
export * as impls from './impls.ts'
export * as helpers from './helpers.ts'
export {
  ScanStatus,
} from 'wechaty-puppet/types'

export {
  log,
  config,
  qrcodeValueToImageUrl,
  VERSION,
} from '../config.ts'

export type {
  WechatyEventName,
} from '../schemas/mod.ts'

export type {
  OfficialPuppetNpmName,
  PuppetModuleName,
} from '../puppet-config.ts'

export type {
  WechatyPlugin,
  WechatyPluginUninstaller,
} from '../plugin.ts'

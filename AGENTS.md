# Instructions for coding agents

## Project

Wechaty is a TypeScript SDK for building chatbots across messaging platforms. This
repository contains the Wechaty core, not the implementations of individual
messaging protocols. Keep changes focused, preserve existing behavior and public
API compatibility, and update directly related documentation and tests.

## Start here

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for the current toolchain and workflow.
- Check [package.json](package.json), [tsconfig.json](tsconfig.json), and CI
  workflows for authoritative versions, scripts, and compiler settings.
- Locate the public exports in `src/mods/` and `package.json` before changing an
  API. Additions may need updates to both exports and type declarations.
- Search existing implementations and specs before introducing a new pattern.
  Avoid generated output (`dist/`), coverage reports, and `node_modules/`.

## Architecture and ecosystem

- `src/wechaty/` composes the bot lifecycle and mixins; inspect the composition
  order in `wechaty-base.ts` before changing lifecycle, plugin, I/O, or Puppet
  behavior.
- `src/user-modules/` implements public entities such as `Contact`, `Message`,
  and `Room`; `src/user-mixins/` provides shared entity behavior.
- `src/schemas/` defines public options and typed events. Keep event names,
  payloads, and listener types consistent across schemas, implementation, and
  tests.
- `wechaty-puppet` is a separate ecosystem package that defines the protocol
  abstraction. Wechaty plugins (`bot.use(...)`) and Puppet providers are
  different extension points; do not conflate them or add provider-specific
  protocol logic to the core without a clear cross-platform requirement.
- Before changing provider compatibility or installation behavior, check
  `src/puppet-config.ts`, `package.json`, and `bin/puppet-install.ts` together.
  Provider availability and feature support can change; do not copy old provider
  lists or assume every provider supports every operation.

Useful upstream references:

- [Wechaty Puppet specification](https://wechaty.js.org/docs/specs/puppet)
- [Puppet provider directory](https://wechaty.js.org/docs/puppet-providers/)
- [Puppet compatibility](https://wechaty.js.org/docs/puppet-services/compatibility/)
- [Puppet development guide](https://wechaty.js.org/docs/puppet-providers/diy)
- [`wechaty-puppet` contract source](https://github.com/wechaty/puppet)
- [Wechaty getting-started examples](https://github.com/wechaty/getting-started)

Use upstream documentation for ecosystem context, but verify behavior against
this checkout and the current `wechaty-puppet` dependency. Provider tables and
older README examples can become stale; do not treat them as implementation
contracts.

## TypeScript and implementation

- This package is ESM-only and requires Node.js 26+ and npm 10+; use `import`,
  not CommonJS `require('wechaty')`.
- Follow strict TypeScript settings. Keep types precise; avoid `any` and unsafe
  casts unless existing interop requires them.
- Use explicit `.js` extensions for relative imports, matching the NodeNext
  ESM source.
- Preserve typed event and Puppet payload contracts. A feature should work
  independently of the selected provider unless the API explicitly documents
  provider-specific support.
- Follow existing mixin, logging, error propagation, and lifecycle patterns.
  Do not swallow failures or change start/stop semantics incidentally.
- Keep dependency changes and `package-lock.json` in sync. Do not edit compiled
  files or regenerate large artifacts unless the task requires it.

## Tests and validation

- Unit tests live beside source as `*.spec.ts` and under `tests/`; they use
  `tstest`/TAP. Prefer a focused regression test and `wechaty-puppet-mock` over
  network or real-account integration tests.
- For behavior changes, run the narrowest relevant test first, then the
  applicable build or lint checks. Before handing off, report commands run and
  any validation that could not be completed.
- Common checks:

  ```sh
  npm run test:unit
  npm run build
  npm run lint
  npm test
  ```

  `npm test` runs linting and unit tests with coverage. Use `npm ci` only when
  setting up dependencies or after dependency changes.

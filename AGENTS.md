# Instructions for coding agents

- Use node:test for a shared Node.js/Deno test suite; collect coverage natively in both runtimes, publish LCOV and HTML reports as GitHub Actions artifacts, and enforce independent, measured coverage regression baselines without third-party coverage services.
- Name all unit test files *.test.ts and colocate them with their source modules. Use *.integration.test.ts or *.e2e.test.ts only for broader tests requiring separate execution. Write portable tests using node:test and node:assert/strict, and ensure the shared unit test suite runs under both Node.js and Deno.

## Project

Wechaty is a TypeScript SDK for building chatbots across messaging platforms.
This repository is the Wechaty core, not the messaging protocol implementations.
Keep changes focused, preserve behavior and public API compatibility, and update
directly related tests and documentation.

When sources disagree, trust them in this order:

1. This checkout: code, specs, [package.json](package.json), and CI workflows.
2. The installed `wechaty-puppet` package in `node_modules/`.
3. Upstream documentation, which mostly describes Wechaty v1. See
   [Stale sources](#stale-sources).

## Git and releases

Read this before running `git push`.

- `npm install` and `npm ci` install [scripts/pre-push.ts](scripts/pre-push.ts)
  through `core.hooksPath`.
- Ordinary feature pushes, including the first `git push -u origin <branch>`,
  run lint and leave the version, `HEAD`, and tags unchanged. A lint failure
  blocks that push and leaves the repository unchanged.
- Versioning is limited to a checked-out release branch (`main` or
  `v<major>.<minor>…`, the npm publish pattern in `.github/workflows/npm.yml`).
  The live update must name that source and one eligible release destination.
  The nested push is
  `git push --no-follow-tags <remote-url> <source>:<destination>`, so the first
  push publishes that destination before an upstream exists and leaves other
  refs unchanged. After that commit is pushed, the original push **exits 1 by
  design**. Check `git status -sb` and the remote before retrying.
- The hook rejects, before `npm version`, multiple live branch updates that
  include a release branch, any release update whose source is not the
  checked-out release branch, and release pushes to a remote with more than
  one push URL.
  Those pushes leave the version, `HEAD`, and tags unchanged. Tag-only and
  deletion-only pushes skip versioning. `NO_HOOK=1` skips the hook.
- Never edit the version by hand. Never push tags, `main`, or `v*` branches
  unless asked. Pushes to `main` and `v*` branches can publish to npm and Docker.
- Use [Conventional Commits](https://conventionalcommits.org/) and complete
  [the PR checklist](.github/PULL_REQUEST_TEMPLATE.md). Discuss new features and
  API changes in an issue first, and reference the issue in the PR.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/wechaty/` | `WechatySkeleton`, `WechatyBase`, `WechatyImpl`, and mixin composition |
| `src/wechaty-mixins/` | Bot mixins: puppet events, plugins, login, I/O, errors, user module binding |
| `src/user-modules/` | Public entities such as `Contact`, `Room`, `Message`, and `Post` |
| `src/user-mixins/` | Entity mixins: `poolify`, `wechatify`, `validation` |
| `src/sayable/` | Conversion and delivery of sendable values |
| `src/schemas/` | Options and typed events |
| `src/mods/` | Public entry points: `mod.ts`, `impls.ts`, `users.ts`, `helpers.ts` |
| `src/cli/`, `bin/` | CLI commands and package binaries |
| `src/io*.ts`, `src/io-peer/` | Legacy Io service; avoid adding to it |

Avoid `dist/`, `coverage/`, and `node_modules/`, except when
reading dependency contracts.

## Lifecycle invariants

Read the composition in
[src/wechaty/wechaty-base.ts](src/wechaty/wechaty-base.ts) before changing
lifecycle code. The order, from innermost to outermost, is `WechatySkeleton`,
`gErrorMixin`, `wechatifyUserModuleMixin`, `ioMixin`, `puppetMixin`, `loginMixin`,
`miscMixin`, `pluginMixin`, `serviceCtlMixin`. `serviceCtlMixin` must stay
outermost.

- `start()` runs `init()`, starts Io, starts the puppet, runs `onStart()`, then
  emits `start`. `stop()` runs `onStop()`, stops the puppet, then stops Io.
- `init()` runs more than once per start, so keep it idempotent.
- A `puppet.start()` timeout (15 seconds) logs a warning and continues. This
  tolerates buggy providers; do not change it incidentally.
- Other puppet start failures are emitted as `error`. With a listener, `start()`
  resolves. With no listener, the emit throws and `start()` rejects.
- `bot.Contact` and similar getters, and `bot.puppet`, throw until `init()` has
  finished. Inside the `puppet` event, use the listener argument, because
  `bot.puppet` is not set yet.
- Treat the `puppet` event as a compatibility surface: `wechaty-redux` uses it.

## User modules

- Follow the naming pattern: `XxxMixin`, `XxxImpl` (value), `XxxInterface` (type),
  `XxxConstructor` (type), and `XxxProtectedProperty` where needed.
- Reach classes through the bot: `bot.Room`, or `this.wechaty.Room` inside a
  module. An unbound `RoomImpl.load()` throws, and each bot has its own pools.
- Use `XxxInterface` in public signatures. Check values with `XxxImpl.valid()` or
  `validInstance()`, not new `instanceof` checks.
- `load()` only returns the pooled instance. It does not fetch a payload.
- To add a bot-bound module, update its file, `src/user-modules/mod.ts`,
  `src/wechaty-mixins/wechatify-user-module-mixin.ts`, `src/mods/impls.ts`,
  `src/mods/users.ts`, and `src/wechaty/wechaty-impl.test.ts`.
- To add a sayable type, update `src/sayable/types.ts`, `deliver-sayable.ts`,
  `sayable-to-payload.ts`, `payload-to-sayable.ts`, and `message-to-sayable.ts`.

## Public API

- The package exports `.`, `./impls`, and `./users`. Keep `exports`,
  `typesVersions`, and `src/mods/` consistent, then run `npm run test:pack`.
- `WechatyInterface` omits `_`-prefixed members automatically. Add any other
  internal member to the relevant `*ProtectedProperty` union.
- To add an event, update `src/schemas/wechaty-events.ts`, the entity event schema
  if relevant, the switch in `src/wechaty-mixins/puppet-mixin.ts`, and tests.
- That switch throws at runtime on an unknown event, and the compiler does not
  catch this. When upgrading `wechaty-puppet`, compare `PUPPET_EVENT_DICT` against
  the switch.
- Keep deprecated APIs unless removal is the task, even if their stated removal
  date has passed.
- Polyglot SDKs mirror this API, so call out any public API change in the PR.

## Ecosystem boundaries

| Extension point | Rule |
| --- | --- |
| Plugin | A function `(bot) => void \| uninstaller`, usually returned by an options factory, and installed with `bot.use()`. It receives the bot as an argument, not as `this`. Reusable plugins belong in `wechaty-plugin-contrib` or their own package. |
| Puppet provider | A separate `wechaty-puppet-*` package that extends `PUPPET.Puppet` and default-exports the class. Use `wechaty-puppet-mock` as the reference. Do not add protocol logic to the core without a clear cross-platform requirement. |
| Puppet service | A provider that connects over gRPC. Treat its tokens as credentials. |

- Providers do not all support every operation, and unsupported calls can throw.
  Let those errors reach the caller instead of faking success.
- When changing provider lists or versions, check `src/puppet-config.ts`,
  `package.json`, `bin/puppet-install.ts`, and `scripts/npm-pack-testing.sh`
  together.
- Never commit or log tokens, `*.memory-card.json`, or `*.wechaty.json` session
  files. Do not use real accounts or tokens in tests.

## TypeScript and style

- Reference GitHub Actions by version tags (for example, `@v6`), not commit hashes.
- The package is ESM-only and needs the Node.js and npm versions in `engines`.
  Node.js runs the `.ts` sources directly; only packaging compiles to `dist/`.
  Relative imports must end in `.ts`; `rewriteRelativeImportExtensions` emits
  `.js` paths in compiled JavaScript.
- `erasableSyntaxOnly` is enabled: no enums, namespaces with values, or
  constructor parameter properties. Declare a field and assign it instead.
- Compiler flags to expect: use `override`, `process.env['NAME']`, and `import type`
  for types. Indexed access may be `undefined`.
- `verbatimModuleSyntax` is enabled; mark type-only imports with `import type` or
  inline `type` modifiers, and keep runtime side-effect imports explicit.
- Avoid new `any` and unsafe casts. Existing ones sit mostly at mixin boundaries.
- Biome's formatter is off, so match nearby style by hand: two spaces, no
  semicolons, and a space before method parentheses.
- Import order can matter because of circular dependencies. See the `Huan(...)`
  comments in `src/wechaty/wechaty-base.test.ts` and `src/mods/mod.ts`.
- Log with `log.verbose('Module', 'method(%s)', arg)` from `wechaty-puppet`, and
  use `log.silly` for detail. Use `info`, `warn`, and `error` sparingly.
- Keep existing `Huan(YYYYMM):` comments, but do not write new comments in a
  maintainer's name.

## Tests and validation

Test sources use `node:test` and `node:assert/strict`. `npm test` runs the full
suite on Node.js from the TypeScript sources after linting, with no build step.
The same suite also runs under Deno, which is experimental and not a supported
runtime; provide the Node executable for subprocess fixtures:

```sh
NODE_BINARY="$(command -v node)" npm run test:unit:deno
```

Run a focused Node test file with:

```sh
npm run test:unit:file -- src/plugin.test.ts
```

Run one Deno test file with:

```sh
NODE_BINARY="$(command -v node)" npm run test:unit:deno:file -- src/plugin.test.ts
```

- Unit tests sit beside the source as `*.test.ts`, or under `tests/unit/`, and import
  `test` from `node:test` and assertions from `node:assert/strict`.
- Broader tests live under `tests/integration/` or `tests/e2e/` and use
  `*.integration.test.ts` or `*.e2e.test.ts` respectively.
- Always set the puppet explicitly, usually `new PuppetMock()`, and use
  `puppet.mocker` for data. The default puppet is a real protocol.
- Register `t.after()` cleanup before starting a bot, and stop it before the test
  completes, or timers can keep the test process alive.
- Register an `error` listener when a test exercises failure paths.
- CI runs on Linux, macOS, and Windows, so keep tests portable.
- The pre-push integration tests use a 180-second test timeout and per-command
  subprocess timeouts.

| Change | Check |
| --- | --- |
| Any TypeScript | `npm run lint:ts` and `npm run lint:biome` |
| Exports, packaging, or binaries | `npm run test:pack` (uses network) |
| Shell scripts | `npm run test:shell` (not part of `npm test`) |
| Dockerfiles or entrypoint | `./scripts/docker.sh build` and `./scripts/docker.sh test` |
| Markdown | `npx markdownlint <file>` (`npm run lint:md` only checks the README) |
| Before handoff | `npm test`, plus `npm run build` if the change could affect emitted output |

Before handing off, report the commands you ran and anything you could not run.

Do not commit a regenerated `src/package-json.ts`.
`scripts/generate-package-json.sh` overwrites it for publishing, and
`src/package-json.test.ts` fails on the result. Commit `package-lock.json` with
dependency changes.

## Stale sources

Check these against the code before relying on them:

- In this repo: `docs/index.md` (the archived v0.62.1 API reference), README API
  tables, and JSDoc using `new Wechaty()` or `this: Wechaty`.
- [Getting started](https://github.com/wechaty/getting-started): targets Wechaty
  v1 and Node.js 16.
- [Breaking changes](https://wechaty.js.org/docs/references/breaking-changes):
  stops at 2021 and does not cover v2.
- [Puppet development guide](https://wechaty.js.org/docs/puppet-providers/diy):
  imports `Puppet` from `wechaty`, which this checkout does not export.
- [Plugin spec](https://wechaty.js.org/docs/specs/plugin): an early proposal that
  uses `this`.
- [Provider directory](https://wechaty.js.org/docs/puppet-providers/) and
  [compatibility table](https://wechaty.js.org/docs/puppet-services/compatibility/):
  use for context, not as implementation contracts.

## References

- [Specifications](https://wechaty.js.org/docs/specs/) and
  [Puppet specification](https://wechaty.js.org/docs/specs/puppet)
- [`wechaty-puppet`](https://github.com/wechaty/puppet) and
  [`wechaty-puppet-mock`](https://github.com/wechaty/puppet-mock)
- [`wechaty-plugin-contrib`](https://github.com/wechaty/plugin-contrib)
- [Polyglot SDKs](https://wechaty.js.org/docs/polyglot/)
- [DEVELOPMENT.md](DEVELOPMENT.md) and [CONTRIBUTING.md](CONTRIBUTING.md)

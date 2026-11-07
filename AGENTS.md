# Instructions for coding agents

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
  through `core.hooksPath`. The hook has no branch check.
- With an upstream set, `git push` runs lint, creates a version commit and local
  tag, pushes the commit, then **exits 1 by design**. Check
  `git status -sb` and the remote before retrying, because the push may have
  worked.
- Without an upstream, `git push -u origin <branch>` creates the version commit
  and tag, then fails with nothing pushed. Each retry adds another bump, and the
  leftover tags can make pushes from other branches refuse to run.
- For a review branch, run `npm run lint`, then
  `NO_HOOK=1 git push -u origin <branch>`. This keeps version bumps out of pull
  requests.
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

Avoid `dist/`, `coverage/`, `.nyc_output/`, and `node_modules/`, except when
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
  `src/mods/users.ts`, and `src/wechaty/wechaty-impl.spec.ts`.
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

- The package is ESM-only and needs the Node.js and npm versions in `engines`.
  Use `import` and explicit `.js` extensions for relative imports.
- Compiler flags to expect: use `override`, `process.env['NAME']`, and `import type`
  for types. Indexed access may be `undefined`.
- Avoid new `any` and unsafe casts. Existing ones sit mostly at mixin boundaries.
- Biome's formatter is off, so match nearby style by hand: two spaces, no
  semicolons, and a space before method parentheses.
- Import order can matter because of circular dependencies. See the `Huan(...)`
  comments in `src/wechaty/wechaty-base.spec.ts` and `src/mods/mod.ts`.
- Log with `log.verbose('Module', 'method(%s)', arg)` from `wechaty-puppet`, and
  use `log.silly` for detail. Use `info`, `warn`, and `error` sparingly.
- Keep existing `Huan(YYYYMM):` comments, but do not write new comments in a
  maintainer's name.

## Tests and validation

Run the narrowest test first:

```sh
NODE_OPTIONS=--import=tsx/esm npx tap --no-coverage src/plugin.spec.ts
```

- Specs sit beside the source as `*.spec.ts`, or under `tests/`, and import `test`
  and `sinon` from `tstest`.
- Always set the puppet explicitly, usually `new PuppetMock()`, and use
  `puppet.mocker` for data. The default puppet is a real protocol.
- Call `await wechaty.stop()` in each test that starts a bot, or timers can keep
  the test process alive.
- Register an `error` listener when a test exercises failure paths.
- CI runs on Linux, macOS, and Windows, so keep tests portable.

| Change | Check |
| --- | --- |
| Any TypeScript | `npm run lint:ts` and `npm run lint:biome` |
| Exports, packaging, or binaries | `npm run test:pack` (uses network) |
| Shell scripts | `npm run test:shell` (not part of `npm test`) |
| Dockerfiles or entrypoint | `./scripts/docker.sh build` and `./scripts/docker.sh test` |
| Markdown | `npx markdownlint <file>` (`npm run lint:md` only checks the README) |
| Before handoff | `npm run build` and `npm test` |

Before handing off, report the commands you ran and anything you could not run.

Do not commit a regenerated `src/package-json.ts`.
`scripts/generate-package-json.sh` overwrites it for publishing, and
`src/package-json.spec.ts` fails on the result. Commit `package-lock.json` with
dependency changes.

## Stale sources

Check these against the code before relying on them:

- In this repo: `tests/README.md` (v0.17 output), `docs/index.md`,
  `shippable.yml`, the no-op `.github/workflows/coverage.yml`, README API tables,
  and JSDoc using `new Wechaty()` or `this: Wechaty`.
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

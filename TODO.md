# TODO: AsyncLifecycle migration (paused)

**Status: paused on 2026-11-21 by @huan.** `Io` and `IoClient` were migrated. The rest waits until the module has proven itself in `Io`.

The goal ([#2905](https://github.com/wechaty/wechaty/issues/2905)) is to retire `state-switch` and hand-written `start` / `stop` / `reset` from every async layer of Wechaty, using one lifecycle module.

## Where we are

Paths in this file are relative to `packages/wechaty/` unless they start with `.github/`.

| Part | State |
| --- | --- |
| Design | RFC [#2905](https://github.com/wechaty/wechaty/issues/2905) and API design [#2911](https://github.com/wechaty/wechaty/issues/2911). The convergence of three prototypes into one module is done ([#2968](https://github.com/wechaty/wechaty/issues/2968), stages S1–S6). Its §6 is the decision log (D1–D43) |
| Module | `packages/wechaty/src/async-lifecycle/`, published as `wechaty/async-lifecycle` and marked **experimental**. It has no runtime dependencies and imports nothing outside its directory |
| Contract | [`packages/wechaty/src/async-lifecycle/README.md`](packages/wechaty/src/async-lifecycle/README.md): every rule has an ID (`C-CMD-04`, …) that the tests and the TSDoc cite |
| Tests | The contract suite (`src/async-lifecycle/contract/`), unit tests, and examples that run as tests (`examples/io`, `puppet`, `wechaty`), all under both Node.js and Deno. The loopback socket tests run only with `ASYNC_LIFECYCLE_TCP_TEST=1`, which CI sets |
| Coverage | The module has its own floors in `.github/coverage-baselines/{node,deno}.wechaty.async-lifecycle.json`, enforced by `packages/wechaty/scripts/coverage.ts` |
| Adopters | `Io` (`src/io.ts`, a subclass of `AsyncLifecycle`) and `IoClient` (`src/io-client.ts`, built with `createLifecycle`), migrated in [#3022](https://github.com/wechaty/wechaty/issues/3022) / PR #3026 |
| Still on `state-switch` | `Wechaty` (`src/wechaty/wechaty-base.ts`, `src/wechaty-mixins/`), the Puppet base (`wechaty-puppet` repo), and PuppetService / PuppetServer (`wechaty-puppet-service` repo) |

## Before resuming, check

- **Io in real use:** reconnecting with backoff against the real cloud or gateway, the buffer surviving `stop()` / `start()`, and `sys` going out first on every connection.
- **API pressure:** has any fix needed a change to the module, rather than to Io? So far, none has.
- **Open follow-ups:** [#3029](https://github.com/wechaty/wechaty/issues/3029).

## Next steps, in order

1. **[#3029](https://github.com/wechaty/wechaty/issues/3029) Io follow-ups.** Can be done at any time:
   - `login` and `logout` send `{}`;
   - `syncMessage()` is never called;
   - a stalled peer during `stop()`;
   - whether to ship a test clock.
2. **[#3021](https://github.com/wechaty/wechaty/issues/3021) Extract the module into a standalone package (D20).** Needs @huan's decision on the package name and the repository. Blocks steps 4 and 5, because `wechaty` depends on `wechaty-puppet`, not the other way round.
3. **[#3023](https://github.com/wechaty/wechaty/issues/3023) Migrate `Wechaty`.** It is in this repo, so it does not need #3021. Start from `src/async-lifecycle/examples/wechaty.example.ts`; its test pins the legacy shims (`reset()`, `state.active()`, the `'start'` / `'stop'` / `'error'` events). One open decision: keep creating a new Io on each start, or make the Io a child of the bot (`scope.start(io)`).
4. **[#3024](https://github.com/wechaty/wechaty/issues/3024) Migrate the Puppet base** in `wechaty-puppet`. Start from `examples/puppet.example.ts`.
5. **[#3025](https://github.com/wechaty/wechaty/issues/3025) Migrate PuppetService and PuppetServer.** They need their own session protocol: cancelling a gRPC call does not prove the server released anything (README §17).
6. **Finish.**
   - Remove the "Experimental" note once the API is frozen.
   - Drop `state-switch` from `package.json`.
   - Close #2905.

## Decisions already made (do not reopen without @huan)

- **D7:** the kernel has the mechanism only; retry, backoff and supervision live in hooks.
- **D20:** published as a subpath now; extracted into a standalone package later (#3021).
- **D21:** child ownership uses one registry per JS realm.
- **D24:** the legacy shims live in the integration layer; in-flight work uses the `operation` companion.
- **D35:** a failed start rejects when the failure is decided; `failed` is committed only after cleanup.
- **D42:** `scope.recover()` returns `'accepted' | 'superseded' | 'failed'` synchronously.
- **D43:** `node:diagnostics_channel` is looked up at runtime; where it is missing, as in a browser, diagnostics do nothing.
- **Runtimes:** Wechaty targets Node.js, Deno and the browser, so keep Node-only built-ins out of core code.
- **Io is a transport:**
  - its event buffer belongs to the instance and survives reconnects, `stop()` / `start()` and `restart()`;
  - events whose send fails are put back, in order;
  - the buffer is capped at 1000 events, dropping the oldest;
  - a first `start()` makes one connection attempt; only a recovery retries, with backoff of 1 s, 3 s, 9 s, … capped at 30 s;
  - `IoClient.quit()` is a deprecated alias of `stop()`.

## Lessons from the Io migration

- **A `ws` socket is also an `EventTarget`.** `listen()` prefers `addEventListener`, which passes one event object instead of `ws`'s arguments. Use `on` / `off` with `scope.defer` for `ws`.
- **Fakes hide bugs.** A fake must behave like the real thing (the fake socket now implements `addEventListener`). For any real transport, add a loopback integration test.
- **Mind the microtask gaps.** Between an `open` event and adding the run's handlers, a socket can close. Check its state in the same synchronous step that adds the handlers, inside the `acquire` creation: a rejected creation leaves the scope owning nothing.
- **`recover()` before `running` fails the generation** (C-REC-03). To retry, loop inside `onStart` under `scope.signal` (C-REC-06).
- **Bound the work in `onStop`.** The bot keeps emitting while a run retires, and the stop deadline is 10 s.
- **Shared async state needs one owner.** Run one flush at a time, and clear its flag in the same synchronous step as its last check.

## How we work

- Follow [`AGENTS.md`](AGENTS.md): `node:test` and colocated `*.test.ts` files, ESM, `.ts` import suffixes, file headers and TSDoc kept accurate.
- Before writing code, agree the plan with @huan.
- For every PR:
  - rebase onto `main` before each push;
  - wait for the Codex, Copilot and Claude reviews;
  - fix every valid finding with a regression test that fails on the previous commit;
  - reply to and resolve each thread, and keep the PR body current;
  - @huan merges.
- Checks: `npm run lint`, `npm run test:unit` (with `ASYNC_LIFECYCLE_TCP_TEST=1` for the loopback tests), `npm run test:unit:deno`, `npm run coverage:node`, `npm run coverage:deno`.

## Kickoff prompt for the next agent

Paste this into a fresh session to resume:

```text
You are resuming the AsyncLifecycle migration in the Wechaty repository (github.com/wechaty/wechaty). Work with @huan, the maintainer: propose a plan and wait for approval before you write code.

GOAL
Retire `state-switch` and hand-written start/stop/reset from every async layer of Wechaty (Wechaty, Puppet, PuppetService, PuppetServer, Io), using one lifecycle module. Root RFC: #2905. API design: #2911. The convergence into one module is done (#2968, stages S1–S6; its §6 is the decision log D1–D43).

ARCHITECTURE (src/async-lifecycle/, published as `wechaty/async-lifecycle`, experimental)
- Model: callers state intent (start/stop/restart). One reconciler per instance commits state, one step at a time. Each start attempt creates a generation with its own scope. onStart acquires everything through the scope, and the scope records it in an ownership ledger. Retirement follows a fixed order (C-RET-01): seal the scope, run onStop (only if the generation reached running), abort, interrupt, wait for onStart, join the tasks, release newest first, then commit. The state says truthfully whether everything was released. A callback from an old generation holds a sealed scope.
- State: stopped, starting, running, stopping, failed. A recovery goes running → stopping → starting, never through stopped or failed.
- Entry points: `createLifecycle(hooks, options)` for composition, when the class keeps another base such as an EventEmitter; `abstract class AsyncLifecycle` for inheritance. Both share one engine. The caller API (state, start, stop, restart, whenState, Symbol.asyncDispose) is sealed.
- Scope: acquire, use, defer, spawn, start(child), set/clear (conditions), fail, recover. recover() returns 'accepted' | 'superseded' | 'failed' synchronously, and returns 'failed' before `running`.
- Companions: listen (event listeners for one generation), watchdog, operation (in-flight work across stop).
- Files: types.ts (public contract), engine.ts (the only writer of state), generation.ts (scope), ledger.ts (obligations), condition.ts, clock.ts, diagnostics.ts (node:diagnostics_channel looked up at runtime), errors.ts, companions/, mod.ts, examples/ (io, puppet, wechaty; each runs as a test).
- No runtime dependencies, nothing imported from outside the directory, portable to Node.js, Deno and the browser.

SOURCES OF TRUTH: READ THESE FIRST
1. TODO.md at the repository root: status, next steps, decisions, lessons.
2. src/async-lifecycle/README.md: the contract. Rule IDs such as C-REC-03 are cited by the tests and the TSDoc. To change a rule, change the README, log a decision in #2968 §6, and update the tests that cite it.
3. AGENTS.md: coding, test and documentation rules.
4. src/io.ts and src/io-client.ts: the one finished migration, the pattern to follow.
5. Issues #3021, #3023, #3024, #3025 (migration) and #3029 (Io follow-ups).

CURRENT STATE
Io and IoClient are migrated (#3022). Wechaty, the Puppet base (wechaty-puppet repo) and PuppetService/PuppetServer (wechaty-puppet-service repo) still use state-switch. The migration was paused to see how the module holds up in Io.

FIRST STEPS
1. Check `git log origin/main` and the open issues for anything that changed since TODO.md was written.
2. Run npm run lint, npm run test:unit, npm run test:unit:deno and ASYNC_LIFECYCLE_TCP_TEST=1 npm run test:unit. Report anything that fails.
3. Ask @huan which step to take next. The default order is #3029, then #3021 (it needs @huan's package name and repository), then #3023, #3024, #3025. Propose a plan for that step and wait for approval.

RULES
- Rebase onto main before every push. For each PR, wait for the Codex, Copilot and Claude reviews, and fix every valid finding with a regression test that fails on the previous commit. Reply to and resolve each thread, and keep the PR body current. @huan merges.
- Never quote a commit hash you have not printed.
- Do not reopen the decisions listed in TODO.md without @huan.
```

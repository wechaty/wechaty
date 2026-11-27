# TODO: AsyncLifecycle (`scopelet`) Migration

**Status:** Core migration **complete** across all layers (`Io`, `IoClient`, `Puppet`, `PuppetService`, `PuppetServer`, and `Wechaty`). `state-switch` and all legacy mixin towers have been retired ([#2905](https://github.com/wechaty/wechaty/issues/2905), [#2938](https://github.com/wechaty/wechaty/issues/2938), [#3189](https://github.com/wechaty/wechaty/issues/3189)).

## Where we are

Paths in this file are relative to the repository root.

| Part | State |
| --- | --- |
| Design | RFC [#2905](https://github.com/wechaty/wechaty/issues/2905), API design [#2911](https://github.com/wechaty/wechaty/issues/2911), and ScopeLet v2 ADRs (`packages/scopelet/README.md`). |
| Module | `packages/scopelet/`, published as `scopelet` in lockstep with the other packages. Zero runtime dependencies. |
| Contract | [`packages/scopelet/README.md`](packages/scopelet/README.md): every rule has an ID (`C-CMD-04`, …) cited by tests and TSDoc. |
| `Io` & `IoClient` | Migrated in [#3022](https://github.com/wechaty/wechaty/issues/3022) / PR #3026 (`packages/wechaty/src/io.ts`, `packages/wechaty/src/io-client.ts`). |
| `Puppet` (`wechaty-puppet`) | Migrated in [#3024](https://github.com/wechaty/wechaty/issues/3024) / PR #3197 and upgraded to ScopeLet v2 in PRs #3231, #3244, #3245, #3246. |
| `PuppetService` & `PuppetServer` | Migrated in [#3025](https://github.com/wechaty/wechaty/issues/3025) / PRs #3234, #3235, #3236 (`GrpcManager` child lifecycle + `scope.recover()`, `PuppetServer` `AsyncLifecycle`). |
| `Wechaty` (`wechaty`) | Migrated in [#3023](https://github.com/wechaty/wechaty/issues/3023) / PR #3206 and consolidated in PRs #3232, #3238 (`useScoped()`), #3239 (`bindUserModule`), #3242, #3244, #3247–#3249. |
| `state-switch` & Mixins | Retired across all 7 workspace packages (`#3206`, `#3237`, `#3244`, `#3247`–`#3249`). |

## Remaining follow-ups

1. **[#3029](https://github.com/wechaty/wechaty/issues/3029) Io follow-ups:**
   - `login` and `logout` send `{}`;
   - `syncMessage()` is never called;
   - stalled peer during `stop()`;
   - whether to ship a test clock.
2. **Release readiness:**
   - Remove the "Experimental" note from `scopelet` once APIs are frozen.
   - Close [#2905](https://github.com/wechaty/wechaty/issues/2905), [#2938](https://github.com/wechaty/wechaty/issues/2938), and [#3189](https://github.com/wechaty/wechaty/issues/3189).

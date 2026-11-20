# Contract suite inventory

Where every test of the three comparison suites, and every other required case, went in the shared contract suite (S2, [#2970](https://github.com/wechaty/wechaty/issues/2970)).

The rule from [#2968](https://github.com/wechaty/wechaty/issues/2968): if one implementation tests a case, the final module tests it too. A source test is either **ported**, naming the contract test key that covers it, or **dropped**, giving the reason. S2 is done when every source test appears below.

## Progress

| Source | Cases | Ported | Dropped | Remaining |
| --- | --- | --- | --- | --- |
| `src/async-lifecycle-codex/*.test.ts` | 63 tests (154 cases) | 61 | 2 (1 dropped, 1 moved to S5) | 0 |
| `src/async-lifecycle-claude/*.test.ts` | 113 tests (208 cases) | 99 (83 new, 16 already covered) | 14 moved to S4 | 0 |
| `src/async-lifecycle-copilot/*.test.ts` | 32 scenarios | 0 | 0 | 32 |
| #2905 traces A to F | 6 | 0 | 0 | 6 |
| v1 design acceptance list | 6 | 0 | 0 | 6 |
| ChatGPT review, 17-row regression table | 17 | 0 | 0 | 17 |
| #2968 §5 bugs | 3 | 3 | 0 | 0 |

## Required bug regressions

| Bug | Contract test | Clauses | Known failure for |
| --- | --- | --- | --- |
| B1 | `B1` in `bugs.test.ts`; also `C-CMD-09.a`, `C-RET-02.a`, `C-CHILD-06.a`, `C-TIME-02.a-success`, `C-TIME-02.c` | C-OBS-01, C-CMD-09 | copilot |
| B2 | `B2` in `bugs.test.ts` | C-REC-05, D19 | claude (codex lacks `scope.recover`) |
| B3 | `B3` in `bugs.test.ts` | C-RET-03, D8 | codex |

Bugs found while porting, each recorded in the adapter's `knownFailures` and in #2968 §5:

| Bug | Implementation | What | Shown by |
| --- | --- | --- | --- |
| B4 | copilot | A condition wait created right after `stop()` is satisfied by the retiring generation | `C-COND-02.a` |
| B5 | copilot | A failed late release on a retired scope is never called again; `stop()` rejects with the old error forever | `C-SCOPE-08.a`, `C-SCOPE-09.a`, `C-SCOPE-09.b` |
| B6 | copilot | A cleanup error (a failed release, or an `onStop` rejection after the stop deadline) rejects `stop()` but is missing from the failed snapshot's `cleanupError` | `C-TIME-03.b`, `C-CMD-10.a` |
| B7 | claude | A start timeout settles only after retirement, so `start()` is not bounded by its deadline and an abort-listener command supersedes it | `C-TIME-02.*` |
| B8 | copilot | A `start()` then `stop()` in the same tick still runs `onStart`, so pre-start condition waits resolve instead of rejecting | `C-COND-04.b2` |
| B9 | codex | A task that rejects while its generation retires is swallowed, so `stop()` resolves instead of reporting a cleanup error | `C-SCOPE-07.d` |
| B10 | copilot | A `stop()` or `restart()` does not wait for a cleanup registered during its own retirement: it rejects at once, and the state stays `failed` after the cleanup finishes | `C-SCOPE-02.d-*` |

## Conflicts

Source tests that assert behavior contradicting an accepted decision. Each is ported in the decided form.

| Source test | Conflict | Decision |
| --- | --- | --- |
| codex: stop from the start timeout listener; restarting during startup; start deadline reports dirty failure | Expected `onStop` for a generation that never reached `running` | D8: no `onStop`; ported without it |
| codex: start deadline reports dirty failure until the same startup hook settles | Expected an immediate dirty `failed` and a refused `start()` | C-RET-01 step 5, C-TIME-02: `stopping` while waiting for the hook; a `start()` queues |
| codex: a task failure interrupts startup and parks the failed attempt | Expected phase `run` before `running` | C-STATE-05: phase `start` |
| codex: conditions are local to their owner | Expected a foreign condition to be silently ignored | C-COND-01: `TypeError` |
| codex, claude, copilot: condition wait on a failed generation | All reject with the failure or a plain `Error` | D28: `LifecycleSupersededError` with the failure as `cause` |
| claude: a deadline that is not a finite, non-negative number is refused | Accepts 0 | D11: 0 is refused |
| claude: recover() rejects when the replacement fails; recover() before running | Rejects | D10: resolves `failed` |
| claude: a user start() during recovery supersedes it and still runs | The recovery reports `superseded` | C-REC-03: the start joins the replacement and the recovery reports `recovered`. Copilot also supersedes, so this is D37 for confirmation |
| claude: #2905 C: stop() aborts a pending abort-aware onStart at once | Requires the abort synchronously inside `stop()` | Not in the contract (C-CMD-01 requires only synchronous intent); ported as "aborted before onStart settles" |
| claude: an acquisition that resolves after retirement began | Requires `acquire()` to reject before the release runs | C-SCOPE-04 requires both, not an order |
| codex, claude: inheritance rejects command overrides | Throw a plain `Error` | D13: `LifecycleOverrideError` |
| codex: start waiting for detached cleanup joins the surviving run | `start()` on a running generation waits for an old late release | C-CMD-04: it resolves at once (D31 makes only new generations wait) |
| codex: a parent cannot claim a child's queued start / restart; a clean failed child with an accepted stop cannot be claimed | Refuses through private knowledge of the child's pending command | D33: decided by public state alone |
| codex: a start deadline reports dirty failure; claude: an onStart that ignores its timeout | A failed start rejects only after cleanup | D35: it rejects when the failure is decided |

## Ported and dropped tests

One table per source suite, added as each is ported.

### Codex (`src/async-lifecycle-codex/`, #2914)

63 distinct tests (154 cases: most run through both entry points, some in several variants). Ported: 61 (18 of them after D30 to D37 were accepted). Dropped: 1. Moved to S5: 1.

`async-lifecycle.test.ts`:

| Source test | Status | Contract test |
| --- | --- | --- |
| concurrent start joins one attempt | ported | `C-CMD-03.a` |
| stop supersedes a pending start and late start completion does not publish running | ported | `C-CMD-07.a` |
| reentrant stop from onStateChange does not convert finished start into rejection | ported | `C-OBS-03.a` |
| throwing whenState predicate rejects only that waiter | ported | `C-CMD-16.a` |
| failed clean start can be stopped and retried | ported | `C-CMD-09.a` |
| restart superseded by stop ends stopped | ported | `C-CMD-11.a` |
| condition wait before start binds to next generation and rejects on failed generation | ported, D28 form | `C-COND-04.a` |
| retired generation fail and set calls are ignored | ported | `C-SCOPE-02.a` |
| owned child unexpected stop fails parent generation | ported | `C-CHILD-05.a` |

`kernel.test.ts`:

| Source test | Status | Contract test or reason |
| --- | --- | --- |
| startup budget includes synchronous work (2 variants) | ported, D30 | `C-TIME-05.a-before`, `C-TIME-05.a-after` |
| queued microtasks cannot publish running after the startup deadline | ported, D30; sweeps the turn at which time passes, instead of the source's count tuned to its kernel | `C-TIME-05.d-start` |
| a detached release failure interrupts startup and preserves the failing cleanup (2) | ported, D31 (simplified: the start fails with the release error and leaves debt) | `C-SCOPE-11.c-reject` |
| queued restart reports the detached disposer error before starting a replacement | ported, D31 | `C-SCOPE-11.d` |
| stop from the start timeout listener observes cleanup (3) | ported, D8 form (no onStop) | `C-TIME-02.a-*` |
| start / restart from a timeout listener waits for the expired generation to retire (2) | ported | `C-TIME-02.b-*` |
| replacement startup handles detached cleanup (5) | ported, D31 | `C-SCOPE-11.c-*` |
| stop / fail retires active resources while a detached release is blocked (2) | ported, D31 | `C-SCOPE-11.e-stop`, `C-SCOPE-11.e-fail` |
| a parent cannot claim a child's independently queued start / restart (2) | ported, D33 form (decided by public state) | `C-CHILD-01.c-start`, `C-CHILD-01.c-restart` |
| a stopped child can be claimed after its detached release settles | ported, D31 | `C-SCOPE-11.i` |
| a clean failed child with an accepted stop cannot be claimed | ported, D33 form | `C-CHILD-01.c-stop-after-failure` |
| a replacement child remains owned until a subsequent parent stop releases it | ported, D32 | `C-CHILD-07.a` |
| stop / restart joins a late registration at retirement completion (6) | ported (the generation is still retiring, so C-SCOPE-02, not D31); exact microtask interleavings belong to S3 | `C-SCOPE-02.d-*` |
| restart includes retirement from the instant it is accepted (3) | ported, D30, C-TIME-03 | `C-TIME-05.c-starting`, `C-TIME-05.c-running`, `C-TIME-05.c-late` |
| a replacement gets a fresh retirement budget after detached cleanup | ported, D31 | `C-SCOPE-11.l` |
| a stop joining detached cleanup receives the same deadline outcome | ported, D31, D30 (the joiner arriving after the release settled is part of the sweep) | `C-SCOPE-11.j`, `C-TIME-05.d-stop-late` |
| stop checks its deadline before committing cleanup (2) | ported, D30; sweeps the turn at which time passes after the release settled. `C-TIME-05.b` adds time passing inside the release | `C-TIME-05.b`, `C-TIME-05.d-stop-active`, `C-TIME-05.d-stop-late` |
| one stop deadline spans the active hook and detached releases | ported, D31 | `C-SCOPE-11.k` |
| stop supersedes pre-start condition waits (2) | ported | `C-COND-04.b1`, `C-COND-04.b2` |
| a pre-aborted stop leaves the next generation's condition waits intact | ported | `C-COND-04.c` |
| stop superseding a queued replacement also rejects its condition waits | ported | `C-COND-04.d` |
| a condition wait created during retirement binds to the next generation | ported | `C-COND-02.a` |
| late registrations sharing a disposer are independently retried | ported | `C-SCOPE-08.a` |
| a run failure survives a late release (2) | ported, D31 (without the owner-level recover) | `C-SCOPE-11.g-*` |
| start waiting for detached cleanup joins or is superseded (2) | ported, D31 and C-CMD-04 form (a start() on a running generation resolves at once) | `C-SCOPE-11.h-*` |
| restart gracefully retires the old generation before a joined start | ported | `C-CMD-11.c` |
| reentrant start from startup abort waits for the interrupted generation to retire | ported | `C-CMD-06.a` |
| restarting during startup retires the interrupted hook before replacement | ported, D8 form (no onStop) | `C-CMD-11.b` |
| one worker handles stop from a starting observer | ported, D34 | `C-OBS-03.b` |
| a failed observer can restart without inheriting the old failure | ported | `C-OBS-03.c` |
| a task failure interrupts startup and parks the failed attempt | ported, C-STATE-05 form (phase `start`) | `C-SCOPE-07.a` |
| caller abort cancels only one wait and preserves an arbitrary reason | ported | `C-CMD-01.a`, `C-CMD-02.a` |
| stop deadline preserves one hook barrier and live resources | ported | `C-TIME-03.a` |
| a late stop-hook rejection stays observed and is reported once | ported | `C-TIME-03.b` |
| start deadline reports dirty failure until the same startup hook settles | ported, C-TIME-02 form (`stopping`, start queues, no onStop) | `C-TIME-02.c` |
| a timed-out disposer is joined, and only failed entries are retried | ported | `C-TIME-03.c` |
| the stop deadline includes task joins and keeps their resources live | ported | `C-TIME-03.d` |
| a throwing stop hook rejects after the other releases run | ported | `C-RET-02.a` |
| abort interrupts I/O, tasks finish with live resources, then disposers run in reverse | ported | `C-RET-01.a` |
| abort seals the scope before a callback can register a resource | ported (`adopt` → `defer`) | `C-SCOPE-02.b` |
| a detached scope's failed late release blocks startup and can be retried | ported | `C-SCOPE-09.a` |
| child startup is canceled before parent startup is joined | ported | `C-CHILD-03.a` |
| a rejected child start fails its parent without an extra rejection | ported | `C-CHILD-06.a` |
| each failed snapshot can authorize its own recovery | ported as `scope.recover()` | `C-REC-02.a` |
| stop supersedes an accepted recovery before its replacement can run | ported as `scope.recover()` | `C-REC-03.a` |
| a runtime failure settles an owned stop retry after dirty cleanup | ported | `C-RET-04.a` |
| an owned child propagates its committed failure cause to its parent | ported | `C-CHILD-05.b` |
| a stopped child remains owned until its first parent retires it | ported | `C-CHILD-02.a` |
| a three-level mix of the facades starts top-down and retires nested resources in reverse | ported, one entry point per run; the mixed variant needs cross-entry-point construction (next S2 PR) | `C-CHILD-04.a` |
| a failure observer cannot recover over a stop accepted in that same observer | dropped: owner-level `recover(observed)` is not in S1; "a user command wins" is covered by `C-REC-03.a` | |
| inheritance rejects command overrides from intermediate classes and class fields | ported, D13 form | `C-SHELL-02.a`, `C-SHELL-02.b` |
| conditions are local to their owner and stale generations cannot make a replacement ready | ported, C-COND-01 form (`TypeError`) | `C-COND-01.a`, `C-COND-04.e`, `C-COND-05.a` |
| diagnostics are synchronous, post-commit, and structural | ported, merged with the Claude diagnostics test | `C-OBS-04.a` |

`socket.integration.test.ts`:

| Source test | Status | Reason |
| --- | --- | --- |
| abort closes a connected socket and the waiting task finishes before disposal (opt-in TCP, 2 entry points) | moved to S5 | Real I/O belongs in consumer validation (#2973); the ordering it checks is `C-RET-01.a` |

### Claude (`src/async-lifecycle-claude/`, #2913)

113 distinct tests (208 cases: the 95 engine tests run through both entry points). Ported: 83 (3 after D30 to D37 were accepted). Already covered by an earlier contract test: 16. Moved to S4: 14.

`engine.test.ts`:

| Source test | Status | Contract test or reason |
| --- | --- | --- |
| start → running → stop → stopped, one generation per attempt | ported | `C-STATE-01.a` |
| restart goes running → stopping → starting → running with reason restart | ported | `C-CMD-11.d` |
| restart from stopped behaves like start | ported | `C-CMD-12.a` |
| start() while running resolves without a new generation (#2905 A) | ported | `C-CMD-04.a` |
| #2905 A: stop() in flight, then two start()s: one onStart, never concurrent | ported | `C-CMD-06.b` |
| a caller abort cancels only that wait, never the accepted intent | covered | `C-CMD-02.a` |
| a caller abort fired while the command aborts a starting run is honoured | ported | `C-CMD-02.b` |
| a caller that aborted early never leaves a later cleanup failure unhandled | ported | `C-CMD-02.c` |
| an already-aborted signal rejects before any intent is accepted | ported | `C-CMD-01.a`, `C-CMD-01.b` |
| #2905 C: stop() aborts a pending abort-aware onStart at once | ported; the "synchronously inside stop()" part is not in the contract (C-CMD-01 requires only synchronous intent) | `C-CMD-07.b` |
| #2905 C: an onStart that ignores abort and resolves late never publishes running | ported | `C-CMD-07.c` |
| stop → start during a gated onStart starts a fresh generation | ported | `C-CMD-06.c` |
| a start() from an abort listener gets its own attempt, not the superseded one | covered | `C-CMD-06.a` |
| restart during a gated start retires it before the replacement | covered | `C-CMD-11.b` |
| concurrent restart() calls share one replacement | ported | `C-CMD-03.b` |
| a start() from an abort listener during restart joins the restart | ported | `C-CMD-11.e` |
| a stop() from an abort listener during restart supersedes the restart | ported | `C-CMD-11.f` |
| restart() followed by stop() ends stopped; restart() followed by start() does not hang | ported | `C-CMD-11.g` |
| #2905 D: a failed onStart publishes failed { start } and is not retried | ported | `C-CMD-14.a` |
| #2905 E: a failed onStart rejects the condition waits bound to it | covered, D28 form | `C-COND-04.a` |
| falsy rejection values are failures, kept as given | ported | `C-STATE-05.a` |
| scope.fail(undefined) and a task throwing undefined fail the run | ported | `C-REC-01.a`, `C-SCOPE-07.a` (while starting), `C-SCOPE-07.c-undefined` (while running) |
| a failed release leaves a dirty failure that refuses start and is retried by stop() | ported | `C-CMD-10.a` |
| a release that keeps failing runs once per explicit stop(), never spins | ported | `C-CMD-10.b` |
| a stop() that supersedes a gated start cleans up once and stays dirty until asked again | ported | `C-CMD-10.c` |
| a dirty restart rejects its replacement and starts nothing | ported | `C-RET-06.a` |
| superseded startup with failing cleanup rejects its condition waits | ported | `C-COND-04.f` |
| every release runs when one throws; several errors aggregate | ported | `C-RET-04.b` |
| onStop runs with live resources, before scope.signal aborts, with a deadline signal | ported | `C-RET-01.d` |
| onStop is not called for a run that never reached running | ported | `C-RET-03.a` |
| onStop receives failure and recover reasons | ported | `C-RET-02.b` |
| a throwing onStop is reported, but released resources make the failure clean | ported | `C-RET-02.c` |
| an onStop rejecting with undefined is a cleanup failure, not success | ported | `C-RET-02.d` |
| acquire, use, child, task and defer unwind in strict reverse order | ported | `C-RET-01.c` |
| cleanup registered after a child still sees that child running | ported | `C-RET-01.b` |
| use() accepts AsyncDisposable and Disposable and refuses anything else | ported | `C-SCOPE-06.a` |
| acquire records ownership before create and passes scope.signal | ported | `C-SCOPE-04.a` |
| an acquisition that resolves after retirement began is released and acquire rejects | ported; order of the two not required by C-SCOPE-04 | `C-SCOPE-04.b` |
| a failed create releases nothing | ported | `C-SCOPE-04.c` |
| interrupt unblocks a dependent task before it is joined | ported | `C-SCOPE-05.a` |
| an acquisition finishing after the interrupt pass is interrupted before release | ported | `C-SCOPE-05.b` |
| a late interrupt that throws is reported as a cleanup error | ported | `C-SCOPE-05.c` |
| a sealed scope releases late registrations at once and refuses new work | ported | `C-SCOPE-02.c` |
| a failing late release after retirement becomes debt until stop() clears it | covered | `C-SCOPE-09.a` |
| debt from a retired generation is retried by the next retirement | ported, D31 (the running generation keeps running; its stop() or restart() retries the debt) | `C-SCOPE-11.f-*` |
| a stop() settles when debt clears on its own | ported | `C-SCOPE-09.b` |
| a stop() during a debt pass joins it and requests no extra pass | ported | `C-RET-05.a` |
| debt released after joined work failed reports that failure | ported, D36 | `C-SCOPE-09.c` |
| a spawned task gets scope.signal, aborted on retirement, and is joined | ported | `C-SCOPE-07.b` |
| a spawned task rejection fails the running generation | ported | `C-SCOPE-07.c-error` |
| a task failing while retiring is reported once as a cleanup error | ported | `C-SCOPE-07.d` |
| scope.start refuses a child that is not stopped or cleanly failed | ported | `C-CHILD-01.a` |
| two parents cannot adopt the same child | ported | `C-CHILD-01.b` |
| a child whose stop failed stays owned until its owner retries successfully | ported | `C-CHILD-02.b` |
| a child exiting on its own fails the parent with the child error as cause | ported | `C-CHILD-05.c` |
| a child that recovers itself does not fail its parent | ported | `C-CHILD-05.d` |
| a parent stopping during child startup cancels the child | covered | `C-CHILD-03.a` |
| three nested levels across both shells start in order and stop in reverse | ported | `C-CHILD-04.b` |
| a wait made before start binds to the next generation | covered | `C-COND-04.c` |
| stop() before any start rejects pre-start waits | covered | `C-COND-04.b1` |
| set is a level: later waits resolve at once, clear blocks again | ported | `C-COND-03.a` |
| a condition result never crosses generations | covered | `C-COND-05.a` |
| a wait made during stopping binds to the replacement | ported | `C-COND-02.b` |
| a retiring or stale scope cannot set conditions | ported | `C-COND-05.b` |
| a condition declared on another lifecycle is refused | covered | `C-COND-01.a` |
| a failing run rejects its condition waits with the failure | ported, D28 form | `C-COND-04.g` |
| whenState resolves now, on a later snapshot, or rejects on a throwing predicate | ported | `C-CMD-16.b` |
| whenState rejects on caller abort without affecting the service | ported | `C-CMD-16.c` |
| whenState rejects when its first predicate call aborts the caller | ported | `C-CMD-16.d` |
| scope.recover() replaces a running generation with no stopped or failed between | ported | `C-REC-02.b` |
| a stale scope cannot recover a newer run | covered | `C-REC-03.c` |
| #2905 B: a user stop() during recovery wins | ported | `C-REC-04.a` |
| a user start() during recovery supersedes it and still runs | ported, C-REC-03 form (the start joins; pending D37) | `C-REC-04.b` |
| a user start() while the recovery replacement is starting joins it | ported | `C-REC-04.c` |
| a start() joined to a recovery still rejects when stop() supersedes it | ported | `C-REC-04.d` |
| an owned task may trigger recovery with void scope.recover() | ported | `C-REC-05.a` |
| recover() rejects when the replacement fails or retirement is dirty | ported, D10 form (resolves `failed`) | `C-REC-03.d` |
| recover() before running behaves like fail() and is safe to ignore | covered, D10 form | `C-REC-03.b` |
| startTimeoutMs fails the attempt with LifecycleTimeoutError and aborts the scope | ported | `C-TIME-02.d` |
| a deadline that is not a finite, non-negative number is refused | ported, D11 form (0 refused) | `C-TIME-01.a` |
| stopTimeoutMs bounds a stop() that waits on an onStart ignoring abort | ported | `C-TIME-03.e` |
| an onStart that ignores its timeout keeps the generation dirty until it settles | ported | `C-TIME-03.f` |
| stopTimeoutMs bounds a hanging release and the next stop() joins it | ported | `C-TIME-03.g` |
| one stop() has one deadline for joining earlier work and retrying | ported, D36 | `C-TIME-03.h` |
| an onStop past its deadline stays tracked and blocks a clean retirement | covered | `C-TIME-03.a` |
| observer exceptions are isolated | covered | `C-OBS-02.a` |
| an observer stop() on running does not reject the completed start | covered | `C-OBS-03.a` |
| an observer stop() on a dirty failure gets its own outcome | ported | `C-OBS-03.d` |
| a start() accepted during failure cleanup starts a replacement | ported | `C-OBS-03.e` |
| a hook calling stop() synchronously never runs a second reconciler | ported | `C-OBS-03.f` |
| stop() on a clean failure commits stopped | covered | `C-CMD-09.a` |
| an observer stop() on a clean failure resolves only once stopped is committed | ported | `C-OBS-01.a` |
| an observer stop() on starting means onStart is never called | ported, D34 | `C-OBS-03.b` |
| await using stops the lifecycle | ported | `C-CMD-15.a` |
| #2905 F: start/stop ×3 never accumulates listeners | ported with `on` plus `defer(off)`; the `listen` companion is S4 | `C-SCOPE-03.a` |

Other files:

| Source | Status | Contract test or reason |
| --- | --- | --- |
| `async-lifecycle.test.ts`: a prototype override of a caller-API member throws at construction | ported, D13 form (`LifecycleOverrideError`) | `C-SHELL-02.a` |
| `async-lifecycle.test.ts`: a class-field override of a caller-API member throws at construction | ported | `C-SHELL-02.b` |
| `async-lifecycle.test.ts`: caller-API members are own, non-writable properties | ported | `C-SHELL-02.c` |
| `diagnostics.test.ts`: records carry kind, generation and phase, never errors | ported, merged with the Codex diagnostics test | `C-OBS-04.a` |
| `ledger.test.ts` (6 tests) | moved to S4 | White-box tests of Claude's internal `Ledger`. They become unit tests of the final kernel's ledger if S4 adopts it; the behavior they protect is covered by `C-SCOPE-09.*`, `C-TIME-03.*` and `C-RET-01.*`. |
| `companions/listen.test.ts` (5 tests) | moved to S4 | Companions land with their implementation (D26) |
| `companions/watchdog.test.ts` (3 tests) | moved to S4 | Companions land with their implementation (D26) |

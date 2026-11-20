# Contract suite inventory

Where every test of the three comparison suites, and every other required case, went in the shared contract suite (S2, [#2970](https://github.com/wechaty/wechaty/issues/2970)).

The rule from [#2968](https://github.com/wechaty/wechaty/issues/2968): if one implementation tests a case, the final module tests it too. A source test is either **ported**, naming the contract test key that covers it, or **dropped**, giving the reason. S2 is done when every source test appears below.

## Progress

| Source | Cases | Ported | Dropped | Remaining |
| --- | --- | --- | --- | --- |
| `src/async-lifecycle-codex/*.test.ts` | 63 tests (154 cases) | 61 | 2 (1 dropped, 1 moved to S5) | 0 |
| `src/async-lifecycle-claude/*.test.ts` | 113 tests (208 cases) | 99 (83 new, 16 already covered) | 14 moved to S4 | 0 |
| `src/async-lifecycle-copilot/*.test.ts` | 32 tests (one bundles 31 scenarios) | 26 (15 new, 11 already covered) | 6 moved to S4 | 0 |
| #2905 traces A to F | 6 | 6 (new, in `traces.test.ts`) | 0 | 0 |
| v1 design acceptance list (§6 of the v1 comment) | 6 | 6 (3 new, 3 already covered) | 0 | 0 |
| #2911 §9 acceptance traces | 18 | 17 (5 new, 12 already covered) | 1 moved to S5 | 0 |
| ChatGPT review, 17-row regression table | 17 | 17 (1 new, 16 already covered) | 0 | 0 |
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
| B11 | codex | A `stop()` accepted while an earlier `stop()` retires does not reject the condition waits created in between; they survive and bind to the next generation | `C-COND-04.h` |
| B12 | codex | Overriding `state` or `Symbol.asyncDispose` in an `AsyncLifecycle` subclass is not refused, so the override silently replaces the caller API | `C-SHELL-02.d-state`, `C-SHELL-02.d-asyncDispose` |

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
| claude: a user start() during recovery supersedes it and still runs; copilot: the same, twice in its bundled #2905 test | The recovery reports `superseded` | C-REC-03 (D37): the start joins the replacement and the recovery reports `recovered` |
| claude: #2905 C: stop() aborts a pending abort-aware onStart at once | Requires the abort synchronously inside `stop()` | Not in the contract (C-CMD-01 requires only synchronous intent); ported as "aborted before onStart settles" |
| claude: an acquisition that resolves after retirement began | Requires `acquire()` to reject before the release runs | C-SCOPE-04 requires both, not an order |
| codex, claude: inheritance rejects command overrides | Throw a plain `Error` | D13: `LifecycleOverrideError` |
| codex: start waiting for detached cleanup joins the surviving run | `start()` on a running generation waits for an old late release | C-CMD-04: it resolves at once (D31 makes only new generations wait) |
| codex: a parent cannot claim a child's queued start / restart; a clean failed child with an accepted stop cannot be claimed | Refuses through private knowledge of the child's pending command | D33: decided by public state alone |
| codex: a start deadline reports dirty failure; claude: an onStart that ignores its timeout | A failed start rejects only after cleanup | D35: it rejects when the failure is decided |
| copilot: failure reported during startup unwind; three scenarios of its bundled #2905 test | `fail()` from a release, from an `onStart` that saw the abort, or during a recovery's retirement fails the generation, overriding the stop or recovery | C-SCOPE-02: a sealed scope ignores `fail()` |
| copilot: recovery requester added during unwind | A task calling `recover()` while a recovery retires joins it as another requester, exempt from the join, and the recovery reports `failed` when it then rejects | C-REC-03, C-REC-05: it gets `superseded` and is joined as usual |
| copilot: late cleanup debt stays attached after a replacement starts | A late release that fails while generation 2 runs fails generation 2 | D31 (C-SCOPE-11): the run continues; its `stop()` retries the debt |
| copilot: a late release on an idle instance (bundled #2905 test) | A `start()` during the late release is refused | C-SCOPE-11: it queues behind the release (C-CMD-06) |
| copilot: runtime failures retire the generation | `stop()` on the clean failure leaves `failed` | B1; C-CMD-09: it commits `stopped` |
| copilot: timed-out interrupts resume in LIFO order | Each interrupt is awaited before the next is called | D38: every interrupt is called at once; a returned promise is joined like a task |
| copilot: owned child failures remain supervised during graceful parent shutdown | A child that stops unasked while the parent retires fails the parent | D39: no escalation while the parent retires; the parent stops it as usual |

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

### Copilot (`src/async-lifecycle-copilot/`, #2912)

32 tests, all in `async-lifecycle.test.ts`. Ported: 15 (as 33 new contract tests; 3 after D38 and D39 were accepted). Already covered: 11. Moved to S4: 6.

| Source test | Status | Contract test or reason |
| --- | --- | --- |
| manual clock orders due timers, handles reentrant timers, and clears deadlines | moved to S4 | White-box test of Copilot's clock and deadline controller; deadline validation is `C-TIME-01.a` |
| abort helpers preserve caller isolation and report deadline outcomes | moved to S4 | White-box test of Copilot's abort helpers; the behavior is `C-CMD-01.a`, `C-CMD-02.a` |
| condition registry isolates generations and rejects foreign conditions | moved to S4 | White-box test of Copilot's `ConditionRegistry`; the behavior is `C-COND-01.*`, `C-COND-04.b1`, `C-COND-04.e`, `C-COND-05.a`. Its blank-name `TypeError` is not in the contract |
| createLifecycle serializes start, stop, restart, conditions, and observers | covered | `C-STATE-01.a`, `C-CMD-04.a`, `C-CMD-11.d`, `C-OBS-02.a`, `C-RET-01.d`, `C-COND-04.b1` |
| whenState resolves with the snapshot inspected by its initial predicate | ported | `C-CMD-16.e` |
| start-stop-start retires an interrupted startup before creating a fresh scope | covered | `C-CMD-06.a`, `C-CMD-06.c` |
| stop-start while running preserves the retirement barrier and both attempts | covered | `C-CMD-06.b` |
| restart during incomplete startup settles the old attempt and starts one replacement | covered | `C-CMD-11.b` |
| failure reported during startup unwind overrides clean stop supersession | ported, C-SCOPE-02 form (the `fail()` is ignored) | `C-SCOPE-02.e-release` |
| recovery requester failure during the final disposer fails recovery | ported | `C-REC-05.b-during-release` |
| recovery requester added during unwind is included in error collection | ported, C-REC-03 and C-REC-05 form (the late caller gets `superseded` and is joined; its rejection is a cleanup error) | `C-REC-05.c`, `C-REC-05.d` |
| every accepted stop invalidates pre-start conditions during retirement | ported | `C-COND-04.h` |
| timed-out interrupts resume in LIFO order without skipping or duplicating work | ported, D38 form (every interrupt is called at once) | `C-SCOPE-05.e` |
| late acquisition remains owned through its one interrupt and release | ported, D38 (the resource is created after step 4, so its interrupt runs as soon as it exists) | `C-SCOPE-05.f` |
| a late onStop rejection is retained and reported across retry timing (2) | covered and ported | `C-TIME-03.b` (retry before the rejection), `C-TIME-03.i` (after it) |
| sync throws and async disposer rejections remain retryable cleanup debt (2) | ported | `C-SCOPE-10.a-sync`, `C-SCOPE-10.a-async` |
| a stop joining a dirty cleanup retry does not schedule an extra disposal pass | covered | `C-RET-05.a` |
| late cleanup debt stays attached to an old generation after replacement starts | covered, D31 form (the run continues) | `C-SCOPE-11.f-stop-succeeds` |
| a child remains exclusively owned until its first parent releases it | covered | `C-CHILD-02.a` |
| composition and inheritance preserve reentrant observer attempt outcomes (2) | covered | `C-OBS-03.a` on both entry points. Its hooks declared as class fields are dropped: S1 declares the hooks as methods, so such an override does not type-check (TS2425) |
| the #2905 A–F contract traces pass through both lifecycle entry points | ported; 31 scenarios, listed below | The #2905 traces themselves are still to do (see Progress) |
| scope resources unwind in reverse order and listeners detach on retirement | covered and ported | `C-RET-01.c`, `C-SCOPE-02.c`, `C-SCOPE-02.f` (late `use`); `listen` is a companion (S4) |
| startup failures report cleanup errors and stop retries remaining debt | ported | `C-CMD-13.a` |
| start timeout is deterministic and a pre-aborted caller does not mutate intent | covered | `C-CMD-01.a`, `C-TIME-02.d` |
| runtime failures retire the generation and resolve whenState observers | covered (its final `stop()` leaving `failed` is B1) | `C-SCOPE-07.c-error`, `C-CMD-16.b`, `C-SCOPE-02.a`, `C-CMD-09.a` |
| owned child lifecycles stop with their parent and unexpected child failure propagates | covered | `C-CHILD-04.a`, `C-CHILD-06.a` |
| owned child failures remain supervised during graceful parent shutdown | ported, D39 form (no escalation while the parent retires) | `C-CHILD-05.e-stops`, `C-CHILD-05.e-fails` |
| AsyncLifecycle inheritance rejects final-method overrides | covered and ported | `C-SHELL-02.a`, `C-SHELL-02.b`, `C-SHELL-02.d-*` (one case each for `state`, `Symbol.asyncDispose`, `stop`, `restart`, `whenState`). Class-field hooks dropped, as above |
| diagnostics publish committed sanitized metadata before isolated observers | covered and ported | `C-OBS-04.a` (Copilot's record shape is a known divergence), `C-OBS-01.b` (the order) |
| watchdog feed, disarm, and expiry use the supplied clock | moved to S4 | Companions land with their implementation (D26) |
| watchdog defaults to recovery and the default diagnostic label | moved to S4 | Companions land with their implementation (D26) |
| cleanup error collapsing preserves zero, one, and multiple failures | moved to S4 | White-box test of a Copilot helper; the behavior is `C-RET-04.b` |

The 31 scenarios of the bundled "#2905 A–F" test, each run through both entry points:

| Scenario | Status | Contract test |
| --- | --- | --- |
| a user restart() while a task awaits its own recover() | ported | `C-REC-04.e` |
| a task calls recover() while the owner's recovery retires | ported | `C-REC-05.c` |
| a recovery requester that rejects at once | ported | `C-REC-05.b-at-once` |
| an onStart that calls fail() after a stop() aborted it | ported, C-SCOPE-02 form | `C-SCOPE-02.e-onStart` |
| a release that throws undefined or null while a stopped start rolls back (2) | ported | `C-SCOPE-10.c-*` |
| a late acquisition whose interrupt rejects | ported, D38 | `C-SCOPE-05.f` |
| start, stop, start during a gated onStart | covered | `C-CMD-06.a` |
| stop, start while running | covered | `C-CMD-06.b` |
| restart during startup | covered | `C-CMD-11.b` |
| a second stop() rejects waits created during the first | ported | `C-COND-04.h` |
| concurrent start() calls share one attempt | covered | `C-CMD-03.a` |
| a caller abort cancels only its own start() | covered | `C-CMD-02.a` |
| two stop()s and Symbol.asyncDispose share one pass | ported | `C-RET-05.b` |
| a watchdog armed before stop() never fires afterwards | moved to S4 | Companion (D26) |
| stopping a parent while its child starts | covered | `C-CHILD-03.a` |
| recover(), then start() in the same tick | covered, D37 form | `C-REC-04.b` |
| a task's recovery, then start() during its onStop | covered, D37 form | `C-REC-04.c` |
| recover() twice | covered | `C-REC-02.a` |
| a task's recovery, then stop() | covered | `C-REC-04.a` |
| a task's recovery, then fail() during its retirement | ported, C-SCOPE-02 form | `C-SCOPE-02.e-onStop` |
| the owner's recovery, then fail() during its onStop | ported, C-SCOPE-02 form | `C-SCOPE-02.e-onStop` |
| an interrupt that completes another pending acquisition | ported | `C-SCOPE-05.d` |
| stop() then start() during an idle late release | ported, C-SCOPE-11 form (the start queues) | `C-SCOPE-11.m` |
| a task's recovery with the stop deadline armed | covered | `C-REC-05.a` |
| an onStop that throws undefined, null or false (3) | covered and ported | `C-RET-02.d`, `C-RET-02.e-*` |
| two start()s queued behind stop() | covered | `C-CMD-06.b` |
| the owner's recovery, then stop() | covered | `C-REC-04.a` |
| stop() during a gated onStart | covered | `C-CMD-07.a` |
| a failed start is not retried | covered | `C-CMD-14.a` |
| a pre-start wait when the start fails | covered, D28 form | `C-COND-04.a` |
| listeners never accumulate across cycles | covered with `on` plus `defer(off)`; `listen` is S4 | `C-SCOPE-03.a` |

## Required lists

### #2905 traces A to F

From the [reproduction comment](https://github.com/wechaty/wechaty/issues/2905#issuecomment-6819182496), inverted. Each replays its script's scenario in `traces.test.ts`.

| Trace | Old behavior | Contract test | Clause tests that also cover it |
| --- | --- | --- | --- |
| A | Two `start()`s queued behind a `stop()` entered `onStart` twice, concurrently | `2905-A` | `C-CMD-06.b`, `C-CMD-03.a` |
| B | `reset()` racing a user `stop()` restarted the stopped service | `2905-B-recover`, `2905-B-restart` | `C-REC-04.a`, `C-CMD-11.a` |
| C | `stop()` during a slow `onStart` resolved after a timeout, then the late completion published `active` | `2905-C` | `C-CMD-07.c`, `C-TIME-03.e` |
| D | A failing `onStart` without an `error` listener left the instance stuck and unrecoverable | `2905-D` | `C-CMD-14.a`, `C-CMD-09.a` |
| E | A `stable('active')` waiter never settled after a failing `onStart` | `2905-E` | `C-COND-04.a`, `C-CMD-16.b` |
| F | `ready`, `logout` and `reset` listeners accumulated across start/stop cycles | `2905-F` | `C-SCOPE-03.a` |

### v1 design acceptance list

From §6 of the [v1 consolidated design](https://github.com/wechaty/wechaty/issues/2911#issuecomment-6873515089).

| Item | Status | Contract test |
| --- | --- | --- |
| An acquisition that resolves after abort is released, or recorded as unresolved if its release fails | covered and ported | `C-SCOPE-04.b`, `C-SCOPE-04.d` |
| A hook that throws between `create` resolving and its next statement leaks nothing | ported | `C-SCOPE-04.e` |
| `onStop` is not called for a run that never reached `running` | covered | `C-RET-03.a`, `B3` |
| `onStop` can use a live resource and sees a deadline signal separate from `scope.signal` | covered | `C-RET-01.d` |
| A pre-start condition wait rejects when `stop()` is called before any start | covered | `C-COND-04.b1` |
| `scope.recover()` from a child does not fail its parent; a failed replacement does | covered and ported | `C-CHILD-05.d`, `C-CHILD-05.f` |

### #2911 §9 acceptance traces

| Item | Status | Contract test |
| --- | --- | --- |
| Cases A to F of #2905 §3.8, inverted | ported | `2905-*` |
| A hook or observer that synchronously calls `stop()` never produces a second reconciler | covered | `C-OBS-03.b`, `C-OBS-03.f` |
| `onStateChange` calling `stop()` on `running` does not turn the completed `start()` into a rejection | covered | `C-OBS-03.a` |
| A throwing `whenState` predicate rejects only that wait, and a throwing `onStateChange` is isolated | covered | `C-CMD-16.a`, `C-OBS-02.a` |
| `stop()` on `failed` settles: resolves when clean, retries cleanup when dirty | covered | `C-CMD-09.a`, `C-CMD-10.a` |
| A stop waiter resolves when its generation is released, even if a newer `start()` is queued | ported | `C-CMD-08.a` |
| `restart()` then `stop()` ends stopped; `restart()` then `start()` does not hang | covered | `C-CMD-11.g` |
| A start hook that ignores abort and resolves late never publishes `running` | covered | `C-CMD-07.c`, `2905-C` |
| `failed { cleanupComplete: false }` refuses a new generation until cleanup succeeds | covered | `C-CMD-10.a`, `C-CMD-13.a` |
| A stop hook that outlives `stopTimeoutMs` blocks a clean retirement until it settles | covered | `C-TIME-03.a` |
| Registration after abort releases immediately; a failing late release is retried by the next `stop()` | covered | `C-SCOPE-02.b`, `C-SCOPE-02.c`, `C-SCOPE-09.a` |
| A task waiting for its socket to close finishes when scope abort initiates the close (TCP) | moved to S5 | Real I/O belongs in consumer validation (#2973); already run once on CI. The ordering it checks is `C-SCOPE-05.a`, `C-RET-01.a` |
| Stopping from `running` lets `onStop` use a live resource before the scope aborts | covered | `C-RET-01.d` |
| `scope.fail()`, `scope.set()` and `recover()` from a retired generation have no effect | covered | `C-SCOPE-02.a`, `C-REC-03.c` |
| Delayed recovery stays `superseded` after user `stop() → start()` | ported | `C-REC-03.e` |
| A condition wait made before `start()` binds to the next generation and rejects if that generation fails | covered | `C-COND-04.a` |
| A child that stops on its own fails its parent; the parent unwinds its other children in reverse order | covered and ported | `C-CHILD-05.a`, `C-CHILD-05.g` |
| Three nested levels, mixing both entry points, start in order, stop in reverse, and leave no listener, timer or task | covered and ported | `C-CHILD-04.b`, `C-CHILD-04.c` |

### ChatGPT review, 17-row regression table

From §7 of the [ChatGPT review](https://github.com/wechaty/wechaty/issues/2911#issuecomment-6884631028).

| Test | Required result | Contract test |
| --- | --- | --- |
| Concurrent `start()` | One startup attempt | `C-CMD-03.a`, `2905-A` |
| `start → stop → start` | Fresh, non-aborted generation | `C-CMD-06.a`, `C-CMD-06.c` |
| Restart during startup | Old generation retires before replacement | `C-CMD-11.b` |
| Stop during uncooperative startup | Bounded failure reporting; unresolved work retained | `C-TIME-03.e`, `C-TIME-03.f`, `2905-C` |
| Graceful shutdown | `onStop` can access required live resources | `C-RET-01.d` |
| Late acquisition | Release or persistent cleanup debt | `C-SCOPE-04.b`, `C-SCOPE-04.d` (new) |
| Failed disposer retry | Retry only unfinished work | `C-CMD-10.a` |
| Task blocked on socket | Interrupt before joining | `C-SCOPE-05.a` |
| Stale watchdog | Cannot override newer intent | `C-REC-03.c`, `C-REC-03.e`, `C-REC-04.a`, `2905-B-*` |
| Reentrant observer | One reconciler, stable attempt outcomes | `C-OBS-03.*` |
| Parent stop during child startup | Child cancellation propagates | `C-CHILD-03.a` |
| Generation-bound readiness | No stale conditions or orphaned waiters | `C-COND-02.a`, `C-COND-04.*`, `C-COND-05.a` |
| Falsy rejection values | Preserve failures exactly | `C-STATE-05.a`, `C-SCOPE-07.c-undefined`, `C-RET-02.d`, `C-RET-02.e-*`, `C-SCOPE-10.c-*` |
| Repeated recovery | Distinct failures can be independently recovered | `C-REC-02.a` |
| Concurrent stop/dispose | One retirement operation per generation | `C-RET-05.b` |
| Late cleanup failure | Never silently lost | `C-SCOPE-09.a`, `C-SCOPE-11.b-*`, `C-TIME-03.i` |
| Child ownership transfer | Exclusive ownership until release | `C-CHILD-02.a` |

## Rules without a test keyed to them

S2 requires every README rule to have a test or a reason. These have no test named after them; each is covered as shown.

| Rule | Covered by | Note |
| --- | --- | --- |
| C-STATE-03 | `C-STATE-01.a`, `2905-D` | Generation numbers per attempt, failed attempts included |
| C-STATE-04 | every test that asserts a `stateTrace()` | An invariant over all schedules; S3 checks it on random schedules |
| C-STATE-06 | `C-CMD-10.a`, `C-CMD-13.a`, `C-SCOPE-09.a` | |
| C-STATE-07 | `C-SCOPE-11.a-*`, `C-SCOPE-11.h-stop`, `C-TIME-03.*` | |
| C-RET-07 | `C-OBS-03.b` | D34 |
| C-SHELL-01 | the whole suite | Every test runs through both entry points |
| C-SHELL-03 | — | Untested here: the adapters wrap the hooks to translate the scope, so invalid hooks never reach an implementation. The final kernel's own tests cover it (S4) |
| C-SHELL-04 | `C-OBS-04.a` | The `name` option appears in the record |
| C-TIME-04 | every test with `needs: [ 'clock' ]` | The default global-timer clock is not exercised: unit tests use no real time |

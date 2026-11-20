# Contract suite inventory

Where every test of the three comparison suites, and every other required case, went in the shared contract suite (S2, [#2970](https://github.com/wechaty/wechaty/issues/2970)).

The rule from [#2968](https://github.com/wechaty/wechaty/issues/2968): if one implementation tests a case, the final module tests it too. A source test is either **ported**, naming the contract test key that covers it, or **dropped**, giving the reason. S2 is done when every source test appears below.

## Progress

| Source | Cases | Ported | Dropped | Remaining |
| --- | --- | --- | --- | --- |
| `src/async-lifecycle-codex/*.test.ts` | 63 tests (154 cases) | 41 | 2 (1 dropped, 1 moved to S5) | 20 (18 waiting for a decision, 2 next PR) |
| `src/async-lifecycle-claude/*.test.ts` | 208 | 0 | 0 | 208 |
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
| B5 | copilot | A failed late release on a retired scope is never called again; `stop()` rejects with the old error forever | `C-SCOPE-08.a`, `C-SCOPE-09.a` |
| B6 | copilot | An `onStop` rejection after the stop deadline is missing from the snapshot's `cleanupError` | `C-TIME-03.b` |
| B7 | claude | A start timeout settles only after retirement, so `start()` is not bounded by its deadline and an abort-listener command supersedes it | `C-TIME-02.*` |
| B8 | copilot | A `start()` then `stop()` in the same tick still runs `onStart`, so pre-start condition waits resolve instead of rejecting | `C-COND-04.b2` |

## Conflicts

Source tests that assert behavior contradicting an accepted decision. Each is ported in the decided form.

| Source test | Conflict | Decision |
| --- | --- | --- |
| codex: stop from the start timeout listener; restarting during startup; start deadline reports dirty failure | Expected `onStop` for a generation that never reached `running` | D8: no `onStop`; ported without it |
| codex: start deadline reports dirty failure until the same startup hook settles | Expected an immediate dirty `failed` and a refused `start()` | C-RET-01 step 5, C-TIME-02: `stopping` while waiting for the hook; a `start()` queues |
| codex: a task failure interrupts startup and parks the failed attempt | Expected phase `run` before `running` | C-STATE-05: phase `start` |
| codex: conditions are local to their owner | Expected a foreign condition to be silently ignored | C-COND-01: `TypeError` |
| codex, claude, copilot: condition wait on a failed generation | All reject with the failure or a plain `Error` | D28: `LifecycleSupersededError` with the failure as `cause` |

## Ported and dropped tests

One table per source suite, added as each is ported.

### Codex (`src/async-lifecycle-codex/`, #2914)

63 distinct tests (154 cases: most run through both entry points, some in several variants). Ported: 41. Waiting for a decision: 18. Next S2 PR: 2. Dropped: 1. Moved to S5: 1.

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
| startup budget includes synchronous work (2 variants) | waiting | D30: is a deadline judged by the clock at commit, or only by its timer? |
| queued microtasks cannot publish running after the startup deadline | waiting | D30 |
| a detached release failure interrupts startup and preserves the failing cleanup (2) | waiting | D31: releases registered on an already retired scope |
| queued restart reports the detached disposer error before starting a replacement | waiting | D31 |
| stop from the start timeout listener observes cleanup (3) | ported, D8 form (no onStop) | `C-TIME-02.a-*` |
| start / restart from a timeout listener waits for the expired generation to retire (2) | ported | `C-TIME-02.b-*` |
| replacement startup handles detached cleanup (5) | waiting | D31 |
| stop / fail retires active resources while a detached release is blocked (2) | waiting | D31 |
| a parent cannot claim a child's independently queued start / restart (2) | waiting | D33: a child with an accepted, uncommitted command |
| a stopped child can be claimed after its detached release settles | waiting | D31 |
| a clean failed child with an accepted stop cannot be claimed | waiting | D33 |
| a replacement child remains owned until a subsequent parent stop releases it | waiting | D32: a child that restarts itself during its parent's stop |
| stop / restart joins a late registration at retirement completion (6) | waiting | D31; the microtask-tuned interleavings belong to S3 |
| restart includes retirement from the instant it is accepted (3) | waiting | D30 |
| a replacement gets a fresh retirement budget after detached cleanup | waiting | D31 |
| a stop joining detached cleanup receives the same deadline outcome | waiting | D31 |
| stop checks its deadline before committing cleanup (2) | waiting | D30 |
| one stop deadline spans the active hook and detached releases | waiting | D31 |
| stop supersedes pre-start condition waits (2) | ported | `C-COND-04.b1`, `C-COND-04.b2` |
| a pre-aborted stop leaves the next generation's condition waits intact | ported | `C-COND-04.c` |
| stop superseding a queued replacement also rejects its condition waits | ported | `C-COND-04.d` |
| a condition wait created during retirement binds to the next generation | ported | `C-COND-02.a` |
| late registrations sharing a disposer are independently retried | ported | `C-SCOPE-08.a` |
| a run failure survives a late release (2) | waiting | D31 |
| start waiting for detached cleanup joins or is superseded (2) | waiting | D31 |
| restart gracefully retires the old generation before a joined start | ported | `C-CMD-11.c` |
| reentrant start from startup abort waits for the interrupted generation to retire | ported | `C-CMD-06.a` |
| restarting during startup retires the interrupted hook before replacement | ported, D8 form (no onStop) | `C-CMD-11.b` |
| one worker handles stop from a starting observer | ported; its "onStart is never entered" assertion waits for D34 | `C-OBS-03.b` |
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
| inheritance rejects command overrides from intermediate classes and class fields | next S2 PR: shell tests need each implementation's base class | C-SHELL-02 |
| conditions are local to their owner and stale generations cannot make a replacement ready | ported, C-COND-01 form (`TypeError`) | `C-COND-01.a`, `C-COND-04.e`, `C-COND-05.a` |
| diagnostics are synchronous, post-commit, and structural | next S2 PR: needs each implementation's channel name | C-OBS-04 |

`socket.integration.test.ts`:

| Source test | Status | Reason |
| --- | --- | --- |
| abort closes a connected socket and the waiting task finishes before disposal (opt-in TCP, 2 entry points) | moved to S5 | Real I/O belongs in consumer validation (#2973); the ordering it checks is `C-RET-01.a` |

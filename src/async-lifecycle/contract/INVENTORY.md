# Contract suite inventory

Where every test of the three comparison suites, and every other required case, went in the shared contract suite (S2, [#2970](https://github.com/wechaty/wechaty/issues/2970)).

The rule from [#2968](https://github.com/wechaty/wechaty/issues/2968): if one implementation tests a case, the final module tests it too. A source test is either **ported**, naming the contract test key that covers it, or **dropped**, giving the reason. S2 is done when every source test appears below.

## Progress

| Source | Cases | Ported | Dropped | Remaining |
| --- | --- | --- | --- | --- |
| `src/async-lifecycle-codex/*.test.ts` | 154 (2 opt-in TCP) | 0 | 0 | 154 |
| `src/async-lifecycle-claude/*.test.ts` | 208 | 0 | 0 | 208 |
| `src/async-lifecycle-copilot/*.test.ts` | 32 scenarios | 0 | 0 | 32 |
| #2905 traces A to F | 6 | 0 | 0 | 6 |
| v1 design acceptance list | 6 | 0 | 0 | 6 |
| ChatGPT review, 17-row regression table | 17 | 0 | 0 | 17 |
| #2968 §5 bugs | 3 | 3 | 0 | 0 |

## Required bug regressions

| Bug | Contract test | Clauses | Known failure for |
| --- | --- | --- | --- |
| B1 | `B1` in `bugs.test.ts` | C-OBS-01, C-CMD-09 | copilot |
| B2 | `B2` in `bugs.test.ts` | C-REC-05, D19 | claude (codex lacks `scope.recover`) |
| B3 | `B3` in `bugs.test.ts` | C-RET-03, D8 | codex |

## Conflicts

Source tests that assert behavior contradicting an accepted decision. Each is ported in the decided form.

| Source test | Conflict | Decision |
| --- | --- | --- |
| (none yet) | | |

## Ported and dropped tests

One table per source suite, added as each is ported.

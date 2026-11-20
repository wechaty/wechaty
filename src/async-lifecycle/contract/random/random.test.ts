/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * S3 random-schedule tests (wechaty/wechaty#2971): seeded schedules checked
 * against the invariants documented in `runner.ts`, through the S2 adapters.
 *
 * - `S3.random` runs a budget of seeds per implementation and entry point. An
 *   implementation's `knownFailures` may waive one invariant with the key
 *   `S3.<invariant>` (for example `S3.I7`), citing the bug that breaks it; any
 *   other violation fails the test with a shrunk, replayable schedule.
 * - `S3-*` replay schedules that once failed, shrunk and saved here. Each
 *   cites the bug or divergence it found.
 *
 * Environment variables, for local soak runs:
 * - `ASYNC_LIFECYCLE_SEEDS`: seeds per run (default 100);
 * - `ASYNC_LIFECYCLE_SEED`: the first seed (default 1);
 * - `ASYNC_LIFECYCLE_STEPS`: steps per schedule (default 30).
 */

import assert from 'node:assert/strict'
import process from 'node:process'

import { contract } from '../suite.ts'
import { generate, run, type Schedule, shrink, type Violation } from './runner.ts'

const SEEDS = Number(process.env['ASYNC_LIFECYCLE_SEEDS'] ?? 100)
const FIRST = Number(process.env['ASYNC_LIFECYCLE_SEED'] ?? 1)
const STEPS = Number(process.env['ASYNC_LIFECYCLE_STEPS'] ?? 30)

contract('S3.random', `${SEEDS} seeded schedules of ${STEPS} steps break no invariant`, {}, async ({ make, impl }) => {
  const waived = (violation: Violation) => `S3.${violation.invariant}` in impl.knownFailures
  for (let seed = FIRST; seed < FIRST + SEEDS; seed++) {
    const schedule = generate(seed, impl.capabilities, STEPS)
    const violation = (await run(make, impl.capabilities, schedule)).find(found => !waived(found))
    if (violation) {
      const small = await shrink(make, impl.capabilities, schedule, violation.invariant)
      const [ again ] = (await run(make, impl.capabilities, small)).filter(found => found.invariant === violation.invariant)
      assert.fail(`${violation.invariant} at step ${again?.step ?? violation.step}: ${again?.message ?? violation.message}\nshrunk schedule: ${JSON.stringify(small)}`)
    }
  }
})

/** A schedule that once failed, shrunk and saved, with the bug it found. */
interface Regression {
  readonly key: string
  readonly title: string
  readonly schedule: Schedule
}

const REGRESSIONS: readonly Regression[] = [
  {
    key      : 'S3-B3',
    title    : 'restart(), settle, restart(), start(): onStop never runs for a generation that did not reach running (I7, found on Codex: B3)',
    schedule : { seed: 1, steps: [ { op: 'restart', n: 331771481 }, { op: 'resolve', n: 144675723 }, { op: 'restart', n: 409897888 }, { op: 'start', n: 917795761 } ] },
  },
  {
    key      : 'S3-D31-running',
    title    : 'a late release on generation 1 keeps a later generation from committing running (I1, found on Claude: D31)',
    schedule : { seed: 5, steps: [ { op: 'restart', n: 1338266330 }, { op: 'spawn', n: 983771305 }, { op: 'use', n: 29681274 }, { op: 'resolve', n: 645222353 }, { op: 'restart', n: 40841628 }, { op: 'restart', n: 1866645161 }, { op: 'reject', n: 1728871699 }, { op: 'restart', n: 376282684 }, { op: 'late-defer', n: 598912935 } ] },
  },
  {
    key      : 'S3-D31-stopped',
    title    : 'late releases keep the instance from committing stopped until they are released (I4, found on Claude: D31)',
    schedule : { seed: 29, steps: [ { op: 'restart', n: 322771957 }, { op: 'restart', n: 77178033 }, { op: 'fail', n: 1588934533 }, { op: 'stop', n: 672500064 }, { op: 'late-defer', n: 1141441639 }, { op: 'late-defer', n: 176278709 }, { op: 'start', n: 1676683016 } ] },
  },
  {
    key      : 'S3-B13',
    title    : 'a stop() during a retirement with a start() queued behind it ends stopped (I11, found on Claude at seed 6295 of a 10,000-seed soak: B13)',
    schedule : { seed: 6295, steps: [ { op: 'restart', n: 2113443349 }, { op: 'child', n: 304182382 }, { op: 'stop', n: 872276838 }, { op: 'use', n: 1005799022 }, { op: 'resolve', n: 609667528 }, { op: 'defer', n: 1954595663 }, { op: 'start', n: 641922338 }, { op: 'use', n: 1036139674 }, { op: 'resolve', n: 257146160 }, { op: 'stop', n: 372604258 } ] },
  },
  {
    key      : 'S3-B1',
    title    : 'a single restart() then draining ends stopped, even after a clean stop failure (I11, found on Copilot: B1)',
    schedule : { seed: 5, steps: [ { op: 'restart', n: 40841628 } ] },
  },
]

for (const { key, title, schedule } of REGRESSIONS) {
  contract(key, title, {}, async ({ make, impl }) => {
    const violations = await run(make, impl.capabilities, schedule)
    assert.deepEqual(violations.map(found => `${found.invariant}: ${found.message}`), [])
  })
}

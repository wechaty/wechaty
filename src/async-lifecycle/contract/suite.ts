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
 * How a contract test is declared (wechaty/wechaty#2970).
 *
 * {@link contract} writes one test and expands it into one `node:test` case per
 * implementation and entry point. The case name carries the test key, so the
 * results table can be read straight from the runner output:
 *
 *     B1 start() rejects only after failed is committed [copilot/AsyncLifecycle] (known failure)
 *
 * For each implementation and entry point the case is:
 * - **skipped**, with the reason, when the implementation lacks a capability
 *   the test needs;
 * - **expected to fail** when the key is in the implementation's
 *   `knownFailures`, so it still runs in both Node.js and Deno and turns red the
 *   day it starts passing (see `expectFailure` in `./harness.ts`);
 * - otherwise a normal test.
 *
 * To run the suite against a new implementation, add it to {@link IMPLEMENTATIONS}.
 *
 * To see why a known failure fails, set `ASYNC_LIFECYCLE_SHOW_KNOWN_FAILURES=1`:
 * known failures then run as ordinary tests and report their real assertion.
 * An expected failure only proves that something failed, so check this when
 * adding or changing a `knownFailures` entry.
 */

import process from 'node:process'
import { test } from 'node:test'

import { claude } from './adapters/claude.ts'
import { codex } from './adapters/codex.ts'
import { copilot } from './adapters/copilot.ts'
import { final } from './adapters/final.ts'
import { expectFailure } from './harness.ts'
import type {
  Capability,
  Implementation,
  MakeSubject,
  ShellName,
}                           from './subject.ts'

/** Every implementation the suite runs against. */
const IMPLEMENTATIONS: readonly Implementation[] = [ codex, claude, copilot, final ]

/** Run known failures as ordinary tests, to see their real assertion. */
const SHOW_KNOWN_FAILURES = process.env['ASYNC_LIFECYCLE_SHOW_KNOWN_FAILURES'] === '1'

const SHELLS: readonly ShellName[] = [ 'createLifecycle', 'AsyncLifecycle' ]

/** What a contract test body receives. */
interface ContractContext {
  /** Create a subject on the implementation and entry point under test. */
  readonly make: MakeSubject
  /** Both entry points of the implementation under test, for tests that mix them. */
  readonly shells: Readonly<Record<ShellName, MakeSubject>>
  /** The implementation under test, for entry-point and diagnostics tests. */
  readonly impl: Implementation
  readonly implementation: string
  readonly shell: ShellName
}

interface ContractOptions {
  /** Capabilities the test uses; it is skipped where one is missing. */
  readonly needs?: readonly Capability[]
}

/**
 * Declare one contract test.
 *
 * @param key - Unique test key starting with the clause or bug ID it checks,
 *   for example `'B1'` or `'C-CMD-04.a'`. Known failures are listed by this key.
 * @param title - What the test shows, in one line.
 * @param body - The test, written against the S1 API through `context.make`.
 */
function contract (
  key: string,
  title: string,
  options: ContractOptions,
  body: (context: ContractContext) => Promise<void>,
): void {
  for (const implementation of IMPLEMENTATIONS) {
    for (const shell of SHELLS) {
      const name = `${key} ${title} [${implementation.name}/${shell}]`
      const context: ContractContext = {
        make           : implementation.shells[shell],
        shells         : implementation.shells,
        impl           : implementation,
        implementation : implementation.name,
        shell,
      }

      const missing = (options.needs ?? []).filter(capability => !implementation.capabilities.has(capability))
      if (missing.length > 0) {
        test(name, { skip: `${implementation.name} lacks ${missing.join(', ')}` }, () => {})
        continue
      }

      const knownFailure = implementation.knownFailures[`${key}@${shell}`] ?? implementation.knownFailures[key]
      if (knownFailure !== undefined && !SHOW_KNOWN_FAILURES) {
        test(`${name} (known failure)`, () => expectFailure(() => body(context), knownFailure))
        continue
      }

      test(name, () => body(context))
    }
  }
}

export type {
  ContractContext,
  ContractOptions,
}
export {
  contract,
  IMPLEMENTATIONS,
}

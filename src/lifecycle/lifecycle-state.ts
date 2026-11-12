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
 * Public, read-only observation of an async service's lifecycle.
 *
 * This module owns the *vocabulary* of lifecycle observation. It intentionally
 * replaces the `state-switch` `active()/inactive()` getter+setter flags (whose
 * `'pending'` value is truthy and whose setter lets callers lie about state)
 * with an immutable discriminated union so that:
 *
 *   - "starting" can never be mistaken for "running" (distinct `kind`s),
 *   - only the controller can transition state (no public setter),
 *   - `failed` carries whether cleanup actually completed, keeping the fact
 *     "the start failed" separate from the fact "resources are released".
 *
 * `generation` is a monotonically increasing token identifying one concrete
 * run's resources. It lets observers and the controller fence *stale
 * completions*: a superseded operation can never publish state for, or mutate
 * resources owned by, a newer generation.
 *
 * See RFC wechaty/wechaty#2905 §3.6, §3.7, §4, §7.
 */
type LifecycleState =
  | { readonly kind: 'stopped' }
  | { readonly kind: 'starting'; readonly generation: number }
  | { readonly kind: 'running'; readonly generation: number }
  | { readonly kind: 'stopping'; readonly generation: number }
  | {
      readonly kind: 'failed'
      readonly generation: number
      /** The original error that caused the transition to fail. */
      readonly error: unknown
      /**
       * `true` when owned resources were verified released after the failure.
       * `false` means cleanup itself failed or was skipped, so a restart that
       * reuses the same resources is potentially unsafe.
       */
      readonly cleanupComplete: boolean
      /** Preserved cleanup error, if cleanup was attempted and itself failed. */
      readonly cleanupError?: unknown
    }

/** Discriminant values for {@link LifecycleState}. */
type LifecycleStateKind = LifecycleState['kind']

export type {
  LifecycleState,
  LifecycleStateKind,
}

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
 * The seeded pseudo-random source of the S3 random-schedule tests
 * (wechaty/wechaty#2971). One seed always yields the same sequence under
 * Node.js and Deno, so a failing schedule can be replayed and saved as a
 * fixed-seed regression test. Not for anything security-related.
 */

/**
 * A mulberry32 generator: a 32-bit state, uniform floats in `[0, 1)`.
 * Chosen for being tiny and portable; statistical quality only needs to be
 * good enough to vary schedules.
 */
class Random {

  #state: number

  constructor (seed: number) {
    this.#state = seed >>> 0
  }

  /** The next float in `[0, 1)`. */
  next (): number {
    this.#state = (this.#state + 0x6D2B79F5) >>> 0
    let t = this.#state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** An integer in `[0, n)`; `n` must be a positive integer. */
  int (n: number): number {
    return Math.floor(this.next() * n)
  }

  /** One element of a non-empty list. */
  pick<T> (list: readonly T[]): T {
    return list[this.int(list.length)]!
  }

  /** One key of a non-empty weight table, chosen in proportion to its weight. */
  weighted<K extends string> (weights: Readonly<Partial<Record<K, number>>>): K {
    const entries = Object.entries(weights) as [ K, number ][]
    const total = entries.reduce((sum, [ , weight ]) => sum + weight, 0)
    let roll = this.next() * total
    for (const [ key, weight ] of entries) {
      roll -= weight
      if (roll < 0) {
        return key
      }
    }
    return entries[entries.length - 1]![0]
  }

}

export { Random }

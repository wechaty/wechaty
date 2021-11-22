#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

/**
 * If you know how iterators work and how they are consumed you would't need any extra library,
 *  since it can become very easy to build your own concurrency yourself.
 *    — @Endless
 *
 * Inspired by: @link https://stackoverflow.com/a/51020535/1123955
 */

/**
 * Huan's stackoverflow answer (code example) for `merge`:
 *  @link https://stackoverflow.com/a/69985103/1123955
 */
import {
  merge,
}           from 'ix/asynciterable/index.js'

type ExecuterTask <S, T> = (value: S) => T | Promise<T>

const executeTask = <S, T> (task: ExecuterTask<S, T>) => async function * (
  iterator: IterableIterator<S>,
): AsyncIterableIterator<T> {
  for (const one of iterator) {
    const result = await task(one)
    yield result
  }
}

/**
 * Execute task with the concurrency on an iterator
 * The order will not be guaranteed. (mostly will be different)
 */
const concurrencyTaskExecuter = (concurrency = 1) => <S, T>
  (task : ExecuterTask<S, T>) =>
    async function * (
      iterator: Array<S> | IterableIterator<S>,
    ): AsyncIterableIterator<T> {
      if (Array.isArray(iterator)) {
        iterator = iterator.values()
      }

      const executer = executeTask(task)

      const resultIteratorList = new Array(concurrency)
        .fill(iterator)
        .map(executer) as [AsyncIterableIterator<T>, ... AsyncIterableIterator<T>[]]

      yield * merge(...resultIteratorList)
    }

export {
  concurrencyTaskExecuter,
}

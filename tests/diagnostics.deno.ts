import { channel } from 'node:diagnostics_channel'

import { diagnose } from '../src/diagnostics.ts'

declare const Deno: {
  test: (name: string, callback: () => Promise<void>) => void
}

Deno.test('diagnostics use the Node-compatible channel API', async () => {
  const diagnosticsChannel = channel('wechaty.lifecycle')
  const records: unknown[] = []
  const listener = (record: unknown) => records.push(record)
  diagnosticsChannel.subscribe(listener)

  try {
    await diagnose('start', async () => {})
  } finally {
    diagnosticsChannel.unsubscribe(listener)
  }

  if (records.length !== 2) {
    throw new Error(`expected start/end records, got ${records.length}`)
  }
})

# Lifecycle diagnostics

Wechaty publishes opt-in diagnostics on the Node-compatible
`wechaty.lifecycle` channel from `node:diagnostics_channel`. It does not create
an exporter, register a global provider, start timers for diagnostics, or send
network requests. Subscribe before starting a bot and unsubscribe when
observation is no longer needed:

```ts
import { channel } from 'node:diagnostics_channel'

const lifecycle = channel('wechaty.lifecycle')
const observe = (record: unknown) => {
  // Validate the record before using it.
}

lifecycle.subscribe(observe)
// Start and stop bots.
lifecycle.unsubscribe(observe)
```

Records have `version: 1`, an opaque `operationId`, and an `operation`. The
`start`, `stop`, `provider.resolve`, and `provider.start` operations publish a
`phase: 'start'` record and a matching `phase: 'end'` record with the same ID.
End records contain a monotonic `durationMs` and an `outcome` of `resolved`,
`rejected`, or `timed-out`. The `provider.ready` operation is a single
`phase: 'event'` record with `outcome: 'ready'`; it has no duration.

The optional `provider` field is only `configured` or `default`; it does not
expose provider options, names, or credentials. Diagnostic records never
include errors, bot or puppet objects, message content, payloads, or session
data. The `start` operation's outcome describes whether `start()` resolved or
rejected, not whether the provider is ready. `provider.start` reports the
provider start call separately. Its tolerated timeout is reported as
`timed-out`, and readiness is reported only when the provider emits `ready`.
Consequently, a `start` record can end as `resolved` while the provider start
record ends as `rejected` when an error listener handles the emitted error.

The channel is a host integration point, not a sandbox: subscribers run
synchronously as part of publication and must not throw. Keep callbacks
nonblocking, avoid recording high-cardinality or sensitive application data,
and own subscription/unsubscription in the host application. Channel names,
record fields, and outcomes are a versioned diagnostics contract distinct from
Wechaty's business events.

The Node-compatible channel API can also be exercised with Deno using:

```sh
deno test --node-modules-dir=auto tests/diagnostics.deno.ts
```

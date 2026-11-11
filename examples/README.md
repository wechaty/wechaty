# EXAMPLES

## Canonical, executable examples

These small examples use only public package imports and an explicit
`PuppetMock`. No messaging account, URL, service token, or real provider is
required:

1. [Startup and shutdown](canonical/startup.ts): register an error listener
   before starting, stop in `finally`, and remove the owned listener. This host
   collects emitted errors and rejects rather than silently accepting failure.
2. [Message and reply](canonical/message-reply.ts): listen for inbound `ding`
   and `await message.say('dong')`; ignore self messages and remove the listener
   when finished.
3. [Plugin cleanup](canonical/plugin-cleanup.ts): a plugin receives `bot` as an
   argument and returns an uninstaller. Call the function returned by `bot.use()`
   explicitly; `bot.stop()` is not a substitute for uninstalling.

The [shared native assertions](../tests/fixtures/canonical-examples.test.ts)
execute these exact modules, not copied snippets. The supplied `exercise`
callback logs in mock contacts and delivers inbound text with the installed
mocker's `sender.say('ding').to(user)` API. Assertions observe SDK events,
the real mock provider's outgoing payloads and `messageSendText` calls, and
listener cleanup on success and failure. Plugin assertions cover:

```text
install -> listener count increases -> inbound message produces one dong
uninstall -> owned listener is removed -> later ding produces no reply
```

### Run the packed consumer

Use Node.js >=26, npm >=10, and Deno 2.9.6 (the CI version):

```sh
npm ci
npm run test:examples        # compile once, run the same assertions on both
npm run test:examples:node   # Node only
npm run test:examples:deno   # Deno only (Node still builds the consumer)
```

Each command builds and packs Wechaty, installs the tarball in a temporary
consumer outside the checkout, and copies the canonical modules and shared
assertions there. The consumer declares only the tarball, the locked mock
provider, TypeScript compiler, and Node types. TypeScript checks public
declarations before either native runner executes the emitted JavaScript.
`skipLibCheck` skips third-party declaration internals, not the examples or
their public imports. Installation requires registry access; example execution
does not contact messaging or network services or select providers from ambient
service/padlocal tokens.

Deno runs the same emitted suite with its Node compatibility layer. Its checker
is not used in place of the consumer's TypeScript check. Read, environment, and
system permissions are needed by package dependencies; FFI is scoped to the
transitive `leveldown` package, whose native addon loads when Wechaty is imported.
Network permission is explicitly denied. No tests or resource checks are skipped.
This job runs on Linux; the existing repository-wide TAP suite has not yet been
migrated to shared native execution (see [#2877](https://github.com/wechaty/wechaty/issues/2877)).

Temporary consumers are removed in `finally`, including on compilation or test
failure. These examples are checked in the isolated consumer, not through a
source alias in the repository build. Package-file assertions exclude their
emitted artifacts and test harness from the production tarball; the mock and
compiler remain development/example dependencies.

## Interactive real-provider demos

[ding-dong-bot.ts](ding-dong-bot.ts) (`npm run demo`) starts a real default
provider and requires interactive login. It is not a deterministic CI example.
More historical demos and starter templates are available in
[wechaty-getting-started](https://github.com/wechaty/getting-started/tree/master/examples);
check their API and runtime requirements against this checkout.

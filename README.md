# Wechaty [![Join Wechaty Discord Developer Community](https://img.shields.io/discord/916984413944967180?logo=discord&style=flat)](https://discord.gg/7q8NBZbQzt) [![NPM Version](https://img.shields.io/npm/v/wechaty?color=brightgreen)](https://www.npmjs.com/package/wechaty) [![NPM](https://github.com/wechaty/wechaty/workflows/NPM/badge.svg)](https://github.com/wechaty/wechaty/actions?query=workflow%3ANPM) [![Docker](https://github.com/wechaty/wechaty/workflows/Docker/badge.svg)](https://github.com/wechaty/wechaty/actions?query=workflow%3ADocker)

[![Wechaty](https://wechaty.js.org/img/wechaty-logo.svg)](https://wechaty.js.org)

Wechaty is a conversational RPA SDK for chatbot makers. Write your bot once,
and run it on WeChat, WhatsApp and other messaging platforms through
interchangeable puppet providers.

This repository is the Wechaty monorepo. Each npm package lives in
`packages/<npm-name>/` and has its own README.

## Quick start

```shell
npm install wechaty
```

```javascript
import { WechatyBuilder } from 'wechaty'

const wechaty = WechatyBuilder.build()
wechaty
  .on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`))
  .on('login',            user => console.log(`User ${user} logged in`))
  .on('message',       message => console.log(`Message: ${message}`))
wechaty.start()
```

The [`wechaty` package README](packages/wechaty/README.md) covers installation,
Docker, puppet providers and the API. New to Wechaty? Start from the
[getting-started template](https://github.com/wechaty/wechaty-getting-started).

## Packages

| Package | npm | Description |
| --- | --- | --- |
| [`wechaty`](packages/wechaty/) | [![npm](https://img.shields.io/npm/v/wechaty?color=brightgreen)](https://www.npmjs.com/package/wechaty) | The Wechaty SDK: the bot, its users (contacts, rooms, messages) and the puppet bridge |
| [`wechaty-grpc`](packages/wechaty-grpc/) | [![npm](https://img.shields.io/npm/v/wechaty-grpc?color=brightgreen)](https://www.npmjs.com/package/wechaty-grpc) | The gRPC protocol (`.proto` files) and its generated Node.js stubs, used between puppet services and their clients |
| [`wechaty-puppet`](packages/wechaty-puppet/) | [![npm](https://img.shields.io/npm/v/wechaty-puppet?color=brightgreen)](https://www.npmjs.com/package/wechaty-puppet) | The abstract `Puppet` that every provider implements, with the shared payload types |
| [`wechaty-token`](packages/wechaty-token/) | [![npm](https://img.shields.io/npm/v/wechaty-token?color=brightgreen)](https://www.npmjs.com/package/wechaty-token) | Puppet service tokens: discovery, the `wechaty://` gRPC resolver and the `wechaty-token` CLI |

The core libraries that `wechaty` builds on are moving into this repository
one at a time ([#3054](https://github.com/wechaty/wechaty/issues/3054)):
`wechaty-puppet-mock` and `wechaty-puppet-service`. Until each one arrives, it lives in its own
repository under [github.com/wechaty](https://github.com/wechaty).

## Repository layout

```text
packages/<npm-name>/        one npm package each: sources, tests, README
scripts/                    repository tooling (Docker)
.github/workflows/          CI for every package, publishing, Docker
.github/coverage-baselines/ coverage floors per runtime and package
tsconfig.base.json          compiler options shared by every package
```

## Development

Wechaty needs Node.js 26 and npm 10 or newer. Install once at the root, then
run the checks for every package:

```shell
npm ci
npm run lint
npm run test:unit
npm run test:unit:deno
npm run coverage:node
npm run coverage:deno
```

- [CONTRIBUTING.md](CONTRIBUTING.md): how to contribute, and the Wechaty 2.0
  design and pull request rules
- [DEVELOPMENT.md](DEVELOPMENT.md): the workspace, tests, coverage and
  publishing in detail
- [AGENTS.md](AGENTS.md): rules for AI coding agents
- [Wechaty 2.0 roadmap](https://github.com/wechaty/wechaty/issues/3033)

## Community

- Documentation: <https://wechaty.js.org>
- Discord: <https://discord.gg/7q8NBZbQzt>
- Issues: <https://github.com/wechaty/wechaty/issues>
- Support the project: <https://opencollective.com/wechaty>

## License

[Apache-2.0](LICENSE)

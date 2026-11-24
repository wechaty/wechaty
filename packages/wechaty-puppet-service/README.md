# wechaty-puppet-service

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-service.svg)](https://www.npmjs.com/package/wechaty-puppet-service)
[![npm (tag)](https://img.shields.io/npm/v/wechaty-puppet-service/next.svg)](https://www.npmjs.com/package/wechaty-puppet-service?activeTab=versions)
[![Node.js CI](https://github.com/wechaty/wechaty/actions/workflows/node.js.yml/badge.svg)](https://github.com/wechaty/wechaty/actions/workflows/node.js.yml)
[![ES Modules](https://img.shields.io/badge/ES-Modules-brightgreen)](https://github.com/Chatie/tsconfig/issues/16)

![Wechaty Service](https://wechaty.github.io/wechaty-puppet-service/images/hostie.png)

Wechaty Puppet Service is gRPC for Wechaty Puppet Provider.

For example, we can cloudify the Wechaty Puppet Provider wechaty-puppet-padlocal
to a Wechaty Puppet Service by running our Wechaty Puppet Service Token Gateway.

If you want to learn more about what is Wechaty Puppet and Wechaty Puppet Service,
we have a blog post to explain them in details at
<https://wechaty.js.org/2021/01/14/wechaty-puppet-service/>

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)

This package lives in the [Wechaty monorepo](https://github.com/wechaty/wechaty) at
`packages/wechaty-puppet-service`, where it moved from `wechaty/puppet-service` in 2.0.

## Features

1. Consume Wechaty Puppet Service: `PuppetService` is a puppet that calls a
   remote puppet over gRPC.
1. Provide Wechaty Puppet Service: `PuppetServer` serves any puppet over gRPC.

## Requirements

- Node.js 26 or newer. The package is ESM only.
- `wechaty-puppet` 2.0 as a peer dependency.

## Usage

### Consume a puppet service

```ts
import { WechatyBuilder } from 'wechaty'

const wechaty = WechatyBuilder.build({
  puppet: 'wechaty-puppet-service',
  puppetOptions: {
    token: `${TOKEN}`
  }
})

wechaty.start()
```

Learn more about Wechaty Puppet Token from our official website: <http://wechaty.js.org/docs/puppet-services/>

### Provide a puppet service

```ts
import { PuppetServer } from 'wechaty-puppet-service'
import { PuppetMock }   from 'wechaty-puppet-mock'

const server = new PuppetServer({
  endpoint : '0.0.0.0:8788',
  puppet   : new PuppetMock(),
  token    : 'insecure_00000000-0000-0000-0000-000000000000',
})

await server.start()
```

The part of the token before its last `_` is the TLS server name (SNI).
Without `tls` options the server uses the bundled `insecure` certificate,
whose private key is public: set your own with
`WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT` and `WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY`
(see below) for production.

## Environment Variables

### 1 `WECHATY_PUPPET_SERVICE_TOKEN`

The token set to this environment variable will become the default value of `puppetOptions.token`

```sh
WECHATY_PUPPET_SERVICE_TOKEN=${WECHATY_PUPPET_SERVCIE_TOKEN} node bot.js
```

## gRPC Health Checking Protocol

From version 0.37, Wechaty Puppet Service start
supporting the [GRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md).

```sh
$ npm install --global wechaty-token
$ go install github.com/grpc-ecosystem/grpc-health-probe@latest

$ wechaty-token discovery uuid_12345678-1234-1234-1234-567812345678
{"host": 1.2.3.4, "port": 5678}

$ grpc-health-probe -tls -tls-no-verify -addr 1.2.3.4
status: SERVING
```

See:

- [Add health checking API wechaty/grpc#151](https://github.com/wechaty/grpc/issues/151)

## Resources

### Authentication

1. [Authentication and Security in gRPC Microservices - Jan Tattermusch, Google](https://youtu.be/_y-lzjdVEf0)
1. [[gRPC #15] Implement gRPC interceptor + JWT authentication in Go](https://youtu.be/kVpB-uH6X-s)

## History

### master v0.31

1. ES Modules supported.
1. gRPC Health Checking Protocol support

### v0.30 (Aug 25, 2021)

1. Implemented TLS and server-side token authorization.
1. Refactor the gRPC client code.
1. Add local payload cache to reduce the cost of RPC.

#### New environment variables

<!-- markdownlint-disable MD013 -->

1. `WECHATY_PUPPET_SERVICE_TLS_CA_CERT`: can be overwritten by `options.tls.caCert`. Set Root CA Cert to verify the server or client.

For Puppet Server:

| Environment Variable | Options | Description |
| -------------------- | ------- | ----------- |
| `WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT` | `options.tls.serverCert` | Server CA Cert (string data) |
| `WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY` | `options.tls.serverKey` | Server CA Key (string data) |
| `WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER` | `options.tls.disable` | Set `true` to disable server TLS |

For Puppet Client:

| Environment Variable | Options | Description |
| -------------------- | ------- | ----------- |
| `WECHATY_PUPPET_SERVICE_AUTHORITY` | `options.authority` | Service discovery host, default: `api.chatie.io` |
| `WECHATY_PUPPET_SERVICE_TLS_CA_CERT` | `options.tls.caCert` | Certification Authority Root Cert, default is using Wechaty Community root cert |
| `WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME` | `options.tls.serverName` | Server Name (must match for SNI) |
| `WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT` | `options.tls.disable` | Set `true` to disable client TLS |

## Changelog

### v2.0 (unreleased)

1. Moved into the Wechaty monorepo and built on the 2.0 `wechaty-puppet`,
   `wechaty-grpc` and `wechaty-token` workspace packages.
1. ESM only, Node.js 26 or newer; the CommonJS build is gone.
1. The redux store that mirrored puppet events (`wechaty-redux`, `ducks`) is
   removed, together with the unused `client/duck` folder.
1. The server answers `conversationRead` by calling the served puppet's
   `conversationReadMark()`. `tap()` and `tapSearch()` are not in the gRPC
   protocol: the client throws an unsupported error for them.
1. `PuppetService.stop()` resolves only after the local payload cache has
   closed its LevelDB files.

### main v1.0 (Oct 29, 2021)

Release v1.0 of Wechaty Puppet Service.

1. use [wechaty-token](https://github.com/wechaty/token)
  for gRPC service discovery with `wechaty` schema (xDS like)
1. deprecated `WECHATY_SERVICE_DISCOVERY_ENDPOINT`,
  replaced by `WECHATY_PUPPET_SERVICE_AUTHORITY`.
  (See [#156](https://github.com/wechaty/wechaty-puppet-service/issues/156))
1. enable TLS & Token Auth (See [#124](https://github.com/wechaty/wechaty-puppet-service/issues/124))

### v0.14 (Jan 2021)

Rename from ~~wechaty-puppet-hostie~~ to [wechaty-puppet-service](https://www.npmjs.com/package/wechaty-puppet-service)
(Issue [#118](https://github.com/wechaty/wechaty-puppet-service/issues/118))

### v0.10.4 (Oct 2020)

1. Add 'grpc.default_authority' to gRPC client option.  
    > See: [Issue #78: gRPC server can use the authority  to identify current user](https://github.com/wechaty/wechaty-puppet-hostie/pull/78)

### v0.6 (Apr 2020)

Beta Version

1. Reconnect to Hostie Server with RxSJ Observables

### v0.3 (Feb 2020)

1. Publish the NPM module [wechaty-puppet-hostie](https://www.npmjs.com/package/wechaty-puppet-hostie)
1. Implemented basic hostie features with gRPC module: [@chatie/grpc](https://github.com/Chatie/grpc)

### v0.0.1 (Jun 2018)

Designing the puppet hostie with the following protocols:

1. [gRPC](https://grpc.io/)
1. [JSON RPC](https://www.jsonrpc.org/)
1. [OpenAPI/Swagger](https://swagger.io/docs/specification/about/)

## Maintainers

- [@huan](https://github.com/huan) Huan
- [@windmemory](https://github.com/windmemory) Yuan

## Copyright & License

- Code & Docs © 2018-now Huan Li <huan@chatie.io>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons

# wechaty-token

[![NPM](https://github.com/wechaty/token/actions/workflows/npm.yml/badge.svg)](https://github.com/wechaty/token/actions/workflows/npm.yml)
[![NPM Version](https://badge.fury.io/js/wechaty-token.svg)](https://badge.fury.io/js/wechaty-token)
[![npm (tag)](https://img.shields.io/npm/v/wechaty-token/next.svg)](https://www.npmjs.com/package/wechaty-token?activeTab=versions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)

![wechaty token](docs/images/wechaty-token.png)

Wechaty Token Based Authentication Manager

## Install

```sh
npm install -g wechaty-token
```

## CLI Usage

```sh
$ wechaty-token --help

wechaty-token <subcommand>
> Wechaty utility for discovering and generating tokens

where <subcommand> can be one of:

- generate - Generate a new Wechaty Token
- discover - Wechaty TOKEN Service Discovery

For more help, try running `wechaty-token <subcommand> --help`
```

### Wechaty Token Discovery

```sh
$ wechaty-token discover --help

wechaty-token discover
> Wechaty TOKEN Service Discovery

ARGUMENTS:
  <str> - Wechaty Puppet Service TOKEN

FLAGS:
  --help, -h - show help
```

Example:

```sh
# Discover a valid token (in-service)
$ wechaty-token discover puppet_IN-SERVICE-TOKEN
{
  "host": "1.2.3.4",
  "port": 5678
}
$ echo $?
0

# Discover a unvalid token (out-of-service)
$ wechaty-token discover puppet_OUT-OF-SERVICE-TOKEN
NotFound
$ echo $?
1
```

### Generate Wechaty Token

```sh
$ wechaty-token generate --help

wechaty-token generate
> Generate a new Wechaty Token

OPTIONS:
  --type, -t <str> - The type of the Wechaty Puppet Service [optional]

FLAGS:
  --help, -h - show help
```

Example:

```sh
# Generate a UUID token (`uuid` will be the default type)
$ wechaty-token generate
uuid_1fab726b-e3d3-40ce-8b7b-d3bd8c9fd280

# Generate token with type `foo`
$ wechaty-token generate --type foo
foo_1fab726b-e3d3-40ce-8b7b-d3bd8c9fd280
```

## gRPC Resolver Usage

We now can use `wechaty:///${TOKEN}` as gRPC address for Wechaty Service Token Discovery.

The `WechatyResolver` is for resolve the above address and help gRPC to connect to the right host and port.

```ts
import { WechatyResolver } from 'wechaty-token'
WechatyResolver.setup()
// That's it! You can use `wechaty:///${TOKEN}` as gRPC address now!
// const routeguide = grpc.loadPackageDefinition(packageDefinition).routeguide;
// client = new routeguide.RouteGuide('wechaty:///${TOKEN}',
//                                     grpc.credentials.createInsecure());
// See: https://grpc.io/docs/languages/node/basics/
```

See:

- [gRPC Name Resolution](https://github.com/grpc/grpc/blob/master/doc/naming.md)
- [Wechaty Puppet Service Code](https://github.com/wechaty/wechaty-puppet-service/blob/3a0285432e6916720c40604c61bcea6be5f63ab5/src/client/puppet-service.ts#L284-L285)

## History

### master v1.0 (Nov 28, 2021)

1. ES Module support
1. TypeScript 4.5
1. Wechaty Token Discovery output `JSON.stringify` format

### v0.5 (Sep 8, 2021)

1. Wechaty Token format standard released: `SNI_UUID`
    1. `SNI` will be used as Server Indicator Name (SNI) when we are using TLS
    1. `UUID` is a standard UUID format (v4)
1. add `wechatyToken.sni` support.

### v0.4 (Aug 15, 2021)

1. Use `cockatiel` to implement `RetryPolicy`
1. Use `nock` to implement HTTP unit testing
1. Implemented [#1](https://github.com/wechaty/token/issues/1)

### v0.2 master (Aug 2, 2021)

1. `wechaty-token` CLI released
1. gRPC Resolver for Wechaty: Enabled `xds` like schema `wechaty:///uuid_TOKEN` for gRPC client

### v0.0.1 (Aug 1, 2021)

Inited

## Author

[Huan LI](https://github.com/huan) ([李卓桓](http://linkedin.com/in/zixia)), Google Developer Expert (Machine Learning), zixia@zixia.net

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## Copyright & License

- Code & Docs © 2018-now Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons

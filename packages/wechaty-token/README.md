# wechaty-token

[![NPM](https://github.com/wechaty/token/actions/workflows/npm.yml/badge.svg)](https://github.com/wechaty/token/actions/workflows/npm.yml)
[![NPM Version](https://badge.fury.io/js/wechaty-token.svg)](https://badge.fury.io/js/wechaty-token)
[![npm (tag)](https://img.shields.io/npm/v/wechaty-token/next.svg)](https://www.npmjs.com/package/wechaty-token?activeTab=versions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)

Wechaty Token Based Authentication Manager

## Install

```sh
npm install -g wechaty-token
```

## Usage

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
$ wechaty-token discover puppet_IN_SERVICE_TOKEN
{ host: '8.7.5.2', port: 58871 }
$ echo $?
0

# Discover a unvalid token (out-of-service)
$ wechaty-token discover puppet_OUT_OF_SERVICE_TOKEN
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
# Generate a UUID token
$ wechaty-token generate
1fab726b-e3d3-40ce-8b7b-d3bd8c9fd280

# Generate token with type `foo`
$ wechaty-token generate --type foo
puppet_foo_1fab726b-e3d3-40ce-8b7b-d3bd8c9fd280
```

## History

### master

### v0.1 master (Aug 2, 2021)

1. `wechaty-token` CLI released
1. gRPC Resolver for Wechaty: enable schema `wechaty:///puppet_TOKEN` for gRPC client

### v0.0.1 (Aug 1, 2021)

Inited

## Author

[Huan LI](https://github.com/huan) ([李卓桓](http://linkedin.com/in/zixia)), Google Developer Expert (Machine Learning), zixia@zixia.net

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## Copyright & License

- Code & Docs © 2018-now Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons

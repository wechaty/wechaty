# GRPC

[![NPM Version](https://badge.fury.io/js/%40chatie%2Fgrpc.svg)](https://www.npmjs.com/package/@chatie/grpc)
[![Build Status](https://travis-ci.com/Chatie/grpc.svg?branch=master)](https://travis-ci.com/Chatie/grpc)
[![Greenkeeper badge](https://badges.greenkeeper.io/Chatie/grpc.svg)](https://greenkeeper.io/)

![chatie grpc](https://chatie.io/grpc/images/grpc.png)

gRPC for Chatie

## INSTALL

```shell
./scripts/install-protoc.sh
npm install
```

> <https://github.com/google/protobuf/releases/latest>

## GENERATE STUBS

```shell
npm run generate
```

### 1. JS for Protocol Buffer

```shell
protoc \
  --js_out="import_style=commonjs,binary:${OUT_DIR}"
```

> <https://github.com/google/protobuf/releases/latest>

### 2. JS for gRPC Stubs

```shell
protoc \
  --plugin="protoc-gen-grpc=`which grpc_tools_node_protoc_plugin`" \
  --grpc_out="${OUT_DIR}"
```

> <https://www.npmjs.com/package/grpc-tools>

### 3. TypeScript Typing Definations for Protocol Buffer & gRPC Stubs

```shell
protoc \
  --plugin="protoc-gen-grpc=node_modules/grpc_tools_node_protoc_ts/bin/protoc-gen-ts" \
  --grpc_out="${OUT_DIR}"
```

> <https://github.com/agreatfool/grpc_tools_node_protoc_ts>

### 4. JS & TS for gRPC Web

```shell
protoc \
  --plugin="protoc-gen-ts=node_modules/ts-protoc-gen/bin/protoc-gen-ts" \
  --ts_out="service=true:${OUT_DIR}"
```

> <https://github.com/improbable-eng/ts-protoc-gen>

## DOCUMENTATION

* [Google Protocol Buffers Style Guide](https://developers.google.com/protocol-buffers/docs/style)


## RESOURCES

* [探讨gRPC的Node技术生态及实现工具](https://xenojoshua.com/2018/02/grpc-node-ecosystem/)
* [gRPC Basics - Node.js](https://grpc.io/docs/tutorials/basic/node.html)
* [Building a gRPC service with Node.js](https://codelabs.developers.google.com/codelabs/cloud-grpc/)
* [gRPC in 3 minutes (Node.js)](https://github.com/grpc/grpc/tree/master/examples/node)
* [Listen gRPC and HTTP requests on the same port](https://medium.com/@drgarcia1986/listen-grpc-and-http-requests-on-the-same-port-263c40cb45ff)
* [gRPC to JSON proxy generator following the gRPC HTTP spec](https://github.com/grpc-ecosystem/grpc-gateway)

### Protocol Buffer

* [Protocol Buffers for JavaScript (& TypeScript)](https://github.com/dcodeIO/protobuf.js)

### gRPC Web

* [gRPC-Web: Moving past REST+JSON towards type-safe Web APIs](https://improbable.io/games/blog/grpc-web-moving-past-restjson-towards-type-safe-web-apis)
* [Library for making gRPC-Web requests intended for TypeScript from either a browser or Node.js.](https://github.com/improbable-eng/grpc-web/tree/master/ts)

### TypeScript Generator

* [A Typescript definition file generator for gRPC services](https://github.com/anfema/grpc-code-generator)
* [gRPC Web TypeScript Code Generation](https://github.com/improbable-eng/grpc-web/blob/master/ts/docs/code-generation.md)
* [Protocol Buffers Compiler (protoc) plugin for TypeScript and gRPC-Web.](https://github.com/improbable-eng/ts-protoc-gen)

### Zoo Keeper

* [ZooKeeper - The King of Coordination](https://www.elastic.co/blog/found-zookeeper-king-of-coordination)

### STUN

* [How To TCP NAT Traversal using Node.js and a STUN Server](http://sogilis.com/blog/tcp-nat-traversal-nodejs-stun/)
* [chownat, allows two peers behind two separate NATs to directly communicate with each other.](https://samy.pl/chownat/)
* [What is STUN & TURN Server](https://stackoverflow.com/a/23307588/1123955)
* [NPM Search for: NAT Traversal](https://www.npmjs.com/search?q=nat+traversal)
* [NAT traversal by way of UPnP or NAT-PMP](https://github.com/tintfoundation/nat-traverse)

TCP hole punching

## AUTHOR

[Huan LI](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## COPYRIGHT & LICENSE

* Code & Docs © 2016-2018 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons

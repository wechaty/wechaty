# Third-party protocol buffers

`proto/wechaty/puppet.proto` imports these files, so `scripts/generate-stub.ts` needs them on the
`protoc` include path. They are committed here, pinned, so code generation works offline and gives
the same output every time. Each file keeps its upstream license header.

| File here | Upstream source | Pinned at | License |
| --- | --- | --- | --- |
| `google/api/annotations.proto`, `google/api/http.proto` | [googleapis/googleapis](https://github.com/googleapis/googleapis) `google/api/` | commit `94bc991b3f1df58bc841801631715894a7ac5e28` | Apache-2.0 |
| `protoc-gen-openapiv2/options/annotations.proto`, `protoc-gen-openapiv2/options/openapiv2.proto` | [grpc-ecosystem/grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) `protoc-gen-openapiv2/options/` | tag `v2.34.0` | BSD-3-Clause |
| `google/api/health_check/v1/health_check.proto` | [grpc/grpc-proto](https://github.com/grpc/grpc-proto) `grpc/health/v1/health.proto` | commit `483f11e91a30de9c11d65d872c09bc529e94e2ee` (before the `List` RPC, which would change the generated `IHealthServer`) | Apache-2.0 |

The Protocol Buffers well-known types (`google/protobuf/*.proto`) come with the `protoc` bundled
in the `grpc-tools` npm package.

To update a file, download it from the same path at a newer commit or tag, update the table, and
check that `npm run generate` and the tests still pass.

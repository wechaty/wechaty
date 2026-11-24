# Auth for Wechaty Puppet Service gRPC

1. OpenSSL CA generation script: <https://github.com/wechaty/dotenv/blob/main/ca/generate.sh>
1. Common Name (CN) is very important because it will be used as Server Name Indication (SNI) in TLS handshake.

## Monkey Patch

We need to copy http2 header `:authority` to metadata.

See: <monkey-patch-header-authorization.ts>

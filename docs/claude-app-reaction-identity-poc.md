# Claude GitHub App reaction identity experiment

This document exists only on a disposable test branch and is not intended for merging.

It triggers the limited `pull_request_target` test workflow on a same-repository PR using the `test/claude-app-token-poc-*` branch prefix, then checks whether an authorized Anthropic GitHub App token can post an `eyes` reaction as `claude[bot]`.

The experiment must respect a rejected token exchange, must never display credentials, must remove its temporary reaction, and must revoke its temporary App token. The existing automatic Claude reviewer remains unchanged.

Tracking: https://github.com/wechaty/wechaty/issues/2945

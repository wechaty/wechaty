# Claude App credential diagnostic test

Disposable PR to test whether the same official Claude review job can request an authorized short-lived `claude[bot]` GitHub App credential without making Claude perform additional inference.

The diagnostic lives in the workflow on the default branch, runs only on an explicitly named test branch, does not log tokens, and must delete any trial `eyes` reaction and revoke the App credential.

Tracking: https://github.com/wechaty/wechaty/issues/2945

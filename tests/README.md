# TESTS

Run unit tests

```shell
$ npm test
...

```

`npm run lint:ts` checks all repository TypeScript without emitting files.
`npm run build` creates a clean production-only build, and `npm run test:pack`
checks the contents and behavior of the installable package.

If you want to see full log messages

```shell
$ WECHATY_LOG=silly npm test
...

```

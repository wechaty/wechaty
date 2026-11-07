# DEVELOPMENT

Tips:

- [Mashup Font of FiraCode and Script12](https://github.com/kencrocken/FiraCodeiScript)
- [Monospaced font with programming ligatures](https://github.com/tonsky/FiraCode)
- [Combined programming mono font with italics and font ligatures made from Fira Code and Pacifico for Italics](https://github.com/kosimst/Firicico)

## TypeScript and modules

Wechaty is ESM-only. Use `import` instead of `require('wechaty')`; CommonJS
builds and package entry points are no longer provided.

The project requires Node.js 26 and npm 10 or newer. `npm run build` and
`npm run lint:ts` use TypeScript 7 via the `@typescript/native` npm alias.
`tsx` runs TypeScript scripts and unit tests without a separate TypeScript 6
runtime compiler. `npm run lint:biome` runs TypeScript lint rules without
depending on the TypeScript compiler API.

Commit `package-lock.json` alongside dependency changes. Use `npm ci` for a
clean installation from the lockfile.

## Git hooks

`npm install` links `scripts/pre-push.ts` into a Git metadata directory using
Git's required `pre-push` hook name. Node.js 26 runs the TypeScript hook
directly. The hook runs lint, bumps alpha prereleases to the next alpha
version, and bumps stable versions by patch. It pushes the version commit and
tag from an inner push, then cancels the original push because that push was
prepared before the version commit existed. The version bump also updates
`package-lock.json`. Set `NO_HOOK=1` to skip the hook.

## npm publishing

The npm workflow publishes the same tarball that passes the package smoke
test. It uses npm Trusted Publishing with GitHub OIDC instead of an npm
publish token; the trusted publisher must allow direct publishing from
`npm.yml`. Publishing requires npm 11.5.1 or newer.

## FiraCode

`Font Book` -> New Collection -> Downloaded -> Save Fira Code TTFs in it.

`.vscode/settings.json`

```json
  , "editor.fontFamily": "'Fira Code iScript', 'Fira Code', 'Courier New', Consolas, monospace"
  , "editor.fontLigatures": true
```

## Generate Changelog

```shell
npm run changelog
```

1. `403 - You have triggered an abuse detection mechanism. Please wait a few minutes before you try again. // See: https://developer.github.com/v3/#abuse-rate-limits'`

See: <https://github.com/github-changelog-generator/github-changelog-generator/issues/722#issuecomment-526980247>

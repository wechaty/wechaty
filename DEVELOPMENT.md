# DEVELOPMENT

Tips:

- [Mashup Font of FiraCode and Script12](https://github.com/kencrocken/FiraCodeiScript)
- [Monospaced font with programming ligatures](https://github.com/tonsky/FiraCode)
- [Combined programming mono font with italics and font ligatures made from Fira Code and Pacifico for Italics](https://github.com/kosimst/Firicico)

## TypeScript and modules

Wechaty is ESM-only. Use `import` instead of `require('wechaty')`; CommonJS
builds and package entry points are no longer provided.

`npm run build` uses TypeScript 7 via the `@typescript/native` npm alias.
The `typescript` dependency aliases the TypeScript 6 compatibility API required
by ts-node and other existing development tools; it does not supply the build
compiler. `npm run lint:ts` type-checks with TypeScript 7, and
`npm run test:unit` runs the unit tests using ts-node and SWC.

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

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

Relative imports may use `.ts` extensions for native TypeScript execution.
`rewriteRelativeImportExtensions` rewrites those paths to `.js` in the
compiled output. Existing `.js` imports remain supported; a repository-wide
import migration is not required.

Commit `package-lock.json` alongside dependency changes. Use `npm ci` for a
clean installation from the lockfile.

## Git hooks

`npm install` links `scripts/pre-push.ts` into a Git metadata directory using
Git's required `pre-push` hook name. Node.js 26 runs the TypeScript hook
directly. The hook runs lint, bumps alpha prereleases to the next alpha
version, and bumps stable versions by patch. It pushes the version commit
from an inner push, then cancels the original push because that push was
prepared before the version commit existed. The version bump also updates
`package-lock.json` and creates a local tag; push that tag separately with
`git push --no-follow-tags origin <tag>`. Tag-only pushes bypass the version
bump. Set `NO_HOOK=1` to skip the hook.

## npm publishing

The npm workflow publishes the same tarball that passes the package smoke
test. It uses npm Trusted Publishing with GitHub OIDC instead of an npm
publish token; the trusted publisher must allow direct publishing from
`npm.yml`. Publishing requires npm 11.5.1 or newer.

## Docker image publishing

The Docker workflow tests pushes and pull requests, but publishes only pushes
to `main` or a branch beginning with `v` followed by a digit. It builds and
tests commit-specific candidate images by digest, then promotes those digests to the
rolling version tag and the `latest` (stable) or `next` (development) tag. The
same process publishes both `wechaty/wechaty` and `wechaty/onbuild`.

Both the workflow and `scripts/docker.sh deploy` use the same rolling-tag
conversion: keep `major.minor`, append the first prerelease identifier when
present, and drop the patch version and prerelease counter. For example,
`2.0.1` becomes `2.0`, `2.0.1-alpha.10` becomes `2.0-alpha`,
`2.0.1-beta.3` becomes `2.0-beta`, and `2.0.1-rc.2` becomes `2.0-rc`.
Prereleases never update the stable `2.0` tag. Build metadata is ignored.

The channel follows Wechaty's even/odd minor-version convention: releases
without a prerelease suffix and with an even minor version use `latest`.
Odd minor versions and all prereleases use `next`. For example, `2.1.9`
publishes `2.1` and `next`, while `2.2.9` publishes `2.2` and `latest`.

Prefer Docker Hub OIDC when the `wechaty` Docker organization is eligible.
Create a connection that permits this repository and the publishing branches,
then set the GitHub Actions repository variable
`DOCKERHUB_OIDC_CONNECTIONID` to its connection ID. OIDC requires an eligible
Docker organization plan/program; it does not work with a personal namespace.
When OIDC is not configured, the workflow signs in as `zixia` using the
existing `DOCKER_PERSONAL_ACCESS_TOKEN` Actions secret. That account must
have push access to both image repositories. Use an expiring personal token
with read/write permission and no delete permission. Leave
`DOCKERHUB_OIDC_CONNECTIONID` unset to use this fallback; a configured OIDC
connection that fails authentication does not fall back to the personal token.

Candidate tags use the `ci-<commit>` form and remain in Docker Hub after
promotion; remove them only through a separately authorized retention process.

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

# Guidelines for Contributing

Thank you for your time on Wechaty.

## How to [contribute](https://github.com/wechaty/wechaty/blob/master/CONTRIBUTING.md)

* Write a blog about Wechaty
* Create a tutorial for Wechaty
* Help expand the [wiki](https://github.com/wechaty/wechaty/wiki)
* Answer questions on the [issue](https://github.com/wechaty/wechaty/issues)
* Review [pull requests](https://github.com/wechaty/wechaty/pulls)
* Start [hacking on Wechaty](https://github.com/wechaty/wechaty/blob/master/CONTRIBUTING.md)

### Why contribute

As an open source product, Chatie thrives from contributions of community members. Whatever your skill set is, there is a lot you can do to help us make Chatie better! 
So start forking!

### Not sure where to start?

It's a myth that writing code is the only way to contribute to open source. Chatie community is open to new ideas and there are so many different ways to make valuable contributions. We have some ideas of how you can get started!

#### 1. Contribute Code

- Check out GitHub issues with the tags `good first issue`, `pull request welcome` or `help wanted`
- Write code examples for documentation
- Report a bug and work on resolving it
- Collaborate with others on building new features

**Tips:** 
If you want to add new features or change the API, please submit an issue first to make sure no one else is already working on the same thing and discuss the implementation and API details with maintainers and users by creating an issue. When everything is settled down, you can submit a pull request.

Make sure to add tests for your features and bugfixes and update the documentation (see below) before submitting your code!

#### 2. Contribute Support

- Fix typos in documentation
- Translate documentation to your local language
- Write tutorials and blog posts, see more: https://github.com/chatie/blog
- Answer questions on the Wechaty Developers Home or Github issues
- Organize Chatie meetups or user groups in your area

Contact rui@chatie.io to learn more

## Link to Wechaty

Contribute by marketing: Add **Powered by Wechaty** Badge to your Project Homepage:

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/wechaty/wechaty)

### Markdown

```markdown
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/wechaty/wechaty)
```

### Html

```html
<a href="https://github.com/wechaty/wechaty" target="_blank">
  <img src="https://img.shields.io/badge/Powered%20By-Wechaty-green.svg" alt="Powered by Wechaty" border="0">
</a>
```

## Bug Report

Contribute by feedback, make code robust.

## Feature Request

Contribute by make product suggestion.

## Wechaty 2.0

Wechaty 2.0 is a redesign of the whole ecosystem. Everyone is welcome to
contribute: the Wechaty organization, anyone on GitHub, and AI coding agents.
Everyone follows the same rules, and a maintainer reviews and merges every PR.

### Design rules

1. **Better design wins over compatibility.** Take breaking changes when they
   give a better design. Follow current best practice and modern design
   patterns. Do not add compatibility shims, `V2` suffixes or deprecated
   aliases for 1.x behavior. Protobuf field and enum numbers may change until
   2.0.0 is released, and are frozen after that.
2. **Keep the core portable.** A feature belongs in core only if at least two
   IMs have it. Provider-specific features go through the provider extension
   mechanism ([#2794](https://github.com/wechaty/wechaty/issues/2794)).
3. **Use types, not magic values.** No sentinel strings such as `'@all'`, and
   no separator characters inside IDs. Use `undefined` for "absent", never
   `null`.
4. **Reuse the existing models.** Use `Post`, `Sayable` and `FileBox` before
   adding a class. If you add one, say why in the issue.
5. **Change the lowest layer first:** `wechaty-puppet`, then `wechaty-grpc`,
   then `wechaty-puppet-service`, then `wechaty`. Add every new puppet API to
   `wechaty-puppet-mock` too, so it can be tested.
6. **Reimplement; do not cherry-pick.** Code from forks such as
   `@juzi/wechaty`, or from old PRs, is a reference only. Link it in your PR.

### Pull requests

1. Open an issue, or find one, before you write code. Agree the design of a new
   API in that issue first; larger changes need an RFC.
2. Send one feature or fix per PR, and reference the issue.
3. Follow [`AGENTS.md`](AGENTS.md): ESM only, `.ts` extensions on relative
   imports, unit tests in colocated `*.test.ts` files using `node:test`, and
   documentation comments on every source file and exported API.
4. Run the checks before you push. They must pass under both Node.js and Deno:

   ```bash
   npm run lint
   npm run test:unit
   npm run test:unit:deno
   npm run coverage:node
   npm run coverage:deno
   ```

I built wechaty with pleasure because it can help others. help from you for wechaty will be very appreciated by the community.

Cheers!

Huan

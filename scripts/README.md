# RxPlayer scripts

This directory contains various scripts allowing to perform various actions on the
RxPlayer:

- Serving/deploying the demo pages
- Generating complex builds
- Performing repetitive action performed before each release
- and many other things

Each script here should begin with a comment explaining what it does and - if it's not
obvious - why this is needed.

## Language

The preferred language for those scripts is `Node.js`, because RxPlayer maintainers are
most familiar with JavaScript, and because `Node.js` is more ubiquitous, known and more
stable than other JS runtimes such as `Deno` or `Bun`.

We don't add TypeScript typings to those files either to keep the complexity in
checking/running them simpler, but for most of those, we do enforce typechecking by
relying on advanced JSDoc - which is properly checked by TypeScript. To allow typechecking
in such a file, a `// @ts-check` comment needs to be added before any of its code.

For very minimal scripts that mostly just call external tools, `Bash` is also authorized.
Keep in mind that to be compatible with MacOS, a `Bash` script has to be compatible to its
`3.2.x` version, which prevent the reliance on several features.

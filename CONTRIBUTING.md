# Contributing to the RxPlayer

## Issues and new features

If you detect a problem with the RxPlayer, or if you desire a new feature, please first
[open an issue on the github's repository](https://github.com/canalplus/rx-player/issues).
We'll try to acknowledge it as soon as possible.

If that issue is not already worked on, we will usually accept pull requests. Those have
to follow the conventions defined below.

## Important code concepts

### Code documentation

We try to put `README.md` files inside every significant directories inside `/src` to
provide a global architecture documentation of that directory specifically.

You can try to start understanding a piece of RxPlayer code by navigating to that file.
Understand that the documented behavior may be out of date (in which case you're welcome
to update it or open an issue) though even in that case, it is a good starting point to
understand the directory's role. Likewise, don't forget to update it if a change you made
to the code necessitates a documentation change.

Also, for a more exhaustive approach to the documentation of the project's file
organization, you can look at [`FILES.md`](./FILES.md).

### When renaming or deleting functions, classes or variables

When Refactoring/Renaming, make sure to grep any of the renamed class / function /
variable's name as they may also be referenced in documentation and code comments. Same
thing for a directory or file name.

If the name is hard to grep (e.g. the name is too generic and thus has too many false
positives), you can generally reduce the area to comments in the same file and
documentation files in the same directory.

### `features` object

Some files should not be imported directly but only be accessed by going through the
`features` object exported at `/src/features`. This is to reduce bundle size when an
application doesn't need all of the RxPlayer's features.

### Multithreading

Some parts of the code are intented to be runnable in a WebWorker. In that environment
some API, more specifically DOM-related API, are not available directly (if some
interaction with the DOM is needed, it will have to go through an asynchronous
`postMessage` round-trip).

Whether the code needs to be runnable or not in a WebWorker is generally documented in the
`README.md` of concerned directories.

## Code style

### Linting

The code style in `src` is automatically checked by a "linter", `eslint`.

It basically follows those principles:

- 2 spaces indentation
- 90 columns maximum
- readability and being explicit is generally better than performance and being smart

You can easily check if you followed our style rules by calling `npm run lint`.

You can also check the style of the demo page (in the `demo` directory) by calling
`npm run lint:demo`, or the style of the test files (in the `tests` directory) by calling
`npm run lint:tests`.

### Types

We try to be as strict as possible with types:

- the `any` type should be avoided

- the `as` TypeScript keyword, used for type casting, should also be avoided as much as
  possible.

This is to be sure we can detect as much as possible type errors automatically with
TypeScript.

### `type` and `interface` typing

TypeScript's `type` and `interface` should all be named beginning with the letter `I`, for
easier identification purposes\*:

```ts
interface IMyObject {
  someKey: string;
}

type IStringOrNumber = string | number;
```

`enum`s and `const enum`s, which have the particularity in TypeScript of actually having
an influence on the outputed code, do not follow this rule however (because those are not
just types erased during transpilation):

```ts
enum MyEnum {
  ValueA = 1,
  ValueB = 2,
}

const enum MyConstEnum {
  Value1 = 1,
  Value2 = 2,
}
```

\*We know that this rule is a controversial subject amongst TypeScript developpers, yet we
still decide to enforce it for now.

### Forbidden functions and classes

Some native functions, methods or classes should never be used to ensure compatibility
with most browsers. To work around those, we usually rely on "ponyfills" which are
JavaScript re-implementations.

This concerns the following static methods:

- `Object.assign`: use `src/utils/object_assign.ts` instead
- `Object.values`: use `src/utils/object_values.ts` instead

And the following methods:

- `Array.prototype.includes`: use `src/utils/array_includes.ts` instead
- `Array.prototype.find`: use `src/utils/array_find.ts` instead
- `Array.prototype.findIndex`: use `src/utils/array_find_index.ts` instead
- `String.prototype.startsWith`: use `src/utils/starts_with.ts` instead
- `String.prototype.substr`: use `String.prototype.substring` instead
- `NodeList.prototype.forEach`: use a regular for loop instead
- `Promise.prototype.finally`: Use `then` or both `then` and `catch` of that Promise's
  methods instead.

## The demo page

### Building the demo and serving it

You might want to quickly test your code modification(s) on a real use case.

For those types of need, we developped two demo pages:

- the _full demo_ page, which is also the one used to showcase the player.

  This demo has a user-friendly interface and allow the most frequent API interactions.

  It also exposes both the RxPlayer class through `window.RxPlayer` and the rxPlayer
  instance through `window.rxPlayer` - both in the global scope. You can thus open a
  debugger/inspector in your favorite browser to exploit directly the player's API.

- the _standalone demo_ page, which is just a `<video />` tag linked to a RxPlayer
  instance.

  In this demo too, `window.RxPlayer` and `window.rxPlayer` link to the RxPlayer class and
  the rxPlayer instance respectively.

To use the full demo page, you can build it and run a local HTTP server on the port 8000
by running the following npm script.

```sh
npm run start
```

To use the standalone demo page, you can build it and run a local HTTP server on the port
8001 by running the following npm script.

```sh
npm run standalone
```

Both will detect when the RxPlayer's files (or even the demo files) are updated and
perform a new build when that's the case. In that way, the server will always serve the
last local version of the code. Note however that hot-reload is not enabled currently,
you'll have to refresh the page yourself.

### Serving the demo page through HTTPS

You might want to serve the demo via HTTPS. This is for example needed to be able to play
encrypted contents in Chrome.

Thankfully, we have an npm script which generates a local self-signed certificate with the
help of `openssl`:

```sh
npm run certificate
```

You can then run the same demo script defined previously. The _full demo_ will now serve
HTTPS through the port 8443 and the _standalone demo_ through the port 8444. Both still
serve HTTP on the same ports than before.

Note that such self-signed certificates are usually (rightfully) considered suspicious by
web browsers. As such, you might first encounter a warning screen when going to one of the
demo pages in HTTPS. In most browsers, you can however safely ignore that warning.

## Creating a commit

### Checks

Every commits in a PR should pass our quick checks (linter and TypeScript check). To check
if that's the case, you can run locally the `check` script by calling `npm run check`.

## The test suite

### Unit tests

Unit tests test function implementations. Mostly to check if they give a sane output for
every input given.

Writing unit tests for new code is encouraged.

Unit tests are written in a \_\_tests\_\_ directory, itself created in the same directory
that the code it tests.

They are written and run with the help of the Jest library and are named the following
way: `filename_containing_the_function_tested.test.ts`.

To understand how to create a new test file, you can take inspiration from the current
unit tests.

### Integration tests

What we call integration tests are tests testing the entire API of the RxPlayer.

New integration tests are not required when a new code is added. Just make sure that all
those tests pass before doing a pull request by running: `npm run test:integration`.

It you want to improve our integration tests, you are welcome to do so. Those are wrote in
`tests/integration` with the help of the `vitest` library.

We also use a homemade library and server to serve media contents to our tests. If you
want to know how it works, we invite you to rely on the already created tests and to read
the corresponding files.

### Memory tests

Memory tests replicate simple scenarios and try to detect memory leaks.

You can also help us improving our memory tests. Those are written in `test/memory`. The
testing library used is `vitest`.

## Documentation

The documentation is written in the `doc` directory, at the root of the project.

The content of `doc/generated` contains an HTML version of the Markdown files written in
the other directories. It is automatically generated from those by calling the `doc`
script through `npm run doc`.

## Opening a pull request

### Which branch to merge to

Pull requests for bug fixes, new tests or documentation should be done on the `stable`
branch.

Pull requests for new features and breaking changes will have to be performed on the `dev`
branch.

If you don't know on which branch to do a pull request, please open it on `dev`, we will
know how to redirect it to the right one.

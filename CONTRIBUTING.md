# Contributing to the RxPlayer #################################################

## Table of contents ###########################################################

- [Issues and new features](#issues)
- [Reading the current code](#reading)
- [Code style](#code)
    - [Linting](#code-lint)
    - [Types](#code-types)
    - [Forbidden functions and classes](#code-forbidden)
- [Starting the demo page](#demo)
  - [Building the demo and serving it](#demo-running)
  - [Using HTTPS](#demo-https)
- [Creating a commit](#commit)
  - [Checks](#commit-checks)
  - [Convention](#commit-name)
- [The test suite](#testing)
  - [Unit tests](#testing-unit)
  - [Integration tests](#testing-integration)
  - [Memory tests](#testing-memory)
- [Documentation](#doc)
- [Opening a pull request](#pr)
  - [Checks](#pr-checks)
  - [Which branch to merge to](#pr-branch)



<a name="issues"></a>
## Issues and new features #####################################################

If you detect a problem with the RxPlayer, or if you desire a new feature,
please first [open an issue on the github's
repository](https://github.com/canalplus/rx-player/issues).
We'll try to acknowledge it as soon as possible.

If that issue is not already worked on, we will usually accept pull requests.
Those have to follow the conventions defined below.



<a name="reading"></a>
## Reading the current code ####################################################

Even if we hope the current code is straightforward, readable and commented
enough we can still admit that going blind into the codebase can be hard at
first (as it would be for any non-small codebase).

We thus encourage you to rely on the architecture documentation you can usually
find alongside the code, in `README.md` files.
You can for example start by reading `src/README.md`, to have a clearer idea
of the general code architecture of the player.

Also, for a more exhaustive approach to the documentation of the project's file
organization, you can look at `FILES.md` at the root of this repository.

The code of the RxPlayer being heavily modularized, you should not need to read
the whole documentation to be ready, only the parts you want to update
(hopefully!).



<a name="code"></a>
## Code style ##################################################################

<a name="code-lint"></a>
### Linting ####################################################################

The code style in `src` is automatically checked by a "linter", `eslint`.

It basically follows those principles:
  - 2 spaces indentation
  - 90 columns maximum
  - optimize your code for readability

You can easily check if you followed our style rules by calling `npm run lint`.

You can also check the style of the demo page (in the `demo` directory) by
calling `npm run lint:demo`, or the style of the test files (in the `tests`
directory) by calling `npm run lint:tests`.


<a name="code-types"></a>
### Types ######################################################################

#### General TypeScript rules ##################################################

We try to be as strict as possible with types:

  - the `any` type should be avoided

  - the `as` TypeScript keyword, used for type casting, should also be avoided
    as much as possible.

  - the `is` keyword is fine in some situations, but simpler solutions should be
    preferred.

This is to be sure we can detect as much as possible type errors automatically
with TypeScript.

### `type` and `interface` typing

TypeScript's `type` and `interface` should all be named beginning with the
letter `I`, for easier identification purposes\*:
```
interface IMyObject {
  someKey: string;
}

type IStringOrNumber = string |
                       number;
```

\*We know that this rule is a controversial subject amongst TypeScript
developpers, yet we still decide to enforce it for now.

#### Generic parameters typing #################################################

Generic parameters are usually named in order `T` (for the first generic
parameter), then `U` (if there's two), then `V` (if there's three):

Examples:
```
type IMyGenericType<T> = Array<T>;

type IMyGenericType2<T, U> = Promise<T> |
                             U;

function mergeThree<T, U, V>(
  arg1: T,
  arg2: U,
  arg3: V
) : T & U & V {
  return Object.assign({}, arg1, arg2, arg3);
}
```

Some exceptions exist like for things like key-values couples, which can be named
respectively `K` and `V`:
```
type IMyMap<K, V> = Map<K, V>;
```

This is a general convention for generic parameters inherited from Java, and
re-used by TypeScript, and it helps identifying which type is a generic
parameter vs which type is a real type (no prefix) vs which type is a type
definition (prefixed by `I`).

If what they correspond to is not obvious (and if there's more than one, it
might well be), you're encouraged to add a more verbose and clear name, that you
should prefix by `T`:
```
function loadResource<TResourceFormat>(
  url : string
) : Promise<TResourceFormat> {
  // ...
}
```

However note that typing rules for generic parameters is a very minor
consideration and may not always need to be respected depending on the code it
is applied on.
In the end, it will be up to the RxPlayer's maintainers to decide that those
rules should be enforced or not on a given code.


<a name="code-forbidden"></a>
### Forbidden functions and classes ############################################

Some native functions, methods or classes should never be used to ensure
compatibility with every browsers. To work around those, we usually rely on
"ponyfills" which are JavaScript re-implementations.

This concerns the following static methods:
  - `Object.assign`: use `src/utils/object_assign.ts` instead
  - `Object.values`: use `src/utils/object_values.ts` instead

The following methods:
  - `Array.prototype.includes`: use `src/utils/array_includes.ts` instead
  - `Array.prototype.find`: use `src/utils/array_find.ts` instead
  - `Array.prototype.findIndex`: use `src/utils/array_find_index.ts` instead
  - `String.prototype.startsWith`: use `src/utils/starts_with.ts` instead
  - `String.prototype.substr`: use `String.prototype.substring` instead
  - `NodeList.prototype.forEach`: use a regular for loop instead

The following class:
  - `Promise`: use `src/utils/promise.ts` instead



<a name="demo"></a>
## Starting the demo page ######################################################

<a name="demo-running"></a>
### Building the demo and serving it ###########################################

You might want to quickly test your code modification(s) on a real use case.

For those types of need, we developped two demo pages:

  - the _full demo_ page, which is also the one used to showcase the player.

    This demo has a user-friendly interface and allow the most frequent API
    interactions.

    It also exposes both the RxPlayer class through `window.RxPlayer` and the
    rxPlayer instance through `window.rxPlayer` - both in the global scope. You
    can thus open a debugger/inspector in your favorite browser to exploit
    directly the player's API.

  - the _standalone demo_ page, which is just a `<video />` tag linked to a
    RxPlayer instance.

    In this demo too, `window.RxPlayer` and `window.rxPlayer` link to the
    RxPlayer class and the rxPlayer instance respectively.

To use the full demo page, you can build it and run a local HTTP server on the
port 8000 by running the following npm script.
```sh
npm run start
```

To use the standalone demo page, you can build it and run a local HTTP server on
the port 8001 by running the following npm script.
```sh
npm run standalone
```

Both will detect when the RxPlayer's files (or even the demo files) are updated
and perform a new build when that's the case. In that way, the server will
always serve the last local version of the code.

<a name="demo-https"></a>
### Serving the demo page through HTTPS ########################################

You might want to serve the demo via HTTPS. This is for example needed to be
able to play encrypted contents in Chrome.

Thankfully, we have an npm script which generates a local self-signed
certificate with the help of `openssl`:
```sh
npm run certificate
```

You can then run the same demo script defined previously.
The _full demo_ will now serve HTTPS through the port 8443 and the _standalone
demo_ through the port 8444. Both still serve HTTP on the same ports than
before.

Note that such self-signed certificates are usually (rightfully) considered
suspicious by web browsers. As such, you might first encounter a warning screen
when going to one of the demo pages in HTTPS. In most browsers, you can however
safely ignore that warning.


<a name="commit"></a>
## Creating a commit ###########################################################

<a name="commit-checks"></a>
### Checks #####################################################################

Every commits in a PR should pass our quick checks (linter, typescript check
and unit tests). To check if that's the case, you can run locally the `check`
script by calling `npm run check`.

Those checks give us some guarantees that every merged commit in the `master`
branch is stable enough.

This gives us more confidence on our code and also allows  more advanced
debugging if we detect a regression by the usage of tools such as git-bisect.


<a name="commit-name"></a>
### Convention #################################################################

When creating a new commit it is advised (though not enforced) to add a message
containing multiple paragraphs.

The first paragraph should be a short summary of what the commit does, short
enough so it can usually be displayed on one line - probably like the usual
commit messages you are used to.
The following paragraphs can be as long as you want (note that relying on a
[maximum column width of around 72 is a sensible
default](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
even if we do not enforce that either).

The goal here is to help understand your changes at a later time, in case things
go wrong in the future.

_You can create a commit with multiple paragraphs either through the command
line either by setting multiple `-m` options to git-commit, or just by calling
`git commit` with no `-m` option and editing the message manually in the opened
editor._



<a name="testing"></a>
## The test suite ##############################################################

<a name="testing-unit"></a>
### Unit tests #################################################################

Unit tests test function implementations. Mostly to check if they give a sane
output for every input given.

Writing unit tests for new code is encouraged.

Unit tests are written in a \_\_tests\_\_ directory, itself created in the same
directory that the code it tests.

They are written with the help of the Jest library and are named the following
way: `filename_containing_the_function_tested.test.ts`.

To understand how to create a new test file, you can take inspiration from
the current unit tests.


<a name="testing-integration"></a>
### Integration tests ##########################################################

What we call integration tests are tests testing the entire API of the RxPlayer.

New integration tests are not required when a new code is added. Just make sure
that all those tests pass before doing a pull request by running:
`npm run test:integration`.

It you want to improve our integration tests, you are welcome to do so.
Those are wrote in `tests/integration` with the help of the Mocha, Chai and
Sinon libraries.

We also use a homemade library and server to serve media contents to our tests.
If you want to know how it works, we invite you to rely on the already created
tests and to read the corresponding files.


<a name="testing-memory"></a>
### Memory tests ###############################################################

Memory tests replicate simple scenarios and try to detect memory leaks.

You can also help us improving our memory tests. Those are written in
`test/memory`. The testing stack used is Mocha, Chai and Sinon.



<a name="doc"></a>
## Documentation ###############################################################

The documentation is written in the `doc` directory, at the root of the project.

The content of `doc/generated` contains an HTML version of the Markdown files
written in the other directories. It is automatically generated from those by
calling the `doc` script through `npm run doc`.



<a name="pr"></a>
## Opening a pull request ######################################################

<a name="pr-checks"></a>
### Checks #####################################################################

Before doing a Pull Request, please ensure that all integration tests pass by
calling `npm run test:integration`.

Then, please call `npm run test:memory`, which tests for memory leaks.


<a name="pr-branch"></a>
### Which branch to merge to ###################################################

Pull requests for bug fixes, new tests or documentation should be done on the
`master` branch.

Pull requests for new features and breaking changes will have to be performed
on the `next` branch.

If you don't know on which branch to do a pull request, please open it on
`master`, we will know how to redirect it to the right one.

# Contributing to the RxPlayer #################################################

## Table of contents ###########################################################

- [Issues and new features](#issues)
- [Creating a branch](#branch)
  - [Naming convention](#branch-name)
- [Code style](#code)
    - [Linting](#code-lint)
    - [Types](#code-types)
    - [Forbidden functions and classes](#code-forbidden)
- [Creating a commit](#commit)
  - [Checks](#commit-checks)
  - [Naming convention](#commit-name)
- [Testing](#testing)
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



<a name="branch"></a>
## Creating a branch ###########################################################

<a name="branch-name"></a>
### Naming convention ##########################################################

We follow a strict convention for branch names. They are usually under this
form: `type/alias_for_the_fix`.

This strictness mostly helps us to quickly rememorate what each PR or merged
branch is/was about.

---

The type should be one of the following:
  - `fix`: For bug fixes
  - `feat`: For new features to the RxPlayer
  - `doc`: For documentation updates
  - `demo`: For demo improvements/fixes
  - `tests`: For tests improvements/fixes
  - `code`: For refactoring code which brings no fix or no new feature
  - `tools`: For improvements related to the RxPlayer's tools
  - `misc`: For unclassifiable other improvements

---

The `alias` should be descriptive enough to understand roughly what is the
impacted code.

---

Examples:
  - `fix/dash-minimum_position`
  - `fix/webm-duration_calculation`
  - `fix/ttml-background_color`
  - `feat/dash-utc_timing`
  - `code/manifest_as_event_emitter`
  - `tests/eme-attach_media_keys`
  - `tools/webpack-4`
  - `doc/public_api_typos`



<a name="code"></a>
## Code style ##################################################################

<a name="code-lint"></a>
### Linting ####################################################################

The code style in `src` is automatically checked by a "linter", `tslint`.

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

We try to be as strict as possible with types:

  - `any` types should be avoided

  - the `as` keyword should also be avoided as much as possible.

  - the `is` keyword is fine in some situations, but simpler solutions should be
    preferred.

This is to be sure we can detect as much as possible type errors automatically
with TypeScript.

Also, created TypeScript's `type` and `interface` should all be named beginning
with the letter I, for easier identification purposes.


<a name="code-forbidden"></a>
### Forbidden functions and classes ############################################

Some native functions, methods or classes should never be used to ensure
compatibility with every browsers. To work around those, we usually rely on
"ponyfills" which are JavaScript re-implementations.

This concerns the following static methods:
  - `Object.assign`: use the `object-assign` dependency instead
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



<a name="commit"></a>
## Creating a commit ###########################################################

<a name="commit-checks"></a>
### Checks #####################################################################

Every commits in a PR should pass our quick checks (linter, typescript check
and unit tests). To check if that's the case, you can run locally the `check`
script by calling `npm run check`.

In any case, the type checking and linting of the `src` directory is
automatically done before each commit thanks to a git hook.

Those checks allow us to guarantee that every merged commit in the `master`
branch is stable enough.

This gives us more confidence on our code and also allows  more advanced
debugging if we detect a regression by the usage of tools such as git-bisect.


<a name="commit-name"></a>
### Naming convention ##########################################################

We have a naming convention for commits, roughly under the form:
`namespace: what the commit does`.

Adding a paragraph (by setting multiple `-m` options to git-commit for
example) to explain why you did those modifications is preferred.

The `namespace` here describe here the area of the code the commit modifies.
It usually is one of the following:
  - `abr`
  - `api`
  - `bif`
  - `buffers`
  - `compat`
  - `dash`
  - `eme`
  - `errors`
  - `init`
  - `isobmff`
  - `manifest`
  - `matroska`
  - `pipelines`
  - `sami`
  - `smooth`
  - `source-buffers`
  - `srt`
  - `subtitles`
  - `tests`
  - `ttml`
  - `utils`
  - `webvtt`

But it could be any other values you feel to be consistent with that
convention.

This namespace helps us quickly evaluate the area of the code a commit impact,
to easily evaluate where testing need to be done and to better detect a
problematic commit if a regression is detected.



<a name="testing"></a>
## Testing #####################################################################

<a name="testing-unit"></a>
### Unit tests #################################################################

Unit tests test function implementations. Mostly to check if they give a sane
output for every input given.

Writing unit tests for new code is highly encouraged.

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


<a name="testing-memory"></a>
### Memory tests ###############################################################

Memory tests replicate simple scenarios and try to detect memory leaks.

Like integration tests, memory tests are not required for each new code.

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

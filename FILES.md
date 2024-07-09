# File architecture

This page describes how the player files are organized. Each chapter go through a single
directory or subdirectory, in alphabetical order.

## `demo/`: Demo applications

The `demo/` directory contains the demo page, an example application using the RxPlayer.

## `dist/`: Builds

The `dist/` directory stores the player builds of the last version released.

Directories can also be generated in here if the right scripts are called. These allow to
publish more modular codebases to npm.

## `doc/`: Documentation

The `doc/` directory contains the RxPlayer's documentation, mostly written in markdown, on
various subjects related to the rx-player:

- API documentation
- tutorials
- list of deprecated APIs...
- how to transition between RxPlayer versions
- how to contribute
- etc.

## `scripts/`: Project-managing scripts

The `scripts/` directory contains various scripts used to help the test and the management
of the player code.

For example:

- generating one of the demo and starting the server to run it
- deploying the demo or doc to github pages
- updating the player version
- generating the rx-player build before publishing on npm

## `src/`: The source code

The `src` directory contains the entire source code of the rx-player.

It is subdivized into subdirectories which are defined here.

### `src/compat/`: Compatibility files

`src/compat` contains functions allowing to use browser APIs in a cross-browser manner.

For example, if an event does not have the same name depending on the browser, the compat
files will expose a simple function allowing to make sure the event is catched, taking the
task of registering the right event on the callback given.

### `src/core/`: Core logic

Defines the core logic of the RxPlayer, regardless of the browser and of the streaming
technology used, that may optionally run in a WebWorker environment when the RxPlayer is
in `"multithread"` mode.

That's where the segments are downloaded and pushed to then be decoded by the browser, as
well as where the Manifest file is loaded and pared.

### `src/errors/`: Error definitions

Contains the definition of the error classes used in the rx-player and accessible through
the API.

### `src/experimental/`: Experimental features

You will find here experimental features. Those are tested features who might completely
change their API in new player versions.

### `src/features/`: Feature switching

This manage activated or deactivated features (e.g. DASH, TTML subtitles parsing).

It exports an object defining the different activated features and provide utils to
initialize and update them.

### `src/main_thread`: Main thread core logic

Defines the core logic of the RxPlayer that is always intended to only run in main thread,
even when a content is loaded in `"multithread"` mode.

It for example contains the public API, DRM-related logic, content-initialization logic
and other type of code. It then calls into `src/core` for the core logic part which may
optionally run in a WebWorker.

### `src/manifest/`: Manifest Object definition

Defines a common `Manifest` class, regardless of the streaming technology (DASH, HSS...).
This class is then used by the rest of the RxPlayer, to allow interaction with it without
considering the underlying technology used.

### `src/mse/`: MSE abstractions

Abstraction over Media Source Extensions API, which are the browser API allowing to buffer
media.

This allows to provide a common API to the rest of the RxPlayer's code regardless of the
environment (e.g. in a WebWorker without MSE API or in an environment with MSE API).

### `src/parsers/`: The parsers

Functions to parse various formats into the same interface.

The parsed data being either:

- Manifest documents: DASH's MPD, HSS's Manifest...
- containers: ISOBMFF (CMAF, fMP4, MP4), Matroska (MKV, WEBM)
- text tracks: TTML, SAMI, SRT, WebVTT
- image containers: BIF

### `src/tools/`: RxPlayer tools

This directory exports RxPlayer tools, which are standalone utilitary classes and function
which are not included in the `RxPlayer` media player API.

### `src/transports/`: Streaming protocols implementation

Defines a common interface for multiple streaming technologies (DASH, HSS).

What is exported there are functions to load:

- Manifests/MPDs
- video/audio segments
- subtitles tracks

For different streaming technologies.

As in most of the code of the rx-player, everything used in the other parts of the code is
exported in the index.js file at the root of this directory.

### `src/utils/`: Util functions

This directory contains general helpers which are used in different parts of the rx-player
code.

## `src/**/__tests__`: Unit tests

You will find multiple directories named `__tests__` in the RxPlayer. Those contain unit
tests and are put in the same directory than the code it tests.

Most unit tests files contain only tests for a single source file. Those will be put
directly at the root of `__tests__` under the name `<ORIGINAL_SRC_FILE>.test.ts` (where
`<ORIGINAL_SRC_FILE>` is the filename of the tested file).

`__tests__` directories can also contain files defining tests for multiple files contained
in the tested directory. Those can be quicker to write and easier to maintain at the
expense of being less thorough.

Those type of "global" unit tests are put in a special `__global__` directory, itself
directly at the root of the corresponding `__tests__` directory. Their filename don't
follow the same convention than single-source unit tests but should still be suffixed by
`.test.ts`.

## `tests/`: The RxPlayer's general tests

This directory contains most testing code for the RxPlayer.

The rx-player contains multiple type of tests:

- integration tests: test the whole player API and its behavior when playing different
  contents. The main goal of those tests is to quickly detect regressions.

  Those are entirely written in the `tests/integration` sub-directory.

- conformance tests: Provide standalone page which allows to quickly test the support of
  various media-related API on a given device and/or browser.

  The html documents you will find here are basic templates that can be easily modified
  and deployed for quick testing.

- unit tests: test specific parts of the code. The main goal here is to check the
  implementation of smaller units of code.

  They are written alongside the code, in `__tests__` directories.

- memory tests: test the memory usage of the player.

  They are entirely written in the `tests/memory` subdirectory.

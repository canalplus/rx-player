# File architecture ############################################################

This page describes how the player files are organized. Each chapter go through
a single directory or subdirectory, in alphabetical order.


## Table of Contents ###########################################################

- [demo/: Demos of rx-player implementations](#demo)
- [dist/: Player builds](#dist)
- [doc/: Player documentation](#doc)
- [scripts/: Tools and scripts](#scripts)
- [src/: the source code](#src)
  - [src/compat/: The compatibility files](#src-compat)
  - [src/core/: The core files](#src-core)
  - [src/errors/: Error definitions](#src-errors)
  - [src/experimental/: Experimental features](#src-experimental)
  - [src/features/: Feature switching](#src-features)
  - [src/manifest/: The Manifest class](#src-manifest)
  - [src/transports/: The transport protocols](#src-transports)
  - [src/parsers/: The parsing files](#src-parsers)
  - [src/typings/: Typescript typings](#src-typings)
  - [src/utils/: The utils](#src-utils)
- [src/core/: The core directory](#core)
  - [src/core/abr/: The adaptive bitrate code](#core-abr)
  - [src/core/api/: The API definition](#core-api)
  - [src/core/stream/: Load the right segments](#core-stream)
  - [src/core/eme/: Encryption management](#core-eme)
  - [src/core/fetchers/: The fetchers](#core-fetchers)
  - [src/core/segment_buffers/: The Media buffers](#core-sb)
  - [src/core/init/: Media streaming logic](#core-init)
- [src/**/__tests__: the unit tests directories](#src-tests)
- [tests/: the player's tests](#tests)


<a name="demo"></a>
## The demo/ directory: Demos of rx-player implementations #####################

Demonstration of functional codebases implementing the rx-player.

At the time of writing, there are two demos:

  - _full_: Demo with a graphic interface, written with the React library, to
    showcase what the player can do

  - _standalone_: Just expose the rx-player in ``window``, to allow scripted
    interactions with it in the console. The player is linked to a video tag in
    the displayed page.


<a name="dist"></a>
## The dist/ directory: Player builds ##########################################

Store the player builds of the last version released.

Contains two files: the minified (``rx-player.min.js``) and the non-minified
files (``rx-player.js``). Both are automatically generated with scripts at every
new release.

Two directories, namely ``_esm5.raw`` and ``_esm5.processed`` can also be
generated in here if the right scripts are called.
These allow to publish more modular codebases to npm.


<a name="doc"></a>
## The doc/ directory: Player documentation ####################################

Documentation, mostly in markdown, of various subjects related to the rx-player:
  - API documentation
  - tutorials
  - list of deprecated APIs...
  - how to transition between RxPlayer versions
  - etc.


<a name="scripts"></a>
## The scripts/ directory: scripts #####################################

Contains various scripts used to help the test and the management of the player
code.

For example:
  - generating one of the demo and starting the server to run it
  - deploying the demo or doc to github pages
  - updating the player version
  - generating the rx-player build before publishing on npm


<a name="src"></a>
## The src/ directory: the source code #########################################

The src contains the entire source code of the rx-player.

It is subdivized into subdirectories which are defined here.


<a name="src-compat"></a>
### src/compat/: The compatibility files #######################################

``src/compat`` contains functions allowing to use browser APIs in a
cross-browser manner.

For example, if an event does not have the same name depending on the browser,
the compat files will expose a simple function allowing to make sure the event
is catched, taking the task of registering the right event on the callback
given.

Every functions needed in the rest of the code are exported in
``compat/index.js``, making it easier to import (e.g. by just doing
``import { whatINeed } from "../compat";``)


<a name="src-core"></a>
### src/core/: The core files ##################################################

Defines the logic and behavior of the player, regardless of the browser and of
the streaming technology used.

That's where:
  - the api is defined
  - the MSE and EME APIs are called and managed
  - the segments are downloaded and pushed to then be decoded by the browser
  - adaptive bitrate strategies are set

This directory contains other subdirectories which are listed in the next
chapter.


<a name="src-errors"></a>
### src/errors/: Error definitions #############################################

Contains the definition of the error classes used in the rx-player and
accessible through the API.


<a name="src-experimental"></a>
### src/experimental/: Experimental features ###################################

You will find here experimental features. Those are tested features who might
completely change their API in new player versions.


<a name="src-features"></a>
### src/features/: Feature switching ###########################################

This manage activated or deactivated features (e.g. DASH, TTML subtitles
parsing).

It exports an object defining the different activated features and provide utils
to initialize and update them.


<a name="src-manifest"></a>
### src/manifest/: The Manifest class ##########################################

Defines a common `Manifest` class, regardless of the streaming technology (DASH,
HSS...). This class is then used by the rest of the RxPlayer, to allow
interaction with it without considering the underlying technology used.


<a name="src-transports"></a>
### src/transports/: The transport protocols ###################################

Defines a common interface for multiple streaming technologies (DASH, HSS).

What is exported there are functions to load:
  - Manifests/MPDs
  - video/audio segments
  - subtitles tracks

For different streaming technologies.

As in most of the code of the rx-player, everything used in the other parts of
the code is exported in the index.js file at the root of this directory.


<a name="src-parsers"></a>
### src/parsers/: The parsers ##################################################

Functions to parse various formats into the same interface.

The parsed data being either:
  - Manifest documents: DASH's MPD, HSS's Manifest...
  - containers: ISOBMFF (CMAF, fMP4, MP4), Matroska (MKV, WEBM)
  - text tracks: TTML, SAMI, SRT, WebVTT
  - image containers: BIF


<a name="src-typings"></a>
### src/typings/: Typescript typings ###########################################

This directory contains only declaration files for TypeScript. It is
automatically added as a `typeRoots` when the TypeScript code is transpiled.


<a name="src-utils"></a>
### src/utils/: The utils ######################################################

This directory contains general helpers which are used in different parts of the
rx-player code.


<a name="core"></a>
## The src/core/ directory #####################################################

As written in the previous chapter, this is the "core" of the player, where the
logic is defined.

As this directory is versatile and complicated, it also deserves its own chapter.


<a name="core-abr"></a>
### src/core/abr/: The adaptive bitrate code ###################################

Defines an ABRManager class which manages the adaptive streaming part of the
player.

This manager takes various observables/options as inputs to record the current
situation of the player, give an opinion about the best media tracks to choose,
and provide methods allowing to get/set various ABR-related options.

Despite containing several files and using several classes, only the ABRManager
defined in ``abr/index.js`` should be needed by the rest of the core.
This allows to isolate this complex part and facilitate future refactoring and
improvements.


<a name="core-api"></a>
### src/core/api/: The API definition ##########################################

Defines the rx-player API. This is the part the library user will directly
interact with.


<a name="core-stream"></a>
### src/core/stream/: Load the right segments ##################################

The code there calculate which segments should be downloaded, ask for their
download and push the segments into the `SegmentBuffers`.


<a name="core-eme"></a>
### src/core/eme/: Encryption management #######################################

Defines functions allowing to handle encrypted contents through the EME APIs.


<a name="core-fetchers"></a>
### src/core/fetchers/: The fetchers ###########################################

Handle the segments and Manifest downloading pipelines (load and parse) as
defined in the ``src/transports/`` directory.

This is the layer directly interacting with the transport part (HSS, DASH).
It facilitates the role of loading the Manifest and new segments for the rest of
the core.


<a name="core-sb"></a>
### src/core/segment_buffers/: The media buffers ###############################

Code allowing to interact with the media buffers called `SegmentBuffers`.

Those are the Objects to which segments are pushed so they can be decoded at the
right time.

For Audio and Video, `SegmentBuffers` rely on a native `SourceBuffer` object,
already provided by the browser,
for other type of contents (like subtitles), we rely on completely custom media
buffers implementations.


<a name="core-init"></a>
### src/core/init/: Content initialization #####################################

This is the central part which download manifests, initialize MSE and EME APIs,
instanciate the central `StreamOrchestrator` (which will allow to download and
push segments so the content can play) and link together many subparts of the
player.


<a name="src-tests"></a>
## src/**/__tests__: the unit tests directories ################################

You will find multiple directories named `__tests__` in the RxPlayer.
Those contain unit tests and are put in the same directory than the code it
tests.

Most unit tests files contain only tests for a single source file. Those will
be put directly at the root of `__tests__` under the name
`<ORIGINAL_SRC_FILE>.test.ts` (where `<ORIGINAL_SRC_FILE>` is the filename of
the tested file).

`__tests__` directories can also contain files defining tests for multiple files
contained in the tested directory.
Those can be quicker to write and easier to maintain at the expense of being
less thorough.

Those type of "global" unit tests are put in a special `__global__` directory,
itself directly at the root of the corresponding `__tests__` directory.
Their filename don't follow the same convention than single-source unit tests
but should still be suffixed by `.test.ts`.


<a name="tests"></a>
## The tests/ directory: the player's tests ####################################

This directory contains most testing code for the RxPlayer.

The rx-player contains multiple type of tests:

  - integration tests: test the whole player API and its behavior when playing
    different contents. The main goal of those tests is to quickly detect
    regressions.

    Those are entirely written in the ``tests/integration`` sub-directory.

  - conformance tests: Provide standalone page which allows to quickly test the
    support of various media-related API on a given device and/or browser.

    The html documents you will find here are basic templates that can be easily
    modified and deployed for quick testing.

  - unit tests: test specific parts of the code. The main goal here is to check
    the implementation of smaller units of code.

    They are written alongside the code, in ``__tests__``
    directories. All its configuration can be found at the root of the project,
    in `jest.config.js` (we use the jest library for unit tests).

  - memory tests: test the memory usage of the player.

    They are entirely written in the ``tests/memory`` subdirectory.

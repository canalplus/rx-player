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
  - [src/net/: The networking files](#src-net)
  - [src/parsers/: The parsing files](#src-parsers)
  - [src/typings/: Typescript typings](#src-typings)
  - [src/utils/: The utils](#src-utils)
- [src/core/: The core directory](#core)
  - [src/core/abr/: The adaptive bitrate code](#core-abr)
  - [src/core/api/: The API definition](#core-api)
  - [src/core/buffer/: The Buffer management](#core-buffer)
  - [src/core/eme/: Encryption management](#core-eme)
  - [src/core/pipelines/: The networking pipelines](#core-pipelines)
  - [src/core/source_buffers/: SourceBuffers definitions](#core-sb)
  - [src/core/stream/: Media streaming logic](#core-stream)
- [tests/: Test strategies and integration tests](#tests)


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
files (``rx-player.js``). Both are automatically generated with scripts.

Two directories, namely ``_esm5.raw`` and ``_esm5.minimal`` can also be
generated in here if the right scripts are called.
These allow to publish more modular codebases to npm.


<a name="doc"></a>
## The doc/ directory: Player documentation ####################################

Documentation, mostly in markdown, of various subjects related to the rx-player:

  - API documentation

  - code architecture documentation

  - documentation to help developpers (to use APIs, switch versions, know which
    APIs are deprecated)


<a name="scripts"></a>
## The scripts/ directory: scripts #####################################

Contains various scripts used to help the test and the management of the player
code.

For example:
  - deploying the demo or doc to github pages
  - updating the player version...


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
  - the buffer is managed
  - the MSE and EME APIs are called and managed
  - the segments are downloaded
  - ABR strategies are set

This directory contains other subdirectories which are listed in the next
chapter.


<a name="src-errors"></a>
### src/errors/: Error definitions #############################################

Contains the definition of the error classes used in the rx-player and
accessible through the API.


<a name="src-experimental"></a>
### src/experimental/: Experimental features ###################################

You will find here experimental features, which are features who might
completely change their API in each player version.


<a name="src-features"></a>
### src/features/: Feature switching ###########################################

This manage activated or deactivated features (e.g. DASH, TTML subtitles
parsing).

It exports an object defining the different activated features and provide utils
to initialize and update them.


<a name="src-manifest"></a>
### src/manifest/: The Manifest class ##########################################

Defines a common manifest class, regardless of the streaming technology (DASH,
HSS...).


<a name="src-net"></a>
### src/net/: The networking and files #########################################

Defines a common interface for multiple streaming technologies (DASH, HSS).

What is exported there are functions to load and parse:
  - manifests
  - video/audio segments
  - subtitles tracks
  - image tracks

For different streaming technologies.

As in most of the code of the rx-player, everything used in the other parts of
the code is exported in the index.js file at the root of this directory.


<a name="src-parsers"></a>
### src/parsers/: The parsing files ############################################

Functions to parse given formats (isobmff, ttml, sami etc.).


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


<a name="core-buffer"></a>
### src/core/buffer/: The Buffer management ####################################

The code there calculate which segments should be downloaded, ask for their
download and push the segments into the sourceBuffers.


<a name="core-eme"></a>
### src/core/eme/: Encryption management #######################################

Defines functions allowing to handle encrypted contents through the EME APIs.


<a name="core-pipelines"></a>
### src/core/pipelines/: The networking pipelines ##############################

Handle the segment downloading pipelines (resolve/load/parse) as defined in the
``src/net/`` directory.

This is the layer directly interacting with the transport part (HSS, DASH).
It facilitates the role of loading manifest and new segments for the rest of the
core.


<a name="core-sb"></a>
### src/core/source_buffers/: SourceBuffers definitions ########################

Provide multiple abstraction to manage SourceBuffers, which are the objects
through which media segments are added to the browser.

In this directory, you have code for both SourceBuffer managed natively (i.e.
Audio and Video SourceBuffers) and SourceBuffer implementations for other types
of content (text, images etc.).


<a name="core-stream"></a>
### src/core/stream/: Media streaming logic ####################################

Main logic for media streaming.

This is the central part which download manifests, initialize MSE and EME APIs,
instanciate new buffers and link together many subparts of the player.


<a name="tests"></a>
## The tests/ directory: Test strategies and integration tests #################

The rx-player contains both integration (test the whole player) and unit (test
parts of the code) tests.

Integration tests are entirely written in the ``tests/integration``
subdirectory.
As for unit tests, they are written alongside the code, in ``__tests__``
directories, the ``tests/unit`` directory only contains the configuration files
to launch them.

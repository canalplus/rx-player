# Fast DASH MPD parsing with the DASH-WASM parser ##############################

The RxPlayer provides two different "parsers" for DASH's Manifest format, a.k.a.
the "MPD":

  1. A JavaScript parser.

     Provided in the default "bundled" builds and through the `DASH` feature in
     the minimal build.

  2. A generally-faster WebAssembly parser.

     Only provided through the `DASH_WASM` experimental feature in the minimal
     build.

This page is the API documentation page for the second parser.



## Do I need this? #############################################################

When playing DASH contents, parsing its MPD file often become the most expensive
operation in terms of performance.

This is especially true when the MPD is sufficiently large (for example, we
often encounter MPD of several megabytes in size at Canal+) and when it needs
to be refreshed (e.g. some live contents).

Even for smaller MPDs, we observed that on some low-end devices (ChromeCast,
set-top box, some smart TVs) the parsing operation can noticeably lengthen the
content's loading time and in some rare occasions trigger brief rebuffering
periods.

If you encouter large MPDs and/or you noticed poor performance when playing DASH
contents, you may have a better experience with this parser.

Note however that your browser has to be compatible to WebAssembly.
In case WebAssembly is not supported on the current platform and both the
WebAssembly and default JavaScript DASH parsers are imported through their
respective features, the RxPlayer will automatically fallback on the latter.


### Why "experimental"? ########################################################

As every other "experimental" features in the RxPlayer, the WebAssembly MPD
parser should be stable in functional terms.

The "experimental" notion has more to do with the fact that its API can evolve
without impacting too much RxPlayer's semantic versioning.
For example, a new minor RxPlayer version could bring with it a complete API
change regarding this feature.
Still, potential changes would be fully documented and at least a link will be
added both to that release's release note and changelog file.

The choice of labeling this feature as experimental has been made so we can
have more freedom if we find ways to provide sensible improvements to it in the
future, in case they necessitate some incompatible API change.



## How to use it? ##############################################################

To use the WebAssembly-based parser you will need to do two things:

  - the WebAssembly file will have to be stored somewhere, accessible through an
    URL that can be then shared to the RxPlayer.

  - the `DASH_WASM` experimental feature has to be initialized with it and
    added to the RxPlayer

Don't worry, it is relatively straightforward.
The current chapter will explain everything you need to do.


### Quick code example  ########################################################

Let's begin by an heavily commented example of a code adding the DASH-WASM
feature to the RxPlayer.

It might be a lot to grasp now, we will focus on what has been done here step
by step in the next chapters.

```js
// Import the minimal RxPlayer
import RxPlayer from "rx-player/minimal";

// Import the function allowing to create the DASH-WASM parser
import { DASH_WASM } from "rx-player/experimental/features";

// Trigger request for the WebAssembly file.
// This function can be called at any point in time.
//
// Before it is called, the regular JS parser will be used instead
// (if it was added as a feature).
//
// As soon as both this function is called and the DASH_WASM feature is added
// (through RxPlayer's `addFeatures` static method) - in any order you wish -
// the RxPlayer will begin // to use the DASH_WASM parser for almost all
// future encountered MPDs (excluding some extremely rare conditions, such as
// non-UTF-8 MPDs).
DASH_WASM.initialize({ wasmUrl: "https://path/to/webassembly.wasm" });

// Add the DASH_WASM feature to the RxPlayer.
//
// This can be done before or after calling the `initialize` method on the
// `DASH_WASM` object, both actions will be needed to be able to use the
// WebAssembly parser.
RxPlayer.addFeatures([ DASH_WASM ]);
```


### Step 1: Obtaining the WebAssembly file #####################################

The RxPlayer will need to fetch the WebAssembly file to be able to run the
DASH-WASM parser.

You can find it at any of the following places:

  - With every release note published on GitHub (you should only use
    the files linked to the RxPlayer's version you're using), as
    `mpd-parser.wasm`.

  - It is also available as `dist/mpd-parser.wasm` from the root directory of
    the project.

    This file is also published on npm, which mean they might already be
    loaded in your project, for example in the node_modules directory (most
    probably in `node_modules/rx-player/dist/mpd-parser.wasm` depending on
    your project).
    `

Once you've retrieved the right WebAssembly file linked to your RxPlayer
version, you will need to store it and give its URL to the RxPlayer so it will
be able to load it.


### Step 2: using the minimal build of the RxPlayer ############################

The `DASH_WASM` feature is only available when using the "minimal" version of
the RxPlayer. That is, when the player is imported through the
`"rx-player/minimal"` path:
```js
import RxPlayer from "rx-player/minimal";
```

If you weren't using the minimal RxPlayer before, note that it necessitates that
you add the features you want to it.
More information about any of that can be found in the [minimal player
documentation](./minimal_player.md).

This documentation will especially dive into the `DASH_WASM` feature, which is
the WebAssembly parser for MPDs.


### Step 3: importing the `DASH_WASM` feature ##################################

As indicated before, the `DASH-WASM` feature is an "experimental" feature.

This is because although the feature is considered stable, its API may still
change at any new RxPlayer version (if this happens, changes on its API will be
explained on our CHANGELOG and this documentation will be updated).

As any experimental features, it needs to be imported through the
`rx-player/experimental/features` path:
```js
import { DASH_WASM } from "rx-player/experimental/features";
```


### Step 4: Initializing the feature ###########################################

--

_This step can be done before or after adding the `DASH_WASM` feature to the
RxPlayer (described as the next step)_

--

This step allows to provide the WebAssembly file to the `DASH_WASM` feature.

This is done through a method call on the imported `DASH_WASM` function called
`initialize`:
```js
DASH_WASM.initialize({ wasmUrl: "https://path/to/webassembly.wasm" });
```

As you can see, this function takes an object in argument which has for now a
single required property, `wasmUrl`, which should be the URL to the WebAssembly
file.

An important thing to consider is that `initialize` will immediately request the
WebAssembly file.

Once this function is called and once the feature is added to the RxPlayer (next
described step), the RxPlayer will try to use the WebAssembly parser when
possible (even if the WebAssembly request hasn't yet finished).

Note that initialization can fail, for example when WebAssembly is not available
or when the request fails. `initialize` returns a Promise so you can be notified
of a possible error if you wish:
```js
DASH_WASM.initialize({ wasmUrl: "https://path/to/webassembly.wasm" })
  .then(() => { console.log("everything went well!"); }),
  .catch((err) => { console.warn("Could not initialize WebAssembly", err); });
```

In the case where initialization fails, the RxPlayer will try to use the regular
`DASH` js parser instead, if that feature has been added. If it has not, an
error will be thrown when playing DASH contents.


### Step 4bis: Adding the feature to the RxPlayer ##############################

--

_This step can be done before or after "initializing" the `DASH_WASM` feature
(the aforementioned "step 4")._

--

To "link" the RxPlayer to the parser, you will need to call the `addFeatures`
static function on the minimal RxPlayer build, like every other features.
```js
import RxPlayer from "rx-player/minimal";

RxPlayer.addFeatures([ DASH_WASM ]);
```

Once both this step an the `initialize` method (on the `DASH_WASM` object) is
called, the RxPlayer will try to use the WebAssembly DASH_WASM parser by default
when encountering DASH contents.

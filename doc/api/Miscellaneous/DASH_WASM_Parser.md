# Fast DASH MPD parsing with the DASH-WASM parser

The RxPlayer provides two different "parsers" for DASH's Manifest format, a.k.a.
the "MPD":

1. A JavaScript parser.

   Provided in the default "bundled" builds and through the `DASH` feature in
   [the minimal build](../../Getting_Started/Minimal_Player.md).

2. A generally-faster WebAssembly parser.

   Only provided through the `DASH_WASM` feature.

This page is the API documentation page for the second parser.

## Do I need this?

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

Note however that your browser has to be compatible with WebAssembly.
In case WebAssembly is not supported on the current platform and both the
WebAssembly and default JavaScript DASH parsers are imported through their
respective features, the RxPlayer will automatically fallback on the latter.

## How to use it?

To use the WebAssembly-based parser you will need to do two things:

- the WebAssembly file will have to be stored somewhere, accessible through an
  URL that can be then communicated to the RxPlayer.

- the `DASH_WASM` feature has to be initialized with it and added to the
  RxPlayer.

Don't worry, it is relatively straightforward.
The current chapter will explain everything you need to do.

### Quick code example

Let's begin by an heavily commented example of a code adding the DASH-WASM
feature to the RxPlayer.

```js
// Import the RxPlayer
// (here through the "minimal" build, though it doesn't change for other builds)
import RxPlayer from "rx-player/minimal";

// Import the function allowing to create the DASH-WASM parser
import { DASH_WASM } from "rx-player/features";

// For this example, we will include the "embedded version" of the WebAssembly file
// You can also load it as a separate file for more efficiency
import { EMBEDDED_DASH_WASM } from "rx-player/experimental/features/embeds";

// Link parser to the WebAssembly file.
// This function can be called at any point in time.
//
// Before it is called, the regular JS parser will be used instead
// (if it was added as a feature).
//
// As soon as both this function is called and the DASH_WASM feature is added
// (through RxPlayer's `addFeatures` static method) - in any order you wish -
// the RxPlayer will begin to use the DASH_WASM parser for almost all
// future encountered MPDs (excluding some extremely rare conditions, such as
// non-UTF-8 MPDs).
DASH_WASM.initialize({ wasmUrl: EMBEDDED_DASH_WASM });

// Add the DASH_WASM feature to the RxPlayer.
//
// This can be done before or after calling the `initialize` method on the
// `DASH_WASM` object, both actions will be needed to be able to use the
// WebAssembly parser.
RxPlayer.addFeatures([DASH_WASM]);
```

### Step 1: Obtaining the WebAssembly file

The RxPlayer will need to fetch the WebAssembly file to be able to run the
DASH-WASM parser.

You can find it at any of the following places:

- The easiest way is to just import in your application its "embedded" version,
  exported through the `"rx-player/experimental/features/embeds"` path:

  ```js
  import { EMBEDDED_DASH_WASM } from "rx-player/experimental/features/embeds";
  ```

  This allows to bypass the need to store and serve this file separately.
  Note however that including this "embed" in your application may sensibly
  increase its size.

  If you would prefer more control and a smaller bundle size, you may instead
  consider the other following ways to load it as a separate file.
  This will lead to smaller file sizes and it will only be loaded on demand,
  but at a maintenance cost: you'll have to store and serve it yourself
  as well as not forget to update it each time you update the RxPlayer.

- With every release note published on GitHub (you should only use
  the files linked to the RxPlayer's version you're using), as
  `mpd-parser.wasm`.

- This file is also published on npm, which mean they might already be
  loaded in your project, for example in the `node_modules` directory (most
  probably in `node_modules/rx-player/dist/mpd-parser.wasm` depending on
  your project).

Once you've retrieved the right WebAssembly file linked to your RxPlayer
version, you will need to store it and give its URL to the RxPlayer so it will
be able to load it (the embedded version may be used directly instead, like an
URL, in the `initialize` method shown below).

### Step 2: importing the `DASH_WASM` feature

The `DASH_WASM` feature needs to be imported through the
`rx-player/features` path:

```js
import { DASH_WASM } from "rx-player/features";
```

### Step 3: Initializing the feature

--

_This step can be done before or after adding the `DASH_WASM` feature to the
RxPlayer (described as the next step)_

--

This step allows to provide the WebAssembly file to the `DASH_WASM` feature.

This is done through a method call on the imported `DASH_WASM` function called
`initialize`:

```js
DASH_WASM.initialize({ wasmUrl: URL_TO_DASH_WASM_FILE });
```

As you can see, this function takes an object in argument which has for now a
single required property, `wasmUrl`, which should be the URL to the WebAssembly
file, or to the embedded file if you went this route.

An important thing to consider is that `initialize` will immediately request the
WebAssembly file - unless the embedded version of the WebAssembly file has been
required in which case the file is loaded at the same time the embed is
imported.

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

### Step 3bis: Adding the feature to the RxPlayer

--

_This step can be done before or after "initializing" the `DASH_WASM` feature
(the aforementioned "step 4")._

--

To "link" the RxPlayer to the parser, you will need to call the `addFeatures`
static function on the RxPlayer, like any other feature.

```js
import RxPlayer from "rx-player/minimal";

RxPlayer.addFeatures([DASH_WASM]);
```

Once both this step an the `initialize` method (on the `DASH_WASM` object) is
called, the RxPlayer will try to use the WebAssembly DASH_WASM parser by default
when encountering DASH contents.

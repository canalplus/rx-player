# Building your own RxPlayer worker

## Preamble

The RxPlayer can rely on a
[`WebWorker`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) to run its
main logic, effectively running in a separate thread from your application.

If you're interested in this and haven't read it already, refer first to our
[MultiThreading](./MultiThreading.md) documentation to understand how to setup this.

## Overview

By default, the RxPlayer provide its own worker file. For most situations this is
sufficient and it can be relied on to easily enable our multithreading mode.

However there are some scenarios where you might want to prefer bundling your own worker
file instead:

- You want to set a
  [`representationFilter`](../api/Loading_a_Content.md#representationfilter),
  [`manifestLoader`](../api/Loading_a_Content.md#manifestloader) or a
  [`segmentLoader`](../api/Loading_a_Content.md#segmentloader) callback for a content
  loading in multithreading mode.

  Those run on the `WebWorker`-side and as such have to be declared on the RxPlayer
  worker.

- You want a different set of features than the one present by default in our worker file
  (which are `DASH` and `DASH_WASM`).

- You want to run your own bundling tool on this worker, e.g. because you want to
  transpile it to ES5-compatible code.

For those cases, we export the basis for our worker file through the
`rx-player/experimental/worker` path. You can just create a simple RxPlayer worker file
like this:

```js
// NOTE: This file is the worker bundle you will bundle independently from your
// application

import RxPlayerWorker from "rx-player/experimental/worker";
// import the features you want worker-side, here just `DASH`
import { DASH } from "rx-player/experimental/worker/features";

RxPlayerWorker.addFeatures([DASH]);

const rxPlayerWorker = new RxPlayerWorker();
```

This would then need to be bundled by you and the resulting bundle will be the file you
will have to provide (through an URL) to
[the `attachWorker` API](../api/MultiThread/attachWorker.md).

## Defining a `representationFilter`, `manifestLoader` or `segmentLoader` callback

As written in the previous chapter, one of the main advantage of creating your own worker
is to be able to define your own
[`representationFilter`](../api/Loading_a_Content.md#representationfilter),
[`manifestLoader`](../api/Loading_a_Content.md#manifestloader) and
[`segmentLoader`](../api/Loading_a_Content.md#segmentloader) callbacks.

Those can be respectively added worker-side through the `registerRepresentationFilter`,
`registerManifestLoader` and `registerSegmentLoader` API:

```js
// NOTE: This file is the worker bundle you will bundle independently from your
// application

import RxPlayerWorker from "rx-player/experimental/worker";
import { DASH } from "rx-player/experimental/worker/features";
RxPlayerWorker.addFeatures([DASH]);

const rxPlayerWorker = new RxPlayerWorker();

// To register a `representationFilter`
rxPlayerWorker.registerRepresentationFilter(
  // Give it a "name" through which it will be referenced from your application
  // bundle when you want to enable it.
  "my-representation-filter",
  // Same thing than your usual representation filter. Here filtering in only
  // 1080p video or less
  (representationInfo, context) => {
    if (context.trackType === "video") {
      const { width, height } = representationInfo;
      return width != null && height != null && width <= 1920 && height <= 1080;
    }

    // Otherwise, allow all non-video representations
    return true;
  },
);

// To register a `manifestLoader`
rxPlayerWorker.registerManifestLoader(
  "my-manifest-loader",
  // Same thing than your usual `manifestLoader`
  (manifestInfo, callbacks) => {
    /* ... */
  },
);

// To register a `segmentLoader`
rxPlayerWorker.registerSegmentLoader(
  "my-segment-loader",
  // Same thing than your usual `segmentLoader`
  (segmentInfo, callbacks) => {
    /* ... */
  },
);
```

As you can see, each of those three methods take a string as first argument which is the
`workerId` with which that callback will be identified.

In your regular application (not the worker anymore), you can then refer to that
identifier when loading a content like so:

```js
// ... Your application

rxPlayer.loadVideo({
  /* ... */
  representationFilter: {
    workerId: "my-representation-filter",
  },
  manifestLoader: {
    workerId: "my-manifest-loader",
  },
  segmentLoader: {
    workerId: "my-segment-loader",
  },
});
```

Because the content might fallback on main thread when "multithreading mode" is not
available (see [its limitations](./MultiThreading.md) for the list of reasons why), we
generally recommend however providing both the `workerId` and a fallback function for
cases where the content does not load in multithreading mode:

```js
// ... Your application

rxPlayer.loadVideo({
  /* ... */
  representationFilter: {
    // This one is declared with that name worker-side through your worker bundle
    // and will be used when the content loads in multithreading mode>
    workerId: "my-representation-filter",
    // This one s for when the content is loaded on main thread.
    fn: myRepresentationFilterFunction,
  },
  manifestLoader: {
    workerId: "my-manifest-loader",
    fn: myManifestLoaderFunction,
  },
  segmentLoader: {
    workerId: "my-segment-loader",
    fn: mySegmentLoaderFunction,
  },
});
```

Usually this means that the same functions may be declared both worker-side and in your
application. You can for example declare that function in its own independent file and
import it in both your worker and application bundles.

## Communicating between the main thread and the worker

Until now we have two different bundles (the worker bundle and your application bundle)
with no way to communicate between the two.

For example you might want to be able to configure your `representationFilter` before
loading a content or to send back information on each request each time a `segmentLoader`
is called.

To allow for those usages, three methods have been added on the worker-side (on an
`RxPlayerWorker`):

```js
// The usual set-up for the worker-side...
import RxPlayerWorker from "../dist/es2017/importable_worker";
import { DASH } from "../dist/es2017/features/worker/index";
RxPlayerWorker.addFeatures([DASH]);
const rxPlayerWorker = new RxPlayerWorker();

const onMainMessage = (value) => {
  // The `sendMessage` method, allowing to send messages back to your application
  rxPlayerWorker.sendMessage("pong", value);
};

// New method on an `RxPlayerWorker` to listen to messages coming from main thread.
rxPlayerWorker.addMessageListener("ping", onMainMessage);

// If you want to stop listening to those messages, you can call
// `removeMessageListener` with those same arguments
rxPlayerWorker.addMessageListener("ping", onMainMessage);
```

The 3 same methods also exists alongside your main application thanks to the new
[`getWorkerInterface` RxPlayer method](../api/MultiThread/getWorkerInterface.md):

```js
// Your application code ...

// Some RxPlayer setup
const rxPlayer = new RxPlayer({ videoElement });
rxPlayer.attachWorker({ workerUrl });

// The new API: `getWorkerInterface`
const workerInterface = rxPlayer.getWorkerInterface();

if (workerInterface === null) {
  console.warn("Could not initialize worker");
} else {
  // Mirror the event sent/receviced by the worker
  workerInterface.addMessageListener("pong", (value) => {
    console.warn("Worker responded back:", value);
  });

  workerInterface.sendMessage("ping", {
    someValue: "foo",
  });
}
```

If you want more information on how those API work, [take a look at `getWorkerInteface`'s
API documentation].

## Available features

By default, this "importable worker" comes with no support for any "transport protocol"
(e.g. "DASH", "Smooth" etc.) and so won't be able to play any content. The idea is to let
you reduce the size of that bundle by making it contain just what you want.

### The `addFeatures` static method

The `RxPlayerWorker` you import in your worker-side bundle also have an `addFeatures`
method, like the `RxPlayer`. This is this method you'll use to add features, providing it
the "features" (list below) that can be imported through the
`"rx-player/experimental/worker/features"` path:

```js
import RxPlayerWorker from "rx-player/experimental/worker";
import { DASH } from "rx-player/experimental/worker/features";

RxPlayerWorker.addFeatures([DASH]);

const rxPlayerWorker = new RxPlayerWorker();
```

### Features list

For now only the following features exist:

| Feature             | Description of the feature                                |
| ------------------- | --------------------------------------------------------- |
| `DASH` [1]          | Enable DASH playback using a JavaScript-based MPD parser  |
| `DASH_WASM` [1] [2] | Enable DASH playback using a WebAssembly-based MPD parser |
| `SMOOTH`            | Enable playback of Smooth Streaming contents              |
| `LOCAL_MANIFEST`    | Enable playback of "local" contents                       |

---

**Notes**:

**[1]**: In cases where both the `DASH` and `DASH_WASM` features are added (which are both
parsers for DASH contents), the RxPlayer will default using the WebAssembly parser
(provided by `DASH_WASM`) and fallback on the JavaScript parser (provided by `DASH`) when
it cannot do so.

**[2]** The `DASH_WASM` feature requires a WebAssembly file that has to be loaded
separately. This can be done in two ways: either you rely on that features' `initialize`
function ([corresponding documentation page](../api/Miscellaneous/DASH_WASM_Parser.md)),
or you'll provide the `wasmUrl` option to the
[`attachWorker`](../api/MultiThread/attachWorker.md) method on you application's side.

## Worker limitations

Note that this "worker bundle" will run in a
[WorkerGlobalScope](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope),
which operates in a separate thread from your main application. This environment has
several important limitations that affect what your worker code can do.

### Unavailable APIs

The following APIs are **not available** in the worker context:

- **DOM APIs**: No access to `document`, `window`, `HTMLElement`, or any DOM manipulation
- **Browser storage**: No `localStorage`, `sessionStorage`, or `indexedDB`
- **User interface**: No `alert()`, `confirm()`, `prompt()`
- **Navigation**: No `location` object or history manipulation
- **Parent object**: No access to the main thread's global scope

### Examples of what won't work:

```js
// These will throw errors in your worker:

// DOM access (you don't have access to the DOM in a WebWorker)
const videoElement = document.querySelector("video");

// Local storage
const setting = localStorage.getItem("userPreference");

// Window object (use `self` to refect to global object)
const screenWidth = window.innerWidth;
```

### Available APIs

Many JavaScript APIs are still available in workers:

- **Core JavaScript**: `JSON`, `Math`, `Date`, `Promise`, `setTimeout`, `setInterval`
- **Network requests**: `fetch()`, `XMLHttpRequest`
- **Performance**: `performance` object for timing measurements
- **Console**: `console.log()`, `console.error()`, etc.
- **Crypto**: `crypto` for cryptographic operations
- **Typed arrays**: `ArrayBuffer`, `Uint8Array`, etc.

### Communication Constraints

Variables and objects cannot be directly shared between main thread and worker, all
communication must happen through the `sendMessage` system:

```js
// Correct way to share data
rxPlayerWorker.sendMessage("config", { quality: "high" });
```

Moreover, only serializable data can be passed between threads:

```js
// These can be passed:
const validData = {
  string: "hello",
  number: 42,
  boolean: true,
  array: [1, 2, 3],
  object: { nested: "value" },
};

// These **CANNOT** be passed:
const invalidData = {
  function: () => console.log("hello"),
  domElement: document.querySelector("div"),
  symbol: Symbol("test"),
  undefined: undefined,
};
```

### Loading external dependencies

If your callbacks need external libraries, they must be imported in the worker bundle:

```js
// In your worker file
import externalLibrary from "some-library";

rxPlayerWorker.registerSegmentLoader("custom-loader", (segmentInfo, callbacks) => {
  // Now you can use externalLibrary here
  const processedData = externalLibrary.process(segmentInfo);
  // ...
});
```

### Performance considerations

- **Memory isolation**: Workers have their own memory space, so large objects are
  duplicated when passed
- **Communication latency**: Message passing between threads has small but measurable
  latency

### Common Pitfalls

#### Attempting to access main thread state

```js
// You cannot access objects defined in the main thread (e.g. `userSettings` here)
rxPlayerWorker.registerRepresentationFilter("filter", (rep, context) => {
  // This won't work: `userSettings` doesn't exist in worker
  if (userSettings.allowHighQuality) {
    return rep.bitrate < 5000000;
  }
});

// Correct approach: pass configuration via messages
rxPlayerWorker.addMessageListener("updateSettings", (settings) => {
  // Store settings in worker scope
  workerSettings = settings;
});
```

#### Forgetting async nature of communication

```js
// Wrong: expecting immediate response
let config = null:
rxPlayerWorker.sendMessage("getConfig");
rxPlayerWorker.addMessageListener("configResponse", (response) => {
  config = response;
});
// This won't work: config is not immediately available here
console.log(config.value);

// Correct: handle async communication
rxPlayerWorker.sendMessage("getConfig");
rxPlayerWorker.addMessageListener("configResponse", (config) => {
  console.log(config.value);
});
```

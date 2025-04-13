# attachWorker

## Short Description

Link the "RxPlayer Worker" to an RxPlayer instance, allowing to enable its
["multithreading" mode](../../Getting_Started/MultiThreading.md) when future contents are
loaded.

This call can only be done if the
[`MULTI_THREAD` feature](../../Getting_Started/Minimal_Player.md) has been added to the
RxPlayer.

## Overview

That WebWorker is a separate JavaScript file implementing the core RxPlayer logic that
needs to be first "attached" to your RxPlayer instance before it can run it in another
thread. The `attachWorker` method let you provide that worker file by doing a call like:

```js
player.attachWorker({ workerUrl });
```

You will first need to obtain a reference to that worker file, you can do this through
either ones of those means:

- The easiest way is to just import in your application its "embedded" version, exported
  through the `"rx-player/experimental/features/embeds"` path:

  ```js
  import { EMBEDDED_WORKER } from "rx-player/experimental/features/embeds";
  ```

  This allows to bypass the need to store and serve separately that file.

  If you would prefer more control and a smaller bundle size, you may instead consider the
  other following ways to load it as a separate file.

- With every release note published on GitHub as `worker.js` (you should only use the file
  linked to the RxPlayer's version you're using),

- It is also available as `dist/worker.js` from the root directory of the project
  published on npm. As such, it might already be found in your project's directory, for
  example in the `node_modules` directory (most probably in `node_modules/rx-player/dist/`
  depending on your project).

- For more advanced use cases (such as when relying on a
  [`representationFilter`](../Loading_a_Content.md#representationfilter),
  [`manifestLoader`](../Loading_a_Content.md#manifestloader) or a
  [`segmentLoader`](../Loading_a_Content.md#segmentloader) callback), you may want instead
  to define your [own worker bundle](../../Getting_Started/ImportableWorker.md).

This `attachWorker` method then returns a Promise which:

- resolves if the WebWorker could be attached with your RxPlayer instance with success.

- rejects if the initialization step failed with an error describing the issue. This can
  happen for example if the given URL is not reachable.

#### Example

```js
// Import the RxPlayer (here the minimal version, but it also works with the
// default import)
import RxPlayer from "rx-player/minimal";

// Import the MULTI_THREAD experimental feature
import { MULTI_THREAD } from "rx-player/experimental/features";

// To simplify this example, we'll directly import an "embedded" version of the
// supplementary code loaded by the `MULTI_THREAD` feature.
// We could also load it on demand through an URL
import { EMBEDDED_WORKER } from "rx-player/experimental/features/embeds";

// Add the MULTI_THREAD feature, like any other feature
RxPlayer.addFeatures([MULTI_THREAD]);

// Instantiate your player as usual
const player = new RxPlayer(/* your usual options */);

// After instantiation, you can at any time "attach" a WebWorker so any
// following `loadVideo` call can rely on it when possible.
player.attachWorker({ workerUrl: EMBEDDED_WORKER }).catch((err) => {
  console.error("An error arised while initializing the worker", err);
  // Note the if `attachWorker` rejects, the next `loadVideo` / `reload` calls
  // will not rely on the "multithread" mode anymore.
  //
  // However the last-loaded content may fail on error if it was already
  // loading in "multithread" mode.
});
```

## Syntax

```js
// Just linking a worker to an RxPlayer with the `MULTI_THREAD` feature:
const promise = player.attachWorker({ workerUrl });

// If the `DASH_WASM` feature is also included worker-side, you can also directly
// give a link to the corresponding `.wasm`: file like so;
const promise = player.attachWorker({ workerUrl, dashWasmUrl });
```

- **return value** `Promise`

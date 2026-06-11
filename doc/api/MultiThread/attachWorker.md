# attachWorker

## Short Description

Link the "RxPlayer Worker" to an RxPlayer instance, enabling its
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

You will first need to obtain a reference to that worker file. More information on how to
do this can be found in the
[Multithreading documentation](../../Getting_Started/MultiThreading.md).

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
// We could also load it on demand through a URL
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

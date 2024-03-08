# Running in MultiThreading mode

## Overview

The RxPlayer can rely on a
[`WebWorker`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) to run its
main logic, effectively running in a separate thread from your application.

Here is some high level schema of how the RxPlayer roughly works without and with a
WebWorker:

```
Running the RxPlayer without a WebWorker (the default):

+-------------------------------------------------------------------------------+
| Main thread (also running the UI)                                             |
|                                                                               |
| +------------------+     +----------------------+    +----------------------+ |
| | Your Application | --> |  RxPlayer Main [1]   | -> |   RxPlayer Core [2]  | |
| +------------------+     +----------------------+    +----------------------+ |
+-------------------------------------------------------------------------------+

Running with a WebWorker:

+----------------------------------------------------+
| Main thread (also running the UI)                  |
|                                                    |
| +------------------+      +----------------------+ |
| | Your Application | ---> |  RxPlayer Main [1]   | |
| +------------------+      +----------------------+ |
+--------------------------------------|-------------+
                                       | (messages)
+--------------------------------------|-------------+
| WebWorker                            V             |
|                           +----------------------+ |
|                           |  RxPlayer Core [2]   | |
|                           +----------------------+ |
+----------------------------------------------------+


[1] RxPlayer Main: Exposes an API to your application, performs some high-level
media monitoring, handles content decryption, displays text tracks and interacts
with web API that are only usable in the main thread.

[2] RxPlayer Core: Loads and parses the Manifest as well as media segments that
will be be played. Also monitors what's being played and will be played to
ensure a smooth playback.
```

This can be interesting for performance reasons, especially if you encounter one of the
following situations:

- Your application run on devices on which you can encounter performance issues. Here
  loading contents in a multithread mode might bring a better experience, such as a more
  responsive application and less rebuffering.

  We also noticed on various smart TV devices targeted by Canal+ noticeably far fewer
  unexpected media quality drops (and consequently, a much more stable video quality).
  This is because most of those drops were linked to heavy processing performed by the
  full application, which has an effect on the RxPlayer's adaptive and networking logic.

  When running in "multithread" mode, performance issues coming from the application will
  influence much less negatively the RxPlayer code (and vice-versa), as its main logic
  will run in a separate thread.

- Your application is very dynamic and you cannot afford to have a big media buffer (for
  example because you play live contents, because you're playing very high quality content
  on a device with limited memory or both).

  Here the issue is that lengthy computations started by your application may prevent
  temporarily the RxPlayer from loading new media data. If the media buffer is small to
  begin with, we may be left with playback being frozen if the end of the buffer is
  reached before the RxPlayer had time to load new media data.

  When running in "multithreading" mode, loading segments (and in browsers supporting the
  feature, even buffering segments) is perfomed concurrently to any computation linked to
  your user interface, ensuring that this important buffering operation can run without
  being blocked.

If you do not encounter those situations, the advantages of "multithread" mode may be less
evident. In any case, you may want to test that mode to see if it is improving your
application.

## About it being an "experimental" feature

This "multithread" mode is added as an "experimental" feature.

Like all other experimental features, it **is** considered stable enough to run in
production. What we mean by "experimental" in the RxPlayer API is just that we may change
its API at any RxPlayer version without impacting the RxPlayer's major version due to
semantic versionning principles.

For example, a new minor RxPlayer version could bring with it a complete API change
regarding the corresponding `MULTI_THREAD` feature. Still, potential changes would be
fully documented on that release's release note and changelog file.

The choice of labeling this feature as experimental has been made so we can have more
freedom if we find ways to provide sensible improvements to its API in the future.

## Quick start

You can just test this feature quickly by running the following code:

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

// Any further call to `loadVideo` may rely on WebWorker if possible (see
// limitations below)
player.loadVideo({
  /* ... */
});

// As a long as a content is loaded (or even loading or reloading), you can know
// if we rely on a WebWorker to play it by calling:
const currentModeInfo = player.getCurrentModeInformation();
if (currentModeInfo === null) {
  console.info("No content loaded."); // Note that this may also happen when an
  // error prevented the content from loading.
} else if (currentModeInfo.useWorker) {
  console.info("We're running the RxPlayer's main logic in a WebWorker!");
} else {
  console.info("We're running completely in main thread.");
}
```

## Limitations

Note that the `"multithread"` mode will only run on a `loadVideo` call if all the
following conditions are respected:

- Your supported platforms are compatible to the `WebWorker` browser feature (the great
  majority are).

- You've added the `MULTI_THREAD` feature to the `RxPlayer` class (as shown in examples)
  before that `loadVideo` call.

- You've called the `attachWorker` RxPlayer method (as shown in examples) before the
  `loadVideo` call on that same RxPlayer instance, and the returned Promise is either
  still pending or resolved (i.e. it hasn't rejected).

- You're playing a DASH content (through the `"dash"` `transport` option of the
  `loadVideo` call).

- You're not using any of those unsupported `loadVideo` options:

  - `manifestLoader`

  - `segmentLoader`

- If using the `representationFilter` `loadVideo` option is defined, it is under a string
  form (see
  [corresponding documentation page](../Loading_a_Content.md#representationfilter).

- You did not force the `"main"` mode through the
  [`mode` loadVideo option](../Loading_a_Content.md#mode).

- You did not dispose the RxPlayer

If any of those conditions may not be respected by your application, you might also want
to be able to rely on the usual "main" mode (which runs everything on main thread).

Thankfully, this is very easy to do:

- If you rely on the minimal build of the RxPlayer, ensure you've added the feature for
  the wanted streaming protocol(s).

  For example to both be able to play DASH contents on the main thread and through a
  WebWorker, you may do:

  ```js
  import RxPlayer from "rx-player/minimal";
  import { MULTI_THREAD } from "rx-player/experimental/features";
  import { DASH } from "rx-player/features";

  RxPlayer.addFeatures([
    // Allow DASH playback on the main thread
    DASH,

    // Allow DASH playback in "multithread" mode
    MULTI_THREAD,
  ]);

  // ...
  ```

- If you rely on the default RxPlayer build, you've nothing special to do, the `DASH` and
  `SMOOTH` features being already imported by default.

Also note that the `addFeatures` call and the `attachWorker` call may be performed in any
order and at any point in time, even after some contents have already been loaded. This
can for example allow dynamic importing of the `MULTI_THREAD` feature after some contents
have already been played on the main thread.

## How to rely on "multithread" mode

### Step 1: Obtaining the Worker file

The RxPlayer will need to be able to obtain an external file to be able to run in
multithread mode, `worker.js`, which is the code running in a WebWorker concurrently to
your application.

You can find it at any of the following places:

- The easiest way is to just import in your application its "embedded" version, exported
  through the `"rx-player/experimental/features/embeds"` path:

  ```js
  import { EMBEDDED_WORKER } from "rx-player/experimental/features/embeds";
  ```

  This allows to bypass the need to store and serve separately that file.

  If you would prefer more control and a smaller bundle size, you may instead consider the
  other following ways to it as a separate file.

- With every release note published on GitHub as `worker.js` (you should only use the file
  linked to the RxPlayer's version you're using),

- It is also available as `dist/worker.js` from the root directory of the project
  published on npm. As such, it might already be found in your project's directory, for
  example in the `node_modules` directory (most probably in `node_modules/rx-player/dist/`
  depending on your project).

#### Optional: Obtaining DASH WASM parser

Optionally, for very specific use-cases where you've seen improvements with it, you can
also rely on our [DASH WebAssembly parser](./DASH_WASM_Parser.md) in those "multithread"
scenarios. Note that this is unneeded for most usages.

To do this, you have to explicitely provide the corresponding WebAssembly file. Like for
the worker file, it can either be found:

- As an "embedded" version, exported through the
  `"rx-player/experimental/features/embeds"` path:

  ```js
  import { EMBEDDED_DASH_WASM } from "rx-player/experimental/features/embeds";
  ```

  Note however that the embedded version of this WebAssembly file is much bigger than the
  original file. If it is an issue for you, you might want to store and serve the
  WebAssembly file itself instead.

- With every release note published on GitHub as `mpd-parser.js` (like for `worker.js`,
  only use the one linked to the RxPlayer's version you're using),

- It is also available as `dist/mpd-parser.js` from the root directory of the project
  published on npm.

### Step 2: importing the `MULTI_THREAD` feature and adding it

The `MULTI_THREAD` feature, then needs to be imported through the
`rx-player/experimental/features` path and added to the RxPlayer's **class** (and not an
instance, `addFeatures` being a static method), like any other feature:

```js
// Import the RxPlayer
// (here through the "minimal" build, though it doesn't change for other builds)
import RxPlayer from "rx-player/minimal";
import { MULTI_THREAD } from "rx-player/experimental/features";

RxPlayer.addFeatures([MULTI_THREAD]);
```

The point of this step is to provide to the RxPlayer the logic to "link" to a WebWorker.
It is a form of dependency injection. That code is not present by default in RxPlayer
builds to reduce bundle size when that feature isn't needed.

### Step 3: Attaching a WebWorker to your RxPlayer instance

After instantiating an `RxPlayer`, you can link it to its own `WebWorker` by calling the
`attachWorker` method on this instance and by providing the `worker.js` file (and
optionally the `mpd-parser.wasm` file if you wanted WebAssembly capabilities) by providing
either its URL (obtained in step 1) or its embedded version:

```js
const player = new RxPlayer({
  /* ... */
});
player
  .attachWorker({ workerUrl: URL_TO_WORKER_FILE })
  .then(() => console.log("Worker succesfully attached!"))
  .catch((err) => {
    console.error("An error arised while initializing the worker", err);
  });

// NOTE: With the WebAssembly file, it would have been:
// player.attachWorker({
//     workerUrl: URL_TO_WORKER_FILE,
//     dashWasmUrl: URL_TO_DASH_WASM_FILE,
// })
// // ...
```

As you can see, `attachWorker` returns a Promise resolving once the Worker attachment
succeeded. It is not necessary to await this promise to load a content in "multithread"
mode.

If you don't await its returned promise before loading a content in "multithread" mode
however, note that in the rare scenario where that Promise would reject (for example if
the `workerUrl` or `dashWasmUrl` are not accessible or if security mechanisms prevents the
initialization of the Worker), the player may fail to load that content (in which case it
will trigger an `"error"` event for it). Once the Promise rejects, the RxPlayer, won't try
to load in "multithread" mode anymore (excepted cases where `attachWorker` is called
another time and if the [`mode` `loadVideo` option](../Loading_a_Content.md#mode) has been
set to `"multithread"`).

Consequently, unless you want to optimize the loading time of the first loaded content, it
can be considered safer and simpler to just await `attachWorker`'s returned Promise before
loading a content:

```js
const player = new RxPlayer({
  /* ... */
});
try {
  await player.attachWorker({
    workerUrl: URL_TO_WORKER_FILE,
    dashWasmUrl: URL_TO_DASH_WASM_FILE,
  });
  console.log("Worker succesfully attached!");
} catch (err) {
  console.warn("An error arised while initializing the Worker", err);
}

// This loaded content may only load in "multithread" mode if `attachWorker`
// succeeded
player.loadVideo({
  /* ... */
});
```

### Step 4: Load a content

That should be all!

Now all contents that are compatible with the "multithread" mode should rely on the
WebWorker. You can look at the limitations listed on this page to know what are the exact
conditions and how you can still rely on the regular "main" mode for other contents.

You can know at any time whether a loaded content is relying on a WebWorker ("multithread"
mode) or not ("main" mode), by calling the
[`getCurrentModeInformation` method](../Playback_Information/getCurrentModeInformation.md):

```js
const currentModeInfo = player.getCurrentModeInformation();
if (currentModeInfo === null) {
  console.info("No content loaded."); // Note that this may also happen when an
  // error prevented the content from loading.
} else if (currentModeInfo.useWorker) {
  console.info("We're running the RxPlayer's main logic in a WebWorker!");
} else {
  console.info("We're running completely in main thread.");
}
```

## Note about ES5 Environment

By default, the Worker file will use es2017 features which should be compatible to a
majority of devices.

However, some older devices might not be compatible with it yet still compatible to the
WebWorker API (and thus the `MULTI_THREAD` feature), yet not with ES2017. For those
platforms, the RxPlayer also provide an ES5 variant of the Worker file:

- The easiest way is to just import in your application its "embedded" version, exported
  through the `"rx-player/experimental/features/embeds"` path:

  ```js
  import { EMBEDDED_WORKER_ES5 } from "rx-player/experimental/features/embeds";
  ```

  This allows to bypass the need to store and serve separately that file.

  If you would prefer more control and a smaller bundle size, you may instead consider the
  other following ways to it as a separate file.

- With every release note published on GitHub as `worker.es5.js` (you should only use the
  file linked to the RxPlayer's version you're using),

- It is also available as `dist/worker.es5.js` from the root directory of the project
  published on npm. As such, it might already be found in your project's directory, for
  example in the `node_modules` directory (most probably in `node_modules/rx-player/dist/`
  depending on your project).

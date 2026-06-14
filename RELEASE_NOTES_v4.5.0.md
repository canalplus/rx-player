# Release v4.5.0 (TODO)

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
- [More complete `MULTI_THREAD` mode](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#multithread)
- [Application callbacks in the worker](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#worker-callbacks)
- [More explicit out-of-bound errors](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#timeinfo)
- [Safari and native HLS improvements](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#safari-hls)
- [DRM and device compatibility fixes](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#drm-compat)

<a name="overview"></a>

## :mag: Overview

The v4.5.0 is here, with a release mostly focused on making some recent v4
improvements more complete, more stable and easier to rely on in real
applications.

The biggest subject here is the `MULTI_THREAD` experimental feature.

Until now, it could already bring important performance advantages by moving
costly playback logic out of the main thread. However, it also had practical
limitations: not all transports could be used in that mode and applications had
less control over worker-side logic.

This release removes a large part of those limitations:

- most transport features can now be added worker-side, including `DASH`,
  `DASH_WASM`, `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`;

- applications can now define their own `representationFilter`,
  `segmentLoader` and `manifestLoader` callbacks worker-side;

- a large part of the monothreaded and multithreaded codebase has been merged
  internally, reducing duplicated logic and making future behavior differences
  between both modes less likely.

We also added more information to `MEDIA_TIME_BEFORE_MANIFEST` and
`MEDIA_TIME_AFTER_MANIFEST` errors, fixed multiple Safari / native-HLS edge
cases, improved thumbnail handling in multithreaded scenarios, fixed a memory
leak linked to quality changes, and added several DRM and device-specific
compatibility fixes.

In short, this release should make the RxPlayer easier to use in advanced
applications, especially those relying on multithreading, native HLS on Safari,
DRM contents and device-specific compatibility work-arounds.

<a name="changelog"></a>

## Changelog

### Features

- `MULTI_THREAD`: Allow applications to define their own
  `representationFilter`, `segmentLoader` and `manifestLoader` callbacks
  worker-side [#1719]
- `MULTI_THREAD`: Enable adding most transport features worker-side (`DASH`,
  `DASH_WASM`, `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`) to play them in
  `"multithreading"` mode [#1783]
- `MediaError` with the code `MEDIA_TIME_BEFORE_MANIFEST` and
  `MEDIA_TIME_AFTER_MANIFEST` now have a `timeInfo` property to explicit the
  exact boundaries and present position linked to the issue [#1838]

### Bug fixes

- Fix memory leak linked to quality changes [#1781]
- DRM: When a license request times out, now send a `KEY_LOAD_TIMEOUT` error
  instead of `KEY_LOAD_ERROR`
- DRM: Fix `"close-session"` handling that could unnecessarily close other DRM
  sessions
- On Safari when beginning at `0`, seek explicitly to `0` because their native
  HLS player would else start at live position [#1803]
- Ignore unhandled runtime track types for period advertisement [#1850]
- Fix `startAt.wallClockTime` on safari HLS live playlists [#1799]
- Fix rare scenario when an ended live audio content would not have its duration
  known until the end-of-stream [#1801]
- TTML: Do not apply percentage line heights anymore as they are sometimes
  subtly broken [#1812]
- Thumbnails: Fix shared thumbnail requests (through multiple `HTMLElement` for
  the same data) in `MULTI_THREAD` mode [#1830]
- Thumbnails: Fix thumbnail request sometimes being wrongly cancelled [#1810]
- API: Fix incomplete format in the initial `audioRepresentationChange` event
- CMCD: fix the `headers` CMCD `communicationType` [#1809]
- fix precision difference which triggered frequent content boundaries warnings
  [#1848]
- Compat: To fix an issue with some older LG TV when playing retro-compatible
  Dolby Vision contents, patch out some Dolby Vision-related ISOBMFF boxes in
  some conditions [#1818]
- Do not send two times a `streamEvent` after temporarily switching to the
  `RELOADING` state while playing it [#1828]
- Compat/DRM: Preserve `pssh` boxes in encrypted initialization segments on some
  DStv set-top boxes to fix playback of encrypted playback on them [#1822]
- Text: Continue playback if subtitle initialization fails instead of remaining
  stuck in `LOADING` [#1827]
- directfile: fix side effects for multiples instance of media element track
  store [#1845]
- directfile/compat: fix issue on Safari with startAt.fromLivePosition with
  directfile content when duration is infinite [#1842]

### Other improvements

- Adaptive bitrate: React faster to sudden bandwidth drops when playback is close
  to starving [#1831]
- Add `getMaximumPosition` and `getMinimumPosition` support when using directfile
  with HLS playlist on safari [#1800]
- CMCD: Avoid sending invalid CMCD values when playback rate is `0` or negative,
  and better escape string values [#1833]
- Fix ordering of a PeriodChange/AdaptationChange couple that may have previously
  led to unnecessary duplicate events [#1764]
- Text track id can only be string [#1785]
- The reload API now only throws if no `loadVideo` call has been made before
  [#1767]
- Use native base64-bytes conversion utils when they exist [#1786]
- Merge most of the multithreaded and monothreaded codebase to simplify
  maintainance [#1627]

<a name="multithread"></a>

## More complete `MULTI_THREAD` mode

The `MULTI_THREAD` feature is one of the most important optimizations available
in the RxPlayer today. It allows the RxPlayer to run most of its playback logic
inside a WebWorker instead of running everything in the same main thread than
the application.

This is especially useful on devices or applications where the main thread can
be busy, as it can reduce the risk of playback issues caused by UI work,
analytics, rendering, application state updates or other JavaScript tasks.

However, previous versions still had a practical limitation: not all transport
features could be initialized worker-side.

In `v4.5.0`, most transport features can now be added directly to the worker:

```javascript
import RxPlayer from "rx-player";
import {
  DASH,
  DASH_WASM,
  LOCAL_MANIFEST,
  METAPLAYLIST,
  MULTI_THREAD,
  SMOOTH,
} from "rx-player/features";

RxPlayer.addFeatures([MULTI_THREAD]);

const worker = new Worker("/worker.js");
RxPlayer.attachWorker(worker);

// Those features can now be added worker-side, depending on your build setup.
```

The exact way to bundle and initialize those features still depends on the
application build pipeline. Yet the important part is that using
`"multithreading"` mode should now be possible in many more setups than before.

<a name="worker-callbacks"></a>

## Application callbacks in the worker

Another important limitation with `MULTI_THREAD` was the handling of application
callbacks.

Applications often rely on custom logic when loading a content:

- a `representationFilter` to select which media qualities are allowed;

- a custom `manifestLoader` to load or transform the Manifest request;

- a custom `segmentLoader` to load media data through application-specific
  network logic.

In previous RxPlayer versions, this logic was naturally easier to provide in the
main thread. Yet when playing in `MULTI_THREAD` mode, the logic that needs those
callbacks may actually run in the worker.

Starting with this release, applications can define those callbacks worker-side.
This makes multithreaded playback a better fit for applications which already
centralize network, filtering or manifest logic in those APIs.

The main goal here is not only performance, it is also consistency: an
application should not have to choose between relying on its existing loading
logic and enabling `MULTI_THREAD`.

<a name="timeinfo"></a>

## More explicit out-of-bound errors

Some dynamic contents have a moving playable window. Because of that, an
application can sometimes ask for a position that is not available anymore, or
not available yet.

The RxPlayer already reported those cases through `MEDIA_TIME_BEFORE_MANIFEST`
and `MEDIA_TIME_AFTER_MANIFEST` errors.

In `v4.5.0`, those errors now expose a `timeInfo` property with more context on
the issue. This property indicates the concerned boundary and the position that
led to the error.

This should make it easier for applications to decide how to recover:

```javascript
rxPlayer.addEventListener("error", (error) => {
  if (
    error.code === "MEDIA_TIME_BEFORE_MANIFEST" ||
    error.code === "MEDIA_TIME_AFTER_MANIFEST"
  ) {
    console.warn("Position outside of the current Manifest bounds", error.timeInfo);
  }
});
```

This is especially useful for live or dynamic contents where the application may
want to display a specific message, retry at a corrected position, or adapt its
own UI to the available content boundaries.

<a name="safari-hls"></a>

## Safari and native HLS improvements

This release also improves multiple Safari and native-HLS scenarios.

When playing HLS contents natively on Safari, the browser may expose timing
information through its own media element APIs instead of through data parsed by
the RxPlayer. That can lead to subtle differences, especially for live contents
or when starting from a position relative to the live edge.

We fixed multiple cases around that:

- `startAt.wallClockTime` should now work better on Safari HLS live playlists;

- `startAt.fromLivePosition` is fixed for directfile contents when the duration
  is infinite;

- `getMinimumPosition` and `getMaximumPosition` are now supported when using
  directfile with HLS playlists on Safari;

- when explicitly beginning at `0`, the RxPlayer now also explicitly seeks to
  `0`, avoiding a Safari native-HLS behavior where playback could instead start
  at the live position.

Those are the kind of issues which usually only appear in production-like live
scenarios, so they should be especially useful for applications relying on
Safari native playback.

<a name="drm-compat"></a>

## DRM and device compatibility fixes

The release also brings several fixes and work-arounds for encrypted contents
and device-specific playback issues.

First, DRM license request timeouts now report the more precise
`KEY_LOAD_TIMEOUT` error instead of the more general `KEY_LOAD_ERROR`. This
should make error handling and monitoring easier for applications.

We also fixed a `"close-session"` behavior that could unnecessarily close other
DRM sessions. That kind of issue can be hard to diagnose from the application
side, because the visible effect may only be a later decryption failure or a
license request that appears to come from nowhere.

On compatibility matters, we also added or adjusted multiple low-level media
work-arounds:

- some Dolby Vision-related ISOBMFF boxes may now be patched out in specific
  conditions to fix playback on older LG TVs;

- `pssh` boxes are preserved in encrypted initialization segments on some DStv
  set-top boxes, where removing them prevented encrypted playback;

- subtitle initialization failures no longer leave playback stuck in `LOADING`.

None of those fixes should require application changes. They should just make
the RxPlayer more resilient on the corresponding contents and devices.


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
- [Application-defined worker logic](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#worker-callbacks)
- [More complete `MULTI_THREAD` transport support](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#multithread-transports)
- [A more shared core path internally](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#shared-core-path)
- [More explicit out-of-bound errors](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#timeinfo)
- [A few less surprising API behaviors](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#less-surprises)
- [Safari and native HLS improvements](https://github.com/canalplus/rx-player/releases/tag/v4.5.0#safari-hls)

<a name="overview"></a>

## :mag: Overview

The v4.5.0 is here, with a release mostly focused on making some recent v4 improvements
more complete, more stable and easier to rely on in real applications.

The biggest subject here is the `MULTI_THREAD` experimental feature, and more specifically
the possibility for applications to bring their own worker-side logic.

Until now, `MULTI_THREAD` could already bring important performance advantages by moving
costly playback logic out of the main thread. However, applications using custom
`manifestLoader`, `segmentLoader` or `representationFilter` callbacks had an important
limitation: that logic often had to stay on the main thread, because functions cannot just
be transparently sent to a WebWorker.

This release adds a new way to solve that: applications can now build their own RxPlayer
worker bundle, register their callbacks there, and refer to them when loading a content.

This is the main `MULTI_THREAD` improvement in `v4.5.0`.

We also made the feature more complete by allowing most transport features to be added
worker-side, including `DASH`, `DASH_WASM`, `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`.
This is an important step toward eventually removing the experimental label from
`MULTI_THREAD`, even if we are not doing that yet: the API is still intentionally
experimental so we can keep enough flexibility while we continue learning from real
applications.

Another large change is more internal: a large part of the monothreaded and multithreaded
codebase has been merged into a shared core path. This should simplify maintenance and
make future behavior differences between both modes less likely.

We also added more information to `MEDIA_TIME_BEFORE_MANIFEST` and
`MEDIA_TIME_AFTER_MANIFEST` errors, fixed multiple Safari / native-HLS edge cases,
improved thumbnail handling in multithreaded scenarios, fixed a memory leak linked to
quality changes, and brought several smaller API and playback behavior improvements.

In short, this release should make the RxPlayer easier to use in advanced applications,
especially those relying on custom loading logic, multithreading and native HLS on Safari.

<a name="changelog"></a>

## Changelog

### Features

- `MULTI_THREAD`: Allow applications to define their own `representationFilter`,
  `segmentLoader` and `manifestLoader` callbacks worker-side [#1719]
- `MULTI_THREAD`: Enable adding most transport features worker-side (`DASH`, `DASH_WASM`,
  `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`) to play them in `"multithreading"` mode
  [#1783]
- `MediaError` with the code `MEDIA_TIME_BEFORE_MANIFEST` and `MEDIA_TIME_AFTER_MANIFEST`
  now have a `timeInfo` property to make explicit the exact boundaries and present
  position linked to the issue [#1838]

### Bug fixes

- Fix memory leak linked to quality changes [#1781]
- DRM: When a license request times out, now send a `KEY_LOAD_TIMEOUT` error instead of
  `KEY_LOAD_ERROR`
- DRM: Fix `"close-session"` handling that could unnecessarily close other DRM sessions
- On Safari when beginning at `0`, seek explicitly to `0` because their native HLS player
  would else start at live position [#1803]
- Ignore unhandled runtime track types for period advertisement [#1850]
- Fix `startAt.wallClockTime` on safari HLS live playlists [#1799]
- Fix rare scenario when an ended live audio content would not have its duration known
  until the end-of-stream [#1801]
- TTML: Do not apply percentage line heights anymore as they are sometimes subtly broken
  [#1812]
- Thumbnails: Fix shared thumbnail requests (through multiple `HTMLElement` for the same
  data) in `MULTI_THREAD` mode [#1830]
- Thumbnails: Fix thumbnail request sometimes being wrongly cancelled [#1810]
- API: Fix incomplete format in the initial `audioRepresentationChange` event
- CMCD: fix the `headers` CMCD `communicationType` [#1809]
- fix precision difference which triggered frequent content boundaries warnings [#1848]
- Compat: To fix an issue with some older LG TV when playing retro-compatible Dolby Vision
  contents, patch out some Dolby Vision-related ISOBMFF boxes in some conditions [#1818]
- Do not send two times a `streamEvent` after temporarily switching to the `RELOADING`
  state while playing it [#1828]
- Compat/DRM: Preserve `pssh` boxes in encrypted initialization segments on some DStv
  set-top boxes to fix playback of encrypted playback on them [#1822]
- Text: Continue playback if subtitle initialization fails instead of remaining stuck in
  `LOADING` [#1827]
- directfile: fix side effects for multiples instance of media element track store [#1845]
- directfile/compat: fix issue on Safari with startAt.fromLivePosition with directfile
  content when duration is infinite [#1842]

### Other improvements

- Adaptive bitrate: React faster to sudden bandwidth drops when playback is close to
  starving [#1831]
- Add `getMaximumPosition` and `getMinimumPosition` support when using directfile with HLS
  playlist on safari [#1800]
- CMCD: Avoid sending invalid CMCD values when playback rate is `0` or negative, and
  better escape string values [#1833]
- Fix ordering of a PeriodChange/AdaptationChange couple that may have previously led to
  unnecessary duplicate events [#1764]
- Text track id can only be string [#1785]
- The reload API now only throws if no `loadVideo` call has been made before [#1767]
- Use native base64-bytes conversion utils when they exist [#1786]
- Merge most of the multithreaded and monothreaded codebase to simplify maintenance
  [#1627]

<a name="worker-callbacks"></a>

## Application-defined worker logic

Since `MULTI_THREAD` was introduced in `v4.0.0`, we had an uncomfortable limitation around
application callbacks.

Applications can define custom loading and filtering logic through options such as
`manifestLoader`, `segmentLoader` and `representationFilter`. Those can be used for
multiple advanced needs: peer-to-peer integrations, alternative application-known URLs,
request decoration, pre-processing of loaded data, or filtering out media qualities based
on application-specific constraints.

Yet in `MULTI_THREAD` mode, the logic needing those callbacks may run in a WebWorker.
Sending arbitrary JavaScript functions to a WebWorker is not something we can do reliably:
the browser only gives us message passing, which means serialization, and serialization
breaks common JavaScript assumptions such as closures, outer scope access and some
build-tool transformations.

We previously tried to work around that for `representationFilter` with a stringified
function format. It made the worker boundary explicit, but it was not very pleasant to
write nor to maintain, especially for applications relying on transpilation or shared
helper modules.

`v4.5.0` introduces a more natural solution for advanced applications: they can now build
the RxPlayer worker themselves, import the code they need in that worker bundle, register
worker-side callbacks there, and then reference those callbacks from the regular
`loadVideo` options.

For example, a worker bundle can now register a `representationFilter`:

```javascript
import RxPlayerWorker from "rx-player/experimental/worker";
import { DASH } from "rx-player/experimental/worker/features";
import createRepresentationFilter from "./create-representation-filter";

RxPlayerWorker.addFeatures([DASH]);

const rxPlayerWorker = new RxPlayerWorker();

rxPlayerWorker.registerRepresentationFilter(
  "limit-based-filter",
  createRepresentationFilter({ height: 1080, width: null }),
);
```

And the application can then reference that worker-side implementation when loading a
content:

```javascript
player.loadVideo({
  // ...
  representationFilter: {
    workerId: "limit-based-filter",

    // Optional fallback if playback falls back to monothreaded mode:
    fn: createRepresentationFilter({ height: 1080, width: null }),
  },
});
```

The same general mechanism also exists for `segmentLoader` and `manifestLoader`.

We also added APIs to communicate with the worker from the main application bundle. This
makes it possible to update worker-side state without rebuilding a new worker each time,
for example to update quality filtering constraints before loading a content.

This is the main functional step of this release for `MULTI_THREAD`: it makes the mode
compatible with much more application-specific logic, instead of forcing applications to
choose between their custom callbacks and worker-side playback logic.

<a name="multithread-transports"></a>

## More complete `MULTI_THREAD` transport support

Another important step for `MULTI_THREAD` is that most transport features can now be added
worker-side: `DASH`, `DASH_WASM`, `SMOOTH`, `LOCAL_MANIFEST` and `METAPLAYLIST`.

This is less about a new application-level capability than about making `MULTI_THREAD`
more complete.

For example, Smooth support needed a specific effort because its Manifest parser
historically relied on DOM APIs. Those APIs are not available in the same way from a
WebWorker, so the Smooth parser now relies on the same full-JS XML parser approach as our
DASH parser.

The result is that the difference between regular and multithreaded playback is now much
smaller. This is a milestone for the feature and for its documentation: fewer transports
need a special warning saying that they cannot be used in `"multithreading"` mode.

We still keep `MULTI_THREAD` under the experimental label for now. Removing it would imply
stronger API stability guarantees, and we still want some room to adjust the
worker-related APIs while applications start relying on this new worker-bundling approach.

<a name="shared-core-path"></a>

## A more shared core path internally

This release also contains a relatively big internal refactor: most of the monothreaded
and multithreaded code paths now share the same core interface.

Historically, those two modes had distinct initialization logic and some distinct
concepts. This made sense when `MULTI_THREAD` was introduced, but it also meant that a
behavior could differ between both modes just because we forgot to update two separate
implementations in the same way.

The new internal structure puts a thin communication layer between the main-thread
initialization code and the core playback logic:

- in `MULTI_THREAD` mode, that layer sends messages to and from the WebWorker;

- in monothreaded mode, it uses a simpler local communication mechanism.

The end goal is to remove duplicated logic and reduce accidental differences between both
modes. It should also make tests more valuable: when both modes go through more of the
same code, a test written for one mode is more likely to protect the other one too.

This is not supposed to change the public API directly. It is still worth mentioning
because it is a large maintenance change, and because it explains why this release
contains multiple small fixes around `MULTI_THREAD`, monothreaded Manifest updates and
event ordering.

<a name="timeinfo"></a>

## More explicit out-of-bound errors

Some dynamic contents have a moving playable window. Because of that, an application can
sometimes ask for a position that is not available anymore, or not available yet.

The RxPlayer already reported those cases through `MEDIA_TIME_BEFORE_MANIFEST` and
`MEDIA_TIME_AFTER_MANIFEST` errors.

In `v4.5.0`, those errors now expose a `timeInfo` property with more context on the issue.
This property indicates the concerned boundary and the position that led to the error.

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

This is especially useful for live or dynamic contents where the application may want to
display a specific message, retry at a corrected position, or adapt its own UI to the
available content boundaries.

<a name="less-surprises"></a>

## A few less surprising API behaviors

Outside of the bigger `MULTI_THREAD` work, this release also contains multiple small
changes whose common goal is to make the RxPlayer a little less surprising for
applications.

First, the `reload` API now throws in fewer cases.

Previously, one possible reason for `reload` to throw was when `reloadAt.relative` was
used before the RxPlayer had been able to know the previous content position. In practice,
this could force applications into awkward `try` / `catch` logic just because a previous
content did not reach the right state soon enough.

We now ignore that relative offset in that specific case instead of throwing. The `reload`
API can still throw if no `loadVideo` call has ever been made, as calling `reload` then
does not really make sense.

We also fixed an ordering issue between initial `AdaptationChange` and `PeriodChange`
messages. The visible symptom we found was a duplicate initial track-change event in a
multithreaded scenario. That did not break the public API contract, but the previous
ordering was not the most logical one: the RxPlayer should advertise the initially chosen
tracks before advertising the Period that depends on them.

Thumbnail handling also gained a few small fixes:

- cancelling one `renderThumbnail` request should no longer cancel the shared request
  pipeline still needed by another request for the same thumbnail;

- requesting a thumbnail outside of the available thumbnail range should now propagate the
  expected `NO_THUMBNAIL` error instead of a more generic `NOT_FOUND` error;

- shared thumbnail requests are now fixed in `MULTI_THREAD` mode too.

Finally, CMCD values are now more conservative in edge cases: we avoid sending some
optional values when the playback rate is `0` or negative, and string value escaping was
fixed. Those are small details, but they matter for applications using CMCD monitoring or
CDN-side interpretation.

<a name="safari-hls"></a>

## Safari and native HLS improvements

This release also improves multiple Safari and native-HLS scenarios.

When playing HLS contents natively on Safari, the browser may expose timing information
through its own media element APIs instead of through data parsed by the RxPlayer. That
can lead to subtle differences, especially for live contents or when starting from a
position relative to the live edge.

We fixed multiple cases around that:

- `startAt.wallClockTime` should now work better on Safari HLS live playlists;

- `startAt.fromLivePosition` is fixed for directfile contents when the duration is
  infinite;

- `getMinimumPosition` and `getMaximumPosition` are now supported when using directfile
  with HLS playlists on Safari;

- when explicitly beginning at `0`, the RxPlayer now also explicitly seeks to `0`,
  avoiding a Safari native-HLS behavior where playback could instead start at the live
  position.

Those are the kind of issues which usually only appear in production-like live scenarios,
so they should be especially useful for applications relying on Safari native playback.

---
id: deprecated_api
title: Deprecated APIs
sidebar_label: Deprecated APIs
slug: deprecated_api
---

This documentation lists APIs deprecated in the v3.x.x.

As we guarantee API compatibility in the v3.x.x, those API won't disappear until
we switch to a v4.x.x version.

You will find here which APIs are deprecated, why, and depending on the
concerned API, how to replace it.

## Fullscreen APIs

All fullscreen APIs have been deprecated, namely:

- the `isFullscreen` method
- the `setFullscreen` method
- the `exitFullscreen` method
- the `fullscreenChange` event

This is because of several things:

- fullscreen management has now become a lot more complex with features such
  as advanced subtitles management, were the text track HTMLElement is
  controlled by the application.

- most application developpers also wants to put their own controls into
  fullscreen mode. Those APIs only put the media element into fullscreen mode
  and not any other element. This can be misleading.

The fullscreen logic should now be entirely on the application-side. Replacement
code is provided for each of those APIs below.

## Image (BIF) APIs

The following properties methods and events have been deprecated:

- the `imageTrackUpdate` event
- the `getImageTrackData` method
- the `supplementaryImageTracks` loadVideo option

This is because most code linked to image management will be moved outside the
RxPlayer. Doing that will both be more flexible for users and much easier to
maintain for us (albeit with a small time of transition for the application).

You can replace those API by this new exported function:
[parseBifThumbnails](./api/tools/parseBifThumbnails.md).

To give more details about why those APIs have been deprecated, there are
multiple reasons:

1. How it should be specified for live contents of for multi-Period DASH
   contents is not clear enough.
2. Integrating it in the RxPlayer's API means that it had to take multiple
   choices that we prefer to let to the application: whether to retry the
   request if the it fails or if it is unavailable, whether to do the request
   at all for users with a low bitrate...
3. The task of displaying those thumbnails is ultimately on the UI-side (the
   part that know where the user wants to seek)
4. The biggest part of the code related to it was a simple BIF parser, that
   can easily be re-implemented by any application.

## RxPlayer Methods

The following RxPlayer methods are deprecated.

### getManifest

`getManifest` returns our internal representation we have of a given "manifest"
document.

Though it was first exposed to allow users to have access to more precize
information on the current content, this method also limited us on the possible
evolutions we could do, as changing what this function returns would mean
breaking the API.

We also realized that that method was not used for now by the implementation we
know of.

For now, we decided we will simply remove that API in the next major version. If
that's a problem for you, please open an issue.

### getCurrentAdaptations

`getCurrentAdaptations` returns an object describing each tracks available for
the current Period in the current content.

Like `getManifest`, we found that this API was not much used and limited us on
the possible evolutions we can do on the RxPlayer.

Again like `getManifest`, we plan to remove that API completely without
replacing it.
If that's a problem for you, please open an issue.

### getCurrentRepresentations

`getCurrentRepresentations` returns an object describing each "qualities"
available in the current chosen tracks.

Exactly like `getCurrentAdaptations` and `getManifest`, we found that this API:

- was not used as far as we know
- limited the evolutions we could do on the RxPlayer's code without breaking
  the API.

We thus plan to remove that API completely without replacing it.
If that's a problem for you, please open an issue.

### getNativeTextTrack

`getNativeTextTrack` returned the first `TextTrack` element attached to the
media element or `null ` if it did not exist.

This API was originally created to allow users to manipulate the `TextTrack`
element themselves. For example, to "catch" cues as they appear and display them
differently.

What changed is that we now have two text track modes:

- `html`, which allow advanced subtitle management
- `native`, the old mode, which display subtitles natively through a
  `TextTrack` element.

This API will only return an element for the `native` mode, but none for the
`html` mode because its element is not attached to the media element.

We heavily insist on people wanting advanced usecases to use the `html` mode, as
many formatting options do not work in `native` mode.

As we considered that `getNativeTextTrack` API was more confusing than it was
helpful in our current API, we decided to deprecate it. Do not hesitate to open
an issue if you use this API.

### isFullscreen

`isFullscreen` has been deprecated as it is part of our Fullscreen APIs, see
[the related chapter](#fullscreen-apis) for more information.

`isFullscreen` just checked that ANY element was fullscreen. As such, it can
easily be replace for the majority of browsers with the following code:

```js
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.mozFullScreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}
```

### setFullscreen

`setFullscreen` has been deprecated as it is part of our Fullscreen APIs, see
[the related chapter](#fullscreen-apis) for more information.

`setFullscreen` allowed to set the media element in fullscreen mode (or exit
fullscreen mode, if `false` was given as argument).

If you want to just put the media element on fullscreen mode, you can use the
following code:

```js
function setFullscreen(goFull) {
  if (goFull === "false") {
    exitFullscreen();
    return;
  }
  if (isFullscreen()) {
    // see code above
    return;
  }

  const mediaElement = player.getVideoElement();
  if (!mediaElement) {
    throw new Error("No media element");
  }
  if (mediaElement.requestFullscreen) {
    mediaElement.requestFullscreen();
  } else if (mediaElement.msRequestFullscreen) {
    mediaElement.msRequestFullscreen();
  } else if (mediaElement.mozRequestFullScreen) {
    mediaElement.mozRequestFullScreen();
  } else if (mediaElement.webkitRequestFullscreen) {
    mediaElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  }
}
```

Please consider however that this function will only put the media element in
full screen mode, without the eventual controls and HTML text tracks you might
also want to set in fullscreen. The code is easily adaptable however to put
your own element into fullscreen mode instead.

### exitFullscreen

`exitFullscreen` has been deprecated as it is part of our Fullscreen APIs, see
[the related chapter](#fullscreen-apis) for more information.

`exitFullscreen` just `exited` any element put in fullscreen mode. As such,
its code can easily be replaced by:

```js
function exitFullscreen() {
  if (isFullscreen()) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}
```

### getImageTrackData

`getImageTrackData` has been deprecated like most API related to BIF thumbnail
parsing.
You can read [the related chapter](#bif-apis) for more information.

You can replace this API by using the
[parseBifThumbnails](./api/tools/parseBifThumbnails.md) tool.

## RxPlayer Events

The following RxPlayer events has been deprecated.

### nativeTextTracksChange

`nativeTextTracksChange` events are deprecated. Which means they probably
won't be sent in a `v4.x.x` version.

The reasons are basically the same than for the `getNativeTextTracks` method.
It should not be needed anymore as most advanced needs should be better answered
by an `html` text track mode.

### fullscreenChange

`fullscreenChange` events have been deprecated as it is part of our Fullscreen
APIs, see [the related chapter](#fullscreen-apis) for more information.

The `fullscreenChange` event was sent when the media element got in or out of
fullscreen mode, with agg boolean as a payload:

- if `true`, the element entered fullscreen mode
- if `false`, the element exited fullscreen mode

This behavior can easily be recreated through the following code:

```js
const mediaElement = player.getVideoElement();
mediaElement.addEventListener("fullscreenChange", () => {
  if (isFullscreen()) {
    // see isFullscreen implementation above
    // do things
  } else {
    // do other things
  }
});
```

### imageTrackUpdate

`imageTrackUpdate` events have been deprecated like most API related to BIF
thumbnail parsing.
You can read [the related chapter](#bif-apis) for more information.

You can replace this API by using the
[parseBifThumbnails](./api/tools/parseBifThumbnails.md) tool.

## loadVideo options

The following loadVideo options are deprecated.

### defaultAudioTrack

[The `preferredAudioTracks` loadVideo
option](./api/basicMethods/loadVideo.md#preferredaudiotracks) is now the preferred
(no pun intended) solution to set the default audio track.
This new option allows to handle much more complex use cases and can even be
updated at any time through [the `setPreferredAudioTracks`
method](./api/trackSelection/setPreferredAudioTracks.md).

#### How to replace that option

It is very easy to replace `defaultAudioTrack` by `preferredAudioTracks`.

For example, if you want to have a default french audio language, you probably
previously did:

```js
player.loadVideo({
  url: myURL,
  transport: myTransport,

  defaultAudioTrack: { language: "fra", audioDescription: false },
  // or just `defaultAudioTrack: "fra"`, both are equivalent
});
```

Now you will have to set it through an array either when creating a new
RxPlayer:

```js
const player = new RxPlayer({
  preferredAudioTracks: [{ language: "fra", audioDescription: false }],
});
```

Or at any time, through the `setPreferredAudioTracks` method:

```js
player.setPreferredAudioTracks([{ language: "fra", audioDescription: false }]);
```

### defaultTextTrack

`defaultTextTrack` is replaced by [the `preferredTextTracks` constructor
option](./api/basicMethods/loadVideo.md#preferredtexttracks) for the same reason
than `defaultAudioTrack`.

#### How to replace that option

It is very easy to replace `defaultTextTrack` by `preferredTextTracks`.

For example, if you want to have a default swedish subtitle language, you
probably previously did:

```js
player.loadVideo({
  url: myURL,
  transport: myTransport,

  defaultTextTrack: { language: "swe", closedCaption: false },
  // or just `defaultTextTrack: "swe"`, both are equivalent
});
```

Now you will have to set it through an array either when creating a new
RxPlayer:

```js
const player = new RxPlayer({
  preferredTextTracks: [{ language: "swe", closedCaption: false }],
});
```

Or at any time, through the `setPreferredTextTracks` method:

```js
player.setPreferredTextTracks([{ language: "fra", closedCaption: false }]);
```

### supplementaryTextTracks

The `supplementaryTextTracks` has been deprecated for multiple reasons:

1. The main reason is that the behavior of this API is not defined for
   multi-Period DASH contents (nor for MetaPlaylist contents): Should we only
   add the subtitles for the first Period or should it be for every Period?
   How to define a different subtitles track for the first and for the second
   Period?

   Adding an external tool much less coupled to the RxPlayer move those
   questions entirely to the application, which should know more than us what
   to do in those different cases.

2. Its API was a little arcane because we had to make it compatible with every
   possible type of contents (i.e. DASH, Smooth, MetaPlaylist etc.) out there.

3. It did not work for Directfile contents yet. Although we could have made it
   compatible with them, we thought that this was the occasion to define a
   better API to replace it.

4. Its behavior was more complex that you would initially think of. For
   example, we could have to re-download multiple times the same subtitles
   file if manual garbage collecting was enabled.

5. All usages of that API that we know of were for Smooth or DASH VoD contents
   which sadly just omitted those subtitles tracks in their Manifest. The true
   "clean" way to fix the problem in that case is to do it at the source: the
   content.
   In this case, fixing it on the player-side should only be a temporary
   work-around (don't be scared, we still have an API replacement).

The new `TextTrackRenderer` tool which replace it is much more straightforward.
As an external tool which just reads and renders already-downloaded text
subtitles, its API and the extent of what it does should be much more simple.

It's also compatible with any type of contents, even when playing through an
other player.

#### How to replace that option

Every `supplementaryTextTracks` feature can be replaced by the
`TextTrackRenderer` tool.
Please bear in mind however that they are two completely different APIs, doing
the transition might take some time.

The `TextTrackRenderer` tool is documented [here](./api/tools/TextTrackRenderer.md).

### supplementaryImageTracks

The `supplementaryImageTracks` events have been deprecated like most API related
to BIF thumbnail parsing.
You can read [the related chapter](#bif-apis) for more information.

You can replace this API by using the
[parseBifThumbnails](./api/tools/parseBifThumbnails.md) tool.

### hideNativeSubtitle

The `hideNativeSubtitle` option is deprecated and won't be replaced.

This is because it was added at a time when our text track API was much less
advanced. Some applications wanted to handle subtitles themselves and thus hid
the true "native" subtitles to display them themselves in a better way.

However, this API seems to not be used anymore. Please open an issue if you need
it.

## RxPlayer constructor options

The following RxPlayer constructor options are deprecated.

### throttleWhenHidden

`throttleWhenHidden`has been deprecated as video visibility relies only on
page visibility API and document hiddenness.

A video should be visible if the Picture-In-Picture mode is activated, even
if the `hidden` attribute of `document` is set to `true`.

`throttleVideoBitrateWhenHidden` relies on both and can be used like this :

```js
const rxPlayer = new RxPlayer({
  // ... RxPlayer options
  // throttleWhenHidden: true [deprecated]
  throttleVideoBitrateWhenHidden: true,
});
```

## Other properties

Some very specific properties from various methods are deprecated.
You will find them here.

### Manifest

The `adaptations` property returned by the `Manifest` object you can obtain
through the `getManifest` call is deprecated.

This corresponds to the `adaptations` property of the first element in the
`periods` object from the same `Manifest` object, so it's very easy to
replace:

```js
const manifest = player.getManifest();

if (manifest && manifest.periods.length) {
  console.log(manifest.adaptations === manifest.periods[0].adaptations); // true
}
```

### Smooth

Setting a `*.wsx`, a `*.ism` or a `*.isml` URL as an `url` property in
`loadVideo` is now deprecated when we're talking about a Smooth Streaming
content.

We recommend to only set a Manifest URL in that property when the transport is
equal to `smooth`.

### NetworkError

The `xhr` property from a `NetworkError` is deprecated.

This is to prepare the support of low-latency streaming, with
[CMAF](https://mpeg.chiariglione.org/standards/mpeg-a/common-media-application-format),
where the `fetch` API has to be used instead of an `XMLHttpRequest`.

We recommend to not rely on this property anymore. You still should have access
to the `status` and `url` properties.

# Deprecated APIs

This documentation lists APIs deprecated in the v3.x.x.

As we guarantee API compatibility in the v3.x.x, those API won't disappear until
we switch to a v4.x.x version.

You will find here which APIs are deprecated, why, and depending on the
concerned API, how to replace it.

## Image (BIF) APIs

The following properties methods and events have been deprecated:

- the `imageTrackUpdate` event
- the `getImageTrackData` method
- the `supplementaryImageTracks` loadVideo option

This is because most code linked to image management will be moved outside the
RxPlayer. Doing that will both be more flexible for users and much easier to
maintain for us (albeit with a small time of transition for the application).

You can replace those API by this new exported function:
[parseBifThumbnails](../Tools/parseBifThumbnails.md).

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

### getImageTrackData

`getImageTrackData` has been deprecated like most API related to BIF thumbnail
parsing.
You can read [the related chapter](#bif-apis) for more information.

You can replace this API by using the
[parseBifThumbnails](../Tools/parseBifThumbnails.md) tool.

## RxPlayer Events

The following RxPlayer events has been deprecated.

### imageTrackUpdate

`imageTrackUpdate` events have been deprecated like most API related to BIF
thumbnail parsing.
You can read [the related chapter](#bif-apis) for more information.

You can replace this API by using the
[parseBifThumbnails](../Tools/parseBifThumbnails.md) tool.

## loadVideo options

The following loadVideo options are deprecated.

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

The `TextTrackRenderer` tool is documented [here](../Tools/TextTrackRenderer.md).

### supplementaryImageTracks

The `supplementaryImageTracks` events have been deprecated like most API related
to BIF thumbnail parsing.
You can read [the related chapter](#bif-apis) for more information.

You can replace this API by using the
[parseBifThumbnails](../Tools/parseBifThumbnails.md) tool.

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

### Smooth

Setting a `*.wsx`, a `*.ism` or a `*.isml` URL as an `url` property in
`loadVideo` is now deprecated when we're talking about a Smooth Streaming
content.

We recommend to only set a Manifest URL in that property when the transport is
equal to `smooth`.

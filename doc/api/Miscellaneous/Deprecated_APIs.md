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

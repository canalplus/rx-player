# RxPlayer methods

Several RxPlayer methods have been removed, renamed or updated.

They are all listed here.

## Removed methods

### `getAvailableAudioBitrates` / `getAvailableVideoBitrates`

Both the `getAvailableAudioBitrates` and `getAvailableVideoBitrates` methods
have been removed, like most bitrate-oriented API.

Its behavior is however easy to replace, just by using respectively the
[`getAudioTrack`](../../api/Track_Selection/getAudioTrack.md) and
[`getVideoTrack`](../../api/Track_Selection/getVideoTrack.md) methods:
```js
// instead of getAvailableVideoBitrates you can do
const videoTrack = rxPlayer.getVideoTrack();
if (videoTrack !== null && videoTrack !== undefined) {
  const availableVideoBitrates = video.representation
    .map(r => r.bitrate)
    .filter(bitrate => bitrate !== undefined);
}
```

Note however that one of the main reason for calling one of those method was to
change the currently playing bitrate and that such way of controlling the
quality has been removed in profit of the new representation lock API.
You can read the [Bitrate Selection part of the migration
guide](./Bitrate_Selection.md) for more information on this.


### `getVideoBitrate` / `getAudioBitrate`

Both the `getAudioBitrate` and `getVideoBitrate` methods have been removed,
like most bitrate-oriented API.

Its behavior is however easy to replace, just by using respectively the
// XXX TODO
[`getAudioRepresentation`](../../api/Representation_Selection/getAudioRepresentation.md) and
and
[`getVideoRepresentation`](../../api/Representation_Selection/getVideoRepresentation.md)
methods:
```js
// instead of getVideoBitrate you can do
const videoRepresentation = rxPlayer.getVideoRepresentation();
if (videoRepresentation !== null && videoRepresentation !== undefined) {
  console.log("Current video bitrate:", videoRepresentation.bitrate);
}
```

### `setAudioBitrate` / `setVideoBitrate` / `getManualAudioBitrate` / `getManualAudioBitrate`

The `setAudioBitrate`, `setVideoBitrate`, `getManualAudioBitrate` and
`getManualAudioBitrate` methods have all been removed, as documented in the
[Bitrate Selection part of the migration guide](./Bitrate_Selection.md).


### `setMinAudioBitrate` / `setMinVideoBitrate` / `getMinAudioBitrate` / `setMinAudioBitrate`

The `setMinAudioBitrate`, `setMinVideoBitrate`, `getMinAudioBitrate` and
`setMinAudioBitrate` methods have all been removed, as documented in the
[Bitrate Selection part of the migration guide](./Bitrate_Selection.md).


### `setMaxAudioBitrate` / `setMaxVideoBitrate` / `getMaxAudioBitrate` / `setMaxAudioBitrate`

The `setMaxAudioBitrate`, `setMaxVideoBitrate`, `getMaxAudioBitrate` and
`setMaxAudioBitrate` methods have all been removed, as documented in the
[Bitrate Selection part of the migration guide](./Bitrate_Selection.md).


### `getPreferredAudioTracks` / `getPreferredVideoTracks` / `getPreferredTextTracks`

The `getPreferredAudioTracks`, `getPreferredVideoTracks` and
`getPreferredTextTracks` methods have been removed.

Track preferences API does not exist anymore as documented in the
[Preferences part of the migration guide](./Preferences.md).


### `setPreferredAudioTracks` / `setPreferredVideoTracks` / `setPreferredTextTracks`

The `setPreferredAudioTracks`, `setPreferredVideoTracks` and
`setPreferredTextTracks` methods have been removed.

Track preferences API does not exist anymore as documented in the
[Preferences part of the migration guide](./Preferences.md).


### `getVideoPlayedTime`

The `getVideoPlayedTime` method has been removed because it was poorly
named, poorly understood, and it is easy to replace.

To replace it, you can write:
```js
function getVideoPlayedTime() {
  const position = rxPlayer.getPosition();
  const mediaElement = rxPlayer.getVideoElement();
  if (mediaElement === null) {
    console.error("The RxPlayer is disposed");
  } else {
    const range = getRange(mediaElement.buffered, currentTime);
    return range !== null ? currentTime - range.start :
  }
}

/**
 * Get range object of a specific time in a TimeRanges object.
 * @param {TimeRanges} timeRanges
 * @returns {Object}
 */
function getRange(timeRanges, time) {
  for (let i = timeRanges.length - 1; i >= 0; i--) {
    const start = timeRanges.start(i);
    if (time >= start) {
      const end = timeRanges.end(i);
      if (time < end) {
        return { start, end };
      }
    }
  }
  return null;
}
```


### `getVideoLoadedTime`

The `getVideoLoadedTime` method has been removed because it was poorly
named, poorly understood, and it is easy to replace.

To replace it, you can write:
```js
function getVideoLoadedTime() {
  const position = rxPlayer.getPosition();
  const mediaElement = rxPlayer.getVideoElement();
  if (mediaElement === null) {
    console.error("The RxPlayer is disposed");
  } else {
    const range = getRange(mediaElement.buffered, currentTime);
    return range !== null ? range.end - range.start :
                            0;
  }
}

/**
 * Get range object of a specific time in a TimeRanges object.
 * @param {TimeRanges} timeRanges
 * @returns {Object}
 */
function getRange(timeRanges, time) {
  for (let i = timeRanges.length - 1; i >= 0; i--) {
    const start = timeRanges.start(i);
    if (time >= start) {
      const end = timeRanges.end(i);
      if (time < end) {
        return { start, end };
      }
    }
  }
  return null;
}
```


### `getManifest`

The `getManifest` method has been removed with no replacement because it exposed
the RxPlayer's internals too much.

If you needed it for something, please open an issue explaining which property
you needed.


### `getCurrentAdaptations`

The `getCurrentAdaptations` method has been removed with no replacement because it
exposed the RxPlayer's internals too much.

If you needed it for something, please open an issue explaining which property
you needed.


### `getCurrentRepresentations`

The `getCurrentRepresentations` method has been removed with no replacement
because it exposed the RxPlayer's internals too much.

If you needed it for something, please open an issue explaining which property
you needed.


### `isFullscreen` / `setFullscreen` / `exitFullscreen`

The `isFullscreen`, `setFullscreen` and `exitFullscreen` methods have been
removed.

Fullscreen functionalities now have to be completely handled by the
applications, which most likely already did just that anyway.


### `getNativeTextTrack`

The `getNativeTextTrack` methods has been removed.

This method was initially added for legacy reasons and should not be relied on
anymore.


### `getImageTrackData`

All image-related API, like the `getImageTrackData` method, have been removed.

If you need to parse BIF file, you can use the
[`parseBifThumbnails`](../../api/Tools/parseBifThumbnails.md) tool instead.


## Renamed

### `getUrl`

The `getUrl` has both be updated and renamed, into the
[`getContentUrls`](../../api/Content_Information/getContentUrls.md) method.

However `getContentUrls` returns an optional array of URL (all URLs at which
the content can be reached) whereas `getUrl` only provided a single one.

If you want to replicate `getUrl`'s behavior, you may want to only use the
first string optionally returned by `getContentUrls`.


### `getVideoDuration`

The `getVideoDuration` method has been renamed `getMediaDuration` to prevent
confusion with the duration of the video track.


### `getVideoBufferGap`

The `getVideoDuration` method has been renamed `getCurrentBufferGap` to prevent
confusion with the buffer gap specific to the video buffer.


## Updated

## `getPlayerState`

Two player states have been updated:

  - The `"FREEZING"` state has been added to the possible states sent through
    the `playerStateChange` event.

    This new state, which is sent when playback does not advance despite
    the fact that the right conditions for it are there, is described in the
    [overview](./Overview.md).

    In many case, you might want to handle it like a `"BUFFERING"` state.

  - The `RELOADING` player state can now happen at any time if it allows to
    unlock playback.

    Previously, it could only be sent if specific options have been used.


### `getAvailableVideoTracks` / `getVideoTrack`

Several properties that can be received in a `getAvailableVideoTracks` or
`getVideoTrack` call, to describe a video Representation (in the
`representations` property of tracks returned by both methods), have been
updated:

  - A Representation's `frameRate` property is now either a number - in terms
    of frame per seconds - or `undefined`, instead of a string.

  - A Representation's `bitrate` property can now be `undefined` if unknown.


### `getAvailableAudioTracks` / `getAudioTrack`

The `bitrate` property that can be retrieved as a child property of the
`representations` property, itself found in tracks returned by the
`getAvailableAudioTracks` and `getAudioTrack` methods, can now be
`undefined` if unknown.

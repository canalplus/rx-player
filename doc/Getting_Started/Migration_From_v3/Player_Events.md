# RxPlayer events

RxPlayer events can be listened to thanks to the `addEventListener` method of
the RxPlayer.

Many of them have changed in the v4.0.0. They are all listed here.


## `playerStateChange`

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


### `audioBitrateChange` / `videoBitrateChange`

Both the `audioBitrateChange` and `videoBitrateChange` events have been removed.

They can however completely be replaced by respectively the more powerful
[`audioRepresentationChange`](../../api/Player_Events.md#audiorepresentationchange)
and
[`videoRepresentationChange`](../../api/Player_Events.md#videorepresentationchange)
events.

Both new events do not communicate directly the bitrate, but the
`Representation` which each may contain a `bitrate` property:
```js
// What was previously written
rxPlayer.addEventListener("videoBitrateChange", (bitrate) => {
  if (bitrate === -1) {
    console.log("video bitrate unknown or no video Representation playing");
  } else {
    console.log("new video bitrate:", bitrate);
  }
});

// Can now be written as
rxPlayer.addEventListener("videoRepresentationChange", (representation) => {
  if (representation === null) {
    console.log("no video Representation playing");
  } else if (representation.bitrate === undefined) {
    console.log("video bitrate unknown");
  } else {
    console.log("new video bitrate:", representation.bitrate);
  }
});
```


###  `availableAudioBitratesChange` / `availableVideoBitratesChange`

The `availableAudioBitratesChange` and  `availableVideoBitratesChange` API have
been removed like most bitrate-oriented API.

If you want to know when the list of audio and video bitrates for the current
Period changes, you can listen to respectively when the current audio track
changes through the
[`audioTrackChange`](../../api/Player_Events.md#audiotrackchange) event and when
the current video track changes through the
[`videoTrackChange`](../../api/Player_Events.md#videotrackchange) event.

There's a last potential situation for the bitrates changing, which is when the
track doesn't change but the list of bitrate does. For example this may happen
when some qualities in the current video or audio track are found to be
undecipherable.

Sadly, there's no way for now to be notified when this last event happens. If
you need this, please open an issue.


### `decipherabilityUpdate`

The `decipherabilityUpdate` event has been removed with no replacement.

Indeed, it was unused as far as we know and exposed too much of the RxPlayer
internals.

If you need this, please open an issue.


### `positionUpdate`

The `maximumBufferTime` property from `positionUpdate` events has been renamed
`maximumPosition`, to align with the other APIs.


### `periodChange`

The [`periodChange`](../../api/Player_Events.md#periodchange) is still present
but its payload has been reduced to its core properties. See its documentation
for more information.


### `fullscreenChange`

The deprecated `fullscreenChange` event has been removed.

Fullscreen functionalities now have to be completely handled by the
applications, which most likely already did just that anyway.


### `nativeTextTracksChange`

The deprecated `nativeTextTracksChange` event has been removed.

This event was initially added for legacy reasons and should not be relied on
anymore.


### `bitrateEstimationChange`

The `bitrateEstimationChange` event has been removed.

It has been removed because it was poorly understood (it's not always close to
the expected bandwidth), because it actually has a very complex relationship
with the chosen quality and because its structure prevented us to make some
evolutions to the RxPlayer internals.


### `imageTrackUpdate`

All image related API, like the `imageTrackUpdate` event, have been removed.

If you need to parse BIF file, you can use the
[`parseBifThumbnails`](../../api/Tools/parseBifThumbnails.md) tool instead.

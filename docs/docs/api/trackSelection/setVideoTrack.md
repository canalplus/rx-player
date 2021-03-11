---
id: setVideoTrack-api
title: setVideoTrack method
sidebar_label: setVideoTrack
slug: setVideoTrack
---

---

**syntax**: `player.setVideoTrack(videoTrackId)`

**arguments**:

- _videoTrackId_ (`string|Number`): The `id` of the track you want to set

---

Change the current video track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
`getAvailableVideoTracks` method.

Setting a new video track when a previous one was already playing can lead the
rx-player to "reload" this content.

During this period of time:

- the player will have the state `RELOADING`
- Multiple APIs linked to the current content might not work.
  Most notably:
  - `play` will not work
  - `pause` will not work
  - `seekTo` will not work
  - `getPosition` will return 0
  - `getWallClockTime` will return 0
  - `getVideoDuration` will return `NaN`
  - `getAvailableAudioTracks` will return an empty array
  - `getAvailableTextTracks` will return an empty array
  - `getAvailableVideoTracks` will return an empty array
  - `getTextTrack` will return `null`
  - `getAudioTrack` will return `null`
  - `setAudioTrack` will throw
  - `setTextTrack` will throw

:::note

Note for multi-Period contents:

This method will only have an effect on the [Period](../../glossary.md#period) that is
currently playing.
If you want to update the track for other Periods as well, you might want to
either:

- update the current video track once a `"periodChange"` event has been
  received.
- update first the preferred video tracks through the
  [setPreferredVideoTracks](./setPreferredVideoTracks.md) method.

:::

:::caution

This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)) when either :

- No video track API is supported on the current browser
- The media file tracks are not supported on the browser

:::

---
id: getVideoTrack-api
title: getVideoTrack method
sidebar_label: getVideoTrack
slug: getVideoTrack
---

---

**syntax**: `const videoTrack = player.getVideoTrack()`

**return value**: `Object|null|undefined`

---

Get information about the video track currently set.
`null` if no video track is enabled right now.

If a video track is set and information about it is known, this method will
return an object with the following properties:

- `id` (`Number|string`): The id used to identify this track. No other
  video track for the same [Period](../../glossary.md#period) will have the same
  `id`.

  This can be useful when setting the track through the `setVideoTrack`
  method.

- `representations` (`Array.<Object>`):
  [Representations](../../glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.
    No other Representation from this track will have the same `id`.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per
    seconds.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The video codec the Representation is
    in, as announced in the corresponding Manifest.

  - `frameRate` (`string|undefined`): The video frame rate.

- `signInterpreted` (`Boolean|undefined`): If set to `true`, the track is
  known to contain an interpretation in sign language.
  If set to `false`, the track is known to not contain that type of content.
  If not set or set to undefined we don't know whether that video track
  contains an interpretation in sign language.

`undefined` if no video content has been loaded yet or if its information is
unknown.

:::note
Note for multi-Period contents:

This method will only return the chosen video track for the
[Period](../../glossary.md#period) that is currently playing.
:::

:::caution
In _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)), if there is
no video tracks API in the browser, this method will return `undefined`.
:::

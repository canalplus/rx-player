---
id: getAvailableVideoTracks-api
title: getAvailableVideoTracks method
sidebar_label: getAvailableVideoTracks
slug: getAvailableVideoTracks
---

---

**syntax**: `const videoTracks = player.getAvailableVideoTracks()`

**return value**: `Array.<Object>`

---

Returns the list of available video tracks for the current content.

Each of the objects in the returned array have the following properties:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setVideoTrack`.

- `active` (`Boolean`): Whether this track is the one currently
  active or not.

- `representations` (`Array.<Object>`):
  [Representations](../../glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per
    seconds.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The video codec the Representation is
    in, as announced in the corresponding Manifest.

  - `frameRate` (`string|undefined`): The video framerate.

- `signInterpreted` (`Boolean|undefined`): If set to `true`, the track is
  known to contain an interpretation in sign language.
  If set to `false`, the track is known to not contain that type of content.
  If not set or set to undefined we don't know whether that video track
  contains an interpretation in sign language.

:::note
Note for multi-Period contents:

This method will only return the available tracks of the
[Period](../../glossary.md#period) that is currently playing.
:::

:::caution
In _DirectFile_ mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)), if there are no supported
tracks in the file or no track management API this method will return an empty
Array.
:::

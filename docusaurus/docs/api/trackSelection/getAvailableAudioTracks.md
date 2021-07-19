---
id: getAvailableAudioTracks-api
title: getAvailableAudioTracks method
sidebar_label: getAvailableAudioTracks
slug: getAvailableAudioTracks
---

---

**syntax**: `const audioTracks = player.getAvailableAudioTracks()`

**return value**: `Array.<Object>`

---

Returns the list of available audio tracks for the current content.

Each of the objects in the returned array have the following properties:

- `active` (`Boolean`): Whether the track is the one currently active or
  not. Only maximum one audio track can be active at a time.

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setAudioTrack`.

- `language` (`string`): The language the audio track is in, as set in
  the [Manifest](../../glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `audioDescription` (`Boolean`): Whether the track is an audio
  description of what is happening at the screen.

- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a
  "dub", meaning it was recorded in another language than the original.
  If set to `false`, we know that this audio track is in an original language.
  This property is `undefined` if we do not known whether it is in an original
  language.

- `representations` (`Array.<Object>`):
  [Representations](../../glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per
    seconds.

  - `codec` (`string|undefined`): The audio codec the Representation is
    in, as announced in the corresponding Manifest.

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

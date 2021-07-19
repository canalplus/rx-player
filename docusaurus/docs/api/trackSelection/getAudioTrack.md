---
id: getAudioTrack-api
title: getAudioTrack method
sidebar_label: getAudioTrack
slug: getAudioTrack
---

---

**syntax**: `const audioTrack = player.getAudioTrack()`

**return value**: `Object|null|undefined`

---

Get information about the audio track currently set.
`null` if no audio track is enabled right now.

If an audio track is set and information about it is known, this method will
return an object with the following properties:

- `id` (`Number|string`): The id used to identify this track. No other
  audio track for the same [Period](../../glossary.md#period) will have the
  same `id`.

  This can be useful when setting the track through the `setAudioTrack`
  method.

- `language` (`string`): The language the audio track is in, as set in the
  [Manifest](../../glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
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
    No other Representation from this track will have the same `id`.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per
    seconds.

  - `codec` (`string|undefined`): The audio codec the Representation is
    in, as announced in the corresponding Manifest.

`undefined` if no audio content has been loaded yet or if its information is
unknown.

:::note
Note for multi-Period contents:

This method will only return the chosen audio track for the
[Period](../../glossary.md#period) that is currently playing.
:::

:::caution
In _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)), if there is
no audio tracks API in the browser, this method will return `undefined`.
:::

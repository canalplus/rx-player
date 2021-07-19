---
id: getAvailableTextTracks-api
title: getAvailableTextTracks method
sidebar_label: getAvailableTextTracks
slug: getAvailableTextTracks
---

---

**syntax**: `const textTracks = player.getAvailableTextTracks()`

**return value**: `Array.<Object>`

---

Returns the list of available text tracks (subtitles) for the current content.

Each of the objects in the returned array have the following properties:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setTextTrack`.

- `language` (`string`): The language the text track is in, as set in the
  [Manifest](../../glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

- `active` (`Boolean`): Whether the track is the one currently active or
  not.

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

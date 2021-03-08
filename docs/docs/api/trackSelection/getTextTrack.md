---
id: getTextTrack-api
title: getTextTrack method
sidebar_label: getTextTrack
slug: api/track-selection/getTextTrack
---

--

**syntax**: `const textTrack = player.getTextTrack()`

**return value**: `Object|null|undefined`

--

Get information about the text track currently set.
`null` if no audio track is enabled right now.

If a text track is set and information about it is known, this method will
return an object with the following properties:

- `id` (`Number|string`): The id used to identify this track. No other
  text track for the same [Period](../terms.md#period) will have the same
  `id`.

  This can be useful when setting the track through the `setTextTrack` method.

- `language` (`string`): The language the text track is in, as set in the
  [Manifest](../terms.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

`undefined` if no text content has been loaded yet or if its information is
unknown.

--

Note for multi-Period contents:

This method will only return the chosen text track for the
[Period](../terms.md#period) that is currently playing.

\_\_

In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no text tracks API in the browser, this method will return `undefined`.

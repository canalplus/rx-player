---
id: disableTextTrack-api
title: disableTextTrack method
sidebar_label: disableTextTrack
slug: disableTextTrack
---

---

**syntax**: `player.disableTextTrack()`

---

Disable the current text track, if one.

After calling that method, no subtitles track will be displayed until
`setTextTrack` is called.

Note for multi-Period contents:

This method will only have an effect on the [Period](../../glossary.md#period) that is
currently playing.

If you want to disable the text track for other Periods as well, you might want
to call [setPreferredVideoTracks](./setPreferredVideoTracks.md) instead. With
this method, you can globally apply a `null` text track preference - which means
that you would prefer having no text track - by setting its second argument to
`true`.

More information can be found on that API's documentation.

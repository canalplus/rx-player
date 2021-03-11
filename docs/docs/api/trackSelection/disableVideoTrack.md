---
id: disableVideoTrack-api
title: disableVideoTrack method
sidebar_label: disableVideoTrack
slug: disableVideoTrack
---

---

**syntax**: `player.disableVideoTrack()`

---

Disable the current video track, if one.

Might enter in `RELOADING` state for a short period after calling this API.

Note for multi-Period contents:

This method will only have an effect on the [Period](../../glossary.md#period) that is
currently playing.

If you want to disable the video track for other Periods as well, you might want
to call [setPreferredVideoTracks](./setPreferredVideoTracks.md) instead. With
this method, you can globally apply a `null` video track preference - which means
that you would prefer having no video track - by setting its second argument to
`true`.

More information can be found on that API's documentation.

:::caution

This option may have no effect in _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)).

The directfile mode is a special case here because when in it, the RxPlayer
depends for track selection on the [corresponding HTML
standard](https://html.spec.whatwg.org/multipage/media.html) as implemented by
the different browsers.
Though this standard says nothing about not being able to disable the video
track (or to stay more in line with their terms: to not select any video track),
no browser implementation actually seem to be able to do it, even when the
corresponding browser APIs show that no video track is currently selected.
This might be a bug on their parts.

Due to this fact, we do not recommend using this API in directfile mode for
now. You might even receive a reassuring `videoTrackChange` event (with a `null`
payload) while the video track is still actually active.

:::

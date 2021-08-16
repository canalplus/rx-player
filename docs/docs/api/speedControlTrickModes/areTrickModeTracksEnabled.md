---
id: areTrickModeTracksEnabled-api
title: areTrickModeTracksEnabled method
sidebar_label: areTrickModeTracksEnabled
slug: areTrickModeTracksEnabled
---

---

**syntax**: `const areEnabled = player.areTrickModeTracksEnabled()`

**return value**: `boolean`

---

Returns `true` if trickmode playback is active (it is usually enabled through
the `setPlaybackRate` method), which means that the RxPlayer selects "trickmode"
video tracks in priority.

Returns `false` in other cases.

Note that this doesn't mean that the player is currently playing a trickmode
track nor that it is even playing a content, only that it selects trickmode
tracks in priority.

To switch on or off this mode, you can use the `setPlaybackRate` method.

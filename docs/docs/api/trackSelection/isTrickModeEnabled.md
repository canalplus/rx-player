---
id: isTrickModeEnabled-api
title: isTrickModeEnabled method
sidebar_label: isTrickModeEnabled
slug: isTrickModeEnabled
---

---

**syntax**: `const isTrickModeEnabled = player.isTrickModeEnabled()`

**return value**: `Boolean`

---

It tells if the trick mode is currently enabled for the content playback :
The trick mode allows to play content fast-forward in an efficient way, by
exploiting trick mode tracks : on these specific tracks, video content is often
encoded with a very low framerate because the content is not intended to be
played at regular framerate and because the chunks must be faster to load for
the client.

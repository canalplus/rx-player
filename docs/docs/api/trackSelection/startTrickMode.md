---
id: startTrickMode-api
title: startTrickMode method
sidebar_label: startTrickMode
slug: startTrickMode
---

---

**syntax**: `player.startTrickMode(2)`

**arguments**:

- _number_ (`Trick mode speed`):

---

This API only makes senses when playing a content with a video track enabled
that contains a trick mode track. It will throw if no specific trick mode track
is attached to it.
The trick mode allows to play content fast-forward in an efficient way, by
exploiting trick mode tracks : on these specific tracks, video content is often
encoded with a very low framerate because the content is not intended to be
played at regular framerate and because the chunks must be faster to load for
the client.

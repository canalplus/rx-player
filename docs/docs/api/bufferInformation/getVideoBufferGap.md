---
id: getVideoBufferGap-api
title: getVideoBufferGap method
sidebar_label: getVideoBufferGap
slug: getVideoBufferGap
---

---

**syntax**: `const bufferGap = player.getVideoBufferGap()`

**return value**: `Number`

---

Returns in seconds the difference between:

- the current time.
- the end of the current contiguous loaded range.

In other words, this is the amount of seconds left in the buffer before the end
of the current contiguous range of media data.
If we're currently playing at the position at `51` seconds, and there is media
data from the second `40` to the second `60`, then `getVideoPlayedTime()` will
return `9` (`60 - 51`).

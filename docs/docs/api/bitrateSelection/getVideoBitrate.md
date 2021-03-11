---
id: getVideoBitrate-api
title: getVideoBitrate method
sidebar_label: getVideoBitrate
slug: getVideoBitrate
---

---

**syntax**: `const bitrate = player.getVideoBitrate()`

**return value**: `Number|undefined`

---

Returns the bitrate of the video quality currently chosen, in bits per second.

Returns `undefined` if no content is loaded.

:::note
Note for multi-Period contents:

This method will only return the chosen video bitrate for the
[Period](../../glossary.md#period) that is currently playing.
:::

:::caution
In _DirectFile_ mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)), returns `undefined`.
:::

---
id: getAudioBitrate-api
title: getAudioBitrate method
sidebar_label: getAudioBitrate
slug: getAudioBitrate
---

---

**syntax**: `const bitrate = player.getAudioBitrate()`

**return value**: `Number|undefined`

---

Returns the bitrate of the audio quality currently chosen, in bits per second.

Returns `undefined` if no content is loaded.

:::note
Note for multi-Period contents:

This method will only return the chosen audio bitrate for the
[Period](../../glossary.md#period) that is currently playing.
:::

:::caution
In _DirectFile_ mode (see [loadVideooptions](./../basicMethods/loadVideo.md#transport)), returns `undefined`.
:::

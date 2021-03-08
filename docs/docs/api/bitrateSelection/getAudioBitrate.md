---
id: getAudioBitrate-api
title: getAudioBitrate method
sidebar_label: getAudioBitrate
slug: api/bitrate-selection/getAudioBitrate
---

---

**syntax**: `const bitrate = player.getAudioBitrate()`

**return value**: `Number|undefined`

---

Returns the bitrate of the audio quality currently chosen, in bits per second.

Returns `undefined` if no content is loaded.

--

Note for multi-Period contents:

This method will only return the chosen audio bitrate for the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns `undefined`.

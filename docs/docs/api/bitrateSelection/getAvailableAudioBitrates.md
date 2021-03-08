---
id: getAvailableAudioBitrates-api
title: getAvailableAudioBitrates method
sidebar_label: getAvailableAudioBitrates
slug: api/bitrate-selection/getAvailableAudioBitrates
---

---

**syntax**: `const bitrates = player.getAvailableAudioBitrates()`

**return value**: `Array.<Number>`

---

The different bitrates available for the current audio track in bits per
seconds.

--

Note for multi-Period contents:

This method will only return the available audio bitrates of the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns an empty Array.

#### Example

```js
const audioBitrates = player.getAvailableAudioBitrates();
if (audioBitrates.length) {
  console.log(
    "The current audio is available in the following bitrates",
    audioBitrates.join(", ")
  );
}
```

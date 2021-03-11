---
id: getAvailableAudioBitrates-api
title: getAvailableAudioBitrates method
sidebar_label: getAvailableAudioBitrates
slug: getAvailableAudioBitrates
---

---

**syntax**: `const bitrates = player.getAvailableAudioBitrates()`

**return value**: `Array.<Number>`

---

The different bitrates available for the current audio track in bits per
seconds.

:::note
Note for multi-Period contents:

This method will only return the available audio bitrates of the
[Period](../../glossary.md#period) that is currently playing.
:::

:::caution
In _DirectFile_ mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)), returns an empty Array.
:::

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

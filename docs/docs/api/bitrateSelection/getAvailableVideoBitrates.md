---
id: getAvailableVideoBitrates-api
title: getAvailableVideoBitrates method
sidebar_label: getAvailableVideoBitrates
slug: api/bitrate-selection/getAvailableVideoBitrates
---

--

**syntax**: `const bitrates = player.getAvailableVideoBitrates()`

**return value**: `Array.<Number>`

--

The different bitrates available for the current video track in bits per
seconds.

--

Note for multi-Period contents:

This method will only return the available video bitrates of the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns an empty Array.

#### Example

```js
const videoBitrates = player.getAvailableVideoBitrates();
if (videoBitrates.length) {
  console.log(
    "The current video is available in the following bitrates",
    videoBitrates.join(", ")
  );
}
```

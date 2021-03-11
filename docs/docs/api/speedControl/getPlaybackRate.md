---
id: getPlaybackRate-api
title: getPlaybackRate method
sidebar_label: getPlaybackRate
slug: getPlaybackRate
---

---

**syntax**: `const rate = player.getPlaybackRate()`

**return value**: `Number`

---

Returns the current playback rate. `1` for normal playback, `2` when
playing at double the speed, etc.

#### Example

```js
const currentPlaybackRate = player.getPlaybackRate();
console.log(`Playing at a x${currentPlaybackRate}} speed`);
```

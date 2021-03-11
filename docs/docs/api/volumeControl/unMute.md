---
id: unMute-api
title: unMute method
sidebar_label: unMute
slug: unMute
---

---

**syntax**: `player.unMute()`

---

When muted, restore the volume to the one previous to the last `mute` call.

When the volume is already superior to `0`, this call won't do anything.

As the volume is not dependent on a single content (it is persistent), this
method can also be called when no content is playing.

#### Example

```js
// mute the current volume
player.mute();

// unmute and restore the previous volume
player.unMute();
```

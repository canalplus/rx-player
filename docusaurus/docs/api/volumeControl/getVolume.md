---
id: getVolume-api
title: getVolume method
sidebar_label: getVolume
slug: getVolume
---

---

**syntax**: `const volume = player.getVolume()`

**return value**: `Number`

---

Current volume of the player, from 0 (no sound) to 1 (maximum sound).
0 if muted through the `mute` API.

As the volume is not dependent on a single content (it is persistent), this
method can also be called when no content is playing.

#### Example

```js
const volume = player.getVolume();

if (volume === 1) {
  console.log("You're playing at maximum volume");
} else if (volume === 0) {
  console.log("You're playing at no volume");
} else if (volume > 0.5) {
  console.log("You're playing at a high volume");
} else {
  console.log("You're playing at a low volume");
}
```

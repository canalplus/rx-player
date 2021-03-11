---
id: setVolume-api
title: setVolume method
sidebar_label: setVolume
slug: setVolume
---

---

**syntax**: `player.setVolume(volume)`

**arguments**:

- _volume_ (`Number`): Volume from 0 to 1.

---

Set the current volume, from 0 (no sound) to 1 (the maximum sound level).

Note that the volume set here is persisted even when loading another content.
As such, this method can also be called when no content is currently playing.

#### Example

```js
// set the full volume
player.setVolume(1);
```

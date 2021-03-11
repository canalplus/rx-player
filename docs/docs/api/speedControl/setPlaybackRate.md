---
id: setPlaybackRate-api
title: setPlaybackRate method
sidebar_label: setPlaybackRate
slug: setPlaybackRate
---

---

**syntax**: `player.setPlaybackRate(speed)`

**arguments**:

- _speed_ (`Number`): The speed / playback rate you want to set.

---

Updates the current playback rate, i.e. the speed at which contents are played.

As its name hints at, the value indicates the rate at which contents play:

- Setting it to `2` allows to play at a speed multiplied by 2 relatively to
  regular playback.

- Setting that value to `1` reset the playback rate to its "normal" rythm.

- Setting it to `0.5` allows to play at half the speed relatively to regular
  playback.

- etc.

This method can be called at any time, even when no content is loaded and is
persisted from content to content.

You can set it to `1` to reset its value to the "regular" default.

#### Example

```js
// plays three times faster than normal
player.setPlaybackRate(3);
```

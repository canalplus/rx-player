---
id: pause-api
title: pause method
sidebar_label: pause
slug: pause
---

---

**syntax**: `player.pause()`

---

Pause the current loaded video. Equivalent to a video element's pause method.

Note that a content can be paused even if its current state is `BUFFERING` or
`SEEKING`.

You might want for a content to be loaded before being able to pause (the
current state has to be different than `LOADING`, `RELOADING` or `STOPPED`).

#### Example

```js
const pauseContent = () => {
  player.pause();
};
```

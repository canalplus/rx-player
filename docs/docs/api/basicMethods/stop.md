---
id: stop-api
title: stop method
sidebar_label: stop
slug: stop
---

---

**syntax**: `player.stop()`

---

Stop playback of the current content if one.

This will totaly un-load the current content.
To re-start playing the same content, you can either call the `reload` method
or just call `loadVideo` again.

#### Example

```js
const stopVideo = () => {
  player.stop();
};
```

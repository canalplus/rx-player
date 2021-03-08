---
id: getPosition-api
title: getPosition method
sidebar_label: getPosition
slug: getPosition
---

---

**syntax**: `const position = player.getPosition()`

**return value**: `Number`

---

Returns the current media element's playing position, in seconds.

For live contents, the returned position will not be re-scaled to correspond to
a live timestamp. If you want that behavior, you can call `getWallClockTime`
instead.

This is the only difference between the two. Generally, you can follow the
following rule:

- if you want to use that current position to use it with the other APIs
  (like `seekTo`, `getMinimumPosition`, `getMaximumPosition`
  etc.) use `getPosition` - as this is the real position in the media.

- if you want to display the current position to the viewer/listener, use
  `getWallClockTime` instead - as it will be set in the proper scale for
  live contents to display the right live time.

#### Example

```js
const pos = player.getPosition();
console.log(`The video element's current position is: ${pos} second(s)`);
```

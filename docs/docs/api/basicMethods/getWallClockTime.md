---
id: getWallClockTime-api
title: getWallClockTime method
sidebar_label: getWallClockTime
slug: getWallClockTime
---

---

**syntax**: `const wallClockTime = player.getWallClockTime()`

**return value**: `Number`

---

Returns the current "wall-clock" playing position in seconds.

That is:

- for live contents, this is the current position scaled to correspond to a
  live timestamp, in seconds.

- for non-live contents, returns the position from the absolute beginning time
  of the content, also in seconds. In the absolute majority of cases this will
  be equal to the value returned by `getPosition`.

Use this method to display the current position to the user.

#### Example

```js
const wallClockTime = player.getWallClockTime();
const nowInSeconds = Date.now() / 1000;
const delta = nowInSeconds - wallClockTime;

if (delta < 5) {
  // (5 seconds of margin)
  console.log("You're playing live");
} else {
  console.log(`You're playing ${delta} seconds behind the live content`);
}
```

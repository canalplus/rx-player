---
id: getVideoDuration-api
title: getVideoDuration method
sidebar_label: getVideoDuration
slug: getVideoDuration
---

---

**syntax**: `const duration = player.getVideoDuration()`

**return value**: `Number`

---

Returns the duration of the current content as taken from the media element.

:::caution
This duration is in fact the maximum position possible for the
content. As such, for contents not starting at `0`, this value will not be equal
to the difference between the maximum and minimum possible position, as would
normally be expected from a property named "duration".
:::

#### Example

```js
const pos = player.getPosition();
const dur = player.getVideoDuration();

console.log(`current position: ${pos} / ${dur}`);
```

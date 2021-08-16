---
id: getNativeTextTrack-api
title: getNativeTextTrack method
sidebar_label: getNativeTextTrack
slug: getNativeTextTrack
---

---

**syntax**: `const textTrack = player.getNativeTextTrack()`

**return value**: `TextTrack|null`

---

:::caution
This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](../../additional_ressources/deprecated.md)).
:::

Returns the first text track of the video's element, null if none.

This is equivalent to:

```js
const el = player.getVideoElement();
const textTrack = el.textTracks.length ? el.textTracks[0] : null;
```

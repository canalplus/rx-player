---
id: getImageTrackData-api
title: getImageTrackData method
sidebar_label: getImageTrackData
slug: getImageTrackData
---

---

**syntax**: `const data = player.getImageTrackData()`

**return value**: `Array.<Object>|null`

---

:::caution
This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](../../additional_ressources/deprecated.md)).
:::

The current image track's data, null if no content is loaded / no image track
data is available.

The returned array follows the usual image playlist structure, defined
[here](../images.md#api-structure).

`null` in _DirectFile_ mode (see [loadVideo options](../basicMethods/loadVideo.md#transport)).

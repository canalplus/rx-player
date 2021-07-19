---
id: getMaxBufferBehind-api
title: getMaxBufferBehind method
sidebar_label: getMaxBufferBehind
slug: getMaxBufferBehind
---

---

**syntax**: `const bufferSize = player.getMaxBufferBehind()`

**return value**: `Number`

---

Returns the maximum kept buffer before the current position, in seconds.

This setting can be updated either by:

- calling the `setMaxBufferBehind` method.
- instanciating an RxPlayer with a `maxBufferBehind` property set.

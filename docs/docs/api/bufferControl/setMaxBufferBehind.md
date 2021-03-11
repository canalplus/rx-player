---
id: setMaxBufferBehind-api
title: setMaxBufferBehind method
sidebar_label: setMaxBufferBehind
slug: setMaxBufferBehind
---

---

**syntax**: `player.setMaxBufferBehind(bufferSize)`

**arguments**:

- _bufferSize_ (`Number`): Maximum amount of buffer behind the current
  position, in seconds.

---

Set the maximum kept buffer before the current position, in seconds.

Everything before that limit (`currentPosition - maxBufferBehind`) will be
automatically garbage collected.

This feature is not necessary as the browser should by default correctly
remove old segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

You can set it to `Infinity` to remove this limit and just let the browser do
this job instead.

:::caution
This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)).
:::

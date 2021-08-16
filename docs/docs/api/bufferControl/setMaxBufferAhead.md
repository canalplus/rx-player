---
id: setMaxBufferAhead-api
title: setMaxBufferAhead method
sidebar_label: setMaxBufferAhead
slug: setMaxBufferAhead
---

---

**syntax**: `player.setMaxBufferAhead(bufferSize)`

**arguments**:

- _bufferSize_ (`Number`): Maximum amount of buffer ahead of the current
  position, in seconds.

---

Set the maximum kept buffer ahead of the current position, in seconds.

Everything superior to that limit (`currentPosition + maxBufferAhead`) will
be automatically garbage collected.

This feature is not necessary as the browser should by default correctly
remove old segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

You can set it to `Infinity` to remove any limit and just let the browser do
this job instead.

The minimum value between this one and the one returned by
`getWantedBufferAhead` will be considered when downloading new segments.

:::caution
Bear in mind that a too-low configuration there (e.g. inferior to
`10`) might prevent the browser to play the content at all.
:::

:::caution
This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)).
:::

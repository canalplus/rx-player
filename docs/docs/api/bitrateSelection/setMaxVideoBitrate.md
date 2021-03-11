---
id: setMaxVideoBitrate-api
title: setMaxVideoBitrate method
sidebar_label: setMaxVideoBitrate
slug: setMaxVideoBitrate
---

---

**syntax**: `player.setMaxVideoBitrate(maxBitrate)`

**arguments**:

- _maxBitrate_ (`Number`): Upper video bitrate limit when adaptive streaming
  is enabled.

---

Set a maximum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate higher than 1 Megabits per second you can call:

```js
player.setMaxVideoBitrate(1e6);
```

Any limit can be removed just by setting that value to `Infinity`:

```js
// remove video bitrate higher limit
player.setMaxVideoBitrate(Infinity);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setVideoBitrate`) bypass this limit completely.

:::caution
This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)).
:::

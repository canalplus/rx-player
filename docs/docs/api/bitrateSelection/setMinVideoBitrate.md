---
id: setMinVideoBitrate-api
title: setMinVideoBitrate method
sidebar_label: setMinVideoBitrate
slug: setMinVideoBitrate
---

---

**syntax**: `player.setMinVideoBitrate(minBitrate)`

**arguments**:

- _minBitrate_ (`Number`): Lower video bitrate limit when adaptive streaming
  is enabled.

---

Set a minimum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate lower than that value.

The exception being when no quality has a higher bitrate, in which case the
maximum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate below 100 kilobits per second you can call:

```js
player.setMinVideoBitrate(100000);
```

Any limit can be removed just by setting that value to `0`:

```js
// remove video bitrate lower limit
player.setMinVideoBitrate(0);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setVideoBitrate`) bypass this limit completely.

:::caution
This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./../basicMethods/loadVideo.md#transport)).
:::

---
id: getMaxVideoBitrate-api
title: getMaxVideoBitrate method
sidebar_label: getMaxVideoBitrate
slug: getMaxVideoBitrate
---

---

**syntax**: `const maxBitrate = player.getMaxVideoBitrate()`

**return value**: `Number`

---

Returns the maximum video bitrate reachable through adaptive streaming, in bits
per second.

This maximum limit has usually been set either through the `setMaxVideoBitrate`
method or through the `maxVideoBitrate` constructor option.

This limit can be further updated by calling the
[setMaxVideoBitrate](./setMaxVideoBitrate.md) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setVideoBitrate`) bypass this limit completely.

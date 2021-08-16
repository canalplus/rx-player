---
id: getMaxAudioBitrate-api
title: getMaxAudioBitrate method
sidebar_label: getMaxAudioBitrate
slug: getMaxAudioBitrate
---

---

**syntax**: `const maxBitrate = player.getMaxAudioBitrate()`

**return value**: `Number`

---

Returns the maximum audio bitrate reachable through adaptive streaming, in bits
per second.

This maximum limit has usually been set either through the `setMaxAudioBitrate`
method or through the `maxAudioBitrate` constructor option.

This limit can be further updated by calling the [setMaxAudioBitrate](./setMaxAudioBitrate.md) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setAudioBitrate`) bypass this limit completely.

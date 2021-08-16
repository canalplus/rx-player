---
id: getManualVideoBitrate-api
title: getManualVideoBitrate method
sidebar_label: getManualVideoBitrate
slug: getManualVideoBitrate
---

---

**syntax**: `const currentManualVideoBitrate = player.getManualVideoBitrate()`

**return value**: `Number`

---

Get the last video bitrate manually set. Either via `setVideoBitrate` or via
the `initialVideoBitrate` constructor option.

This value can be different than the one returned by `getVideoBitrate`:

- `getManualVideoBitrate` returns the last bitrate set manually by the user
- `getVideoBitrate` returns the actual bitrate of the current video track

`-1` when no video bitrate is forced.

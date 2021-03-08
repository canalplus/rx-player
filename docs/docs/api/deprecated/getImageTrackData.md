---
id: getImageTrackData-api
title: getImageTrackData method
sidebar_label: getImageTrackData
slug: api/deprecated/getImageTrackData
---

--

:warning: This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](./deprecated.md)).

--

--

**syntax**: `const data = player.getImageTrackData()`

**return value**: `Array.<Object>|null`

--

The current image track's data, null if no content is loaded / no image track
data is available.

The returned array follows the usual image playlist structure, defined
[here](./images.md#api-structure).

`null` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

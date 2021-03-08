---
id: getVideoBitrate-api
title: getVideoBitrate method
sidebar_label: getVideoBitrate
slug: api/bitrate-selection/getVideoBitrate
---

--

**syntax**: `const bitrate = player.getVideoBitrate()`

**return value**: `Number|undefined`

--

Returns the bitrate of the video quality currently chosen, in bits per second.

Returns `undefined` if no content is loaded.

--

Note for multi-Period contents:

This method will only return the chosen video bitrate for the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns `undefined`.

---
id: getWantedBufferAhead-api
title: getWantedBufferAhead method
sidebar_label: getWantedBufferAhead
slug: api/buffer-control/getWantedBufferAhead
---

--

**syntax**: `const bufferGoal = player.getWantedBufferAhead()`

**return value**: `Number`

--

returns the buffering goal, as a duration ahead of the current position, in
seconds.

By default, this value is set to `30`.

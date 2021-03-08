---
id: getCurrentAdaptations-api
title: getCurrentAdaptations method
sidebar_label: getCurrentAdaptations
slug: api/deprecated/getCurrentAdaptations
---

--

:warning: This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](./deprecated.md)).

--

--

**syntax**: `const adaptations = player.getCurrentAdaptations()`

**return value**: `Object|null`

--

Returns the [Adaptations](../terms.md#adaptation) being loaded per type if a
[Manifest](../terms.md#manifest) is loaded. The returned object will have at
most a key for each type ("video", "audio", "text" and "image") which will each
contain an array of Adaptation Objects.

The Adaptation object structure is relatively complex and is described in the
[Manifest Object structure page](./manifest.md#adaptation).

`null` if the current Adaptations are not known yet.

`null` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

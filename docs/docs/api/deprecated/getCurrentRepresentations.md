---
id: getCurrentRepresentations-api
title: getCurrentRepresentations method
sidebar_label: getCurrentRepresentations
slug: api/deprecated/getCurrentRepresentations
---

--

:warning: This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](./deprecated.md)).

--

--

**syntax**: `const representations = player.getCurrentRepresentations()`

**return value**: `Object|null`

--

Returns the [Representations](../terms.md#representation) being loaded per type
if a [Manifest](../terms.md#manifest) is loaded. The returned object will have
at most a key for each type ("video", "audio", "text" and "image") which will
each contain an array of Representation Objects.

An Representation object structure is relatively complex and is described in the
[Manifest Object structure page](./manifest.md#representation).

`null` if the current Representations are not known yet.

`null` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---
id: getManifest-api
title: getManifest method
sidebar_label: getManifest
slug: api/deprecated/getManifest
---

--

:warning: This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](./deprecated.md)).

--

--

**syntax**: `const manifest = player.getManifest()`

**return value**: `Manifest|null`

--

Returns the current loaded [Manifest](../terms.md#manifest) if one.
The Manifest object structure is relatively complex and is described in the
[Manifest Object structure page](./manifest.md).

`null` if the player is either stopped or not loaded.

`null` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

The Manifest will be available before the player reaches the `"LOADED"` state.

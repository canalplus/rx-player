---
id: getManifest-api
title: getManifest method
sidebar_label: getManifest
slug: getManifest
---

---

**syntax**: `const manifest = player.getManifest()`

**return value**: `Manifest|null`

---

:::caution
This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](../../additional_ressources/deprecated.md)).
:::

Returns the current loaded [Manifest](../../glossary.md#manifest) if one.
The Manifest object structure is relatively complex and is described in the
[Manifest Object structure page](./../../additional_ressources/manifest.md).

`null` if the player is either stopped or not loaded.

`null` in _DirectFile_ mode (see [loadVideo options](../basicMethods/loadVideo.md#transport)).

The Manifest will be available before the player reaches the `"LOADED"` state.

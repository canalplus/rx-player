# getManifest

<div class="warning">
This option is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Description

Returns the current loaded [Manifest](../../Getting_Started/Glossary.md#manifest)
if one.
The Manifest object structure is relatively complex and is described in the
[Manifest Object structure page](../Miscellaneous/Manifest_Object.md#structure_of_a_manifest).

`null` if the player is either stopped or not loaded.

`null` in _DirectFile_ mode (see [loadVideo
options](../Loading_a_Content.md#transport)).

The Manifest will be available before the player reaches the `"LOADED"` state.

## Syntax

```js
const manifest = player.getManifest();
```

  - **return value** `Object|null`: The current Manifest object.

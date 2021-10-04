# player.getImageTrackData()

<div class="warning">
This option is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Syntax

```js
const data = player.getImageTrackData();
```

  - **return value** `Array.<Object>|null`: The image playlist.

## Description

The current image track's data, `null` if no content is loaded / no image track
data is available.

The returned array follows the usual image playlist structure, defined
[here](../Miscellaneous/images.md).

`null` in _DirectFile_ mode (see [loadVideo
options](../Loading_a_Content.md#transport)).

# player.getNativeTextTrack()

<div class="warning">
This option is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Syntax

```js
player.getNativeTextTrack()
```

  - **return value** `TextTrack|null`

## Description

Returns the first text track of the video's element, null if none.
This is equivalent to:

```js
const el = player.getVideoElement();
const textTrack = el.textTracks.length ? el.textTracks[0] : null;
```

# player.isFullscreen()

<div class="warning">
This option is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Syntax

```js
const isFullscreen = player.isFullscreen();
```

  - **return value** `Boolean`

## Description

Returns `true` if the video element is in fullscreen mode, `false`
otherwise.

#### Example

```js
if (player.isFullscreen()) {
  console.log("The player is in fullscreen mode");
}
```

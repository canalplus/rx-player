# player.setFullscreen()

<div class="warning">
This option is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Description

Switch or exit the `<video>` element to fullscreen mode. The argument is an
optional boolean:

- if set:

  - `true`: enters fullscreen
  - `false`: exit fullscreen

- if not set: enter fullscreen

Note that **only the video element will be set to fullscreen mode**. You might
prefer to implement your own method to include your controls in the final UI.

## Syntax

```js
player.setFullscreen();
```

  - **arguments** (optional) `Boolean|undefined`: If not defined or `true`, set
    the attached media element in fullscreen mode.
    If `false`, exit fullscreen mode.

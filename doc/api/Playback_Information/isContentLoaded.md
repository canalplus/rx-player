# isContentLoaded

## Description

Returns `true` if a content is loaded. If it is, the player is ready to play and you can
use APIs interacting with the current content such as `seekTo` or `setAudioTrack`.

The method relies solely on the state of the player, and is a shortcut for
`!(["LOADING", "RELOADING", "STOPPED"].includes(player.getPlayerState()))`.

## Syntax

```js
const isContentLoaded = player.isContentLoaded();
```

- **return value** `boolean`

# isBuffering

## Description

Returns `true` if the player is buffering.

The method relies solely on the state of the player, and is a shortcut for
`["BUFFERING", "SEEKING", "LOADING", "RELOADING"].includes(player.getPlayerState())`.

## Syntax

```js
const isBuffering = player.isBuffering();
```

- **return value** `boolean`

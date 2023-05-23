# isPaused

## Description

Returns `true` if the `videoElement` is paused or unset, `false` otherwise.

The method relies solely on the `<video>` element of the player, independently of the 
player's state and is a shortcut for `player.getVideoElement().paused`.

It can be used for example to display a play/pause button.

## Syntax

```js
const isPaused = player.isPaused();
```

 - **return value** `boolean`

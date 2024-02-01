# isPaused

## Description

Returns the play/pause status of the player, that can be used for example to display a
play/pause button:

- when the player is (re)loading, returns the scheduled play/pause condition for when
  loading is over,
- in other states, returns the `<video>` element `.paused` value,
- if the player is disposed, returns `true`.

## Syntax

```js
const isPaused = player.isPaused();
```

- **return value** `boolean`

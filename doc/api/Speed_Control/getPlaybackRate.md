# getPlaybackRate

## Description

Returns the current playback rate. `1` for normal playback, `2` when
playing at double the speed, etc.

#### Example

```js
const currentPlaybackRate = player.getPlaybackRate();
console.log(`Playing at a x${currentPlaybackRate}} speed`);
```

## Syntax

```js
const rate = player.getPlaybackRate();
```

 - **return value** `number`

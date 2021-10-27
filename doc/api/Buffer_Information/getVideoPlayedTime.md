# player.getVideoPlayedTime()

## Description

Returns in seconds the difference between:

- the start of the current contiguous loaded range.
- the current time.

In other words, this is the amount of time in the current contiguous range of
media data the player has already played.
If we're currently playing at the position at `51` seconds, and there is media
data from the second `40` to the second `60`, then `getVideoPlayedTime()` will
return `11` (`51 - 40`).

`0` if there's no data loaded for the current position.

## Syntax

```js
const playedTime = player.getVideoPlayedTime();
```

 - **return value** `number`

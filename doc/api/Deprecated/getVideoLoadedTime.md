# getVideoLoadedTime

<div class="warning">
This method is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Description

Returns in seconds the difference between:

- the start of the current contiguous loaded range.
- the end of it.

In other words, this is the duration of the current contiguous range of media data the
player is currently playing: If we're currently playing at the position at `51` seconds,
and there is media data from the second `40` to the second `60`, then
`getVideoLoadedTime()` will return `20` (`60 - 40`).

`0` if there's no data loaded for the current position.

## Syntax

```js
const loadedTime = player.getVideoLoadedTime();
```

- **return value** `number`

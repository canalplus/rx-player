# getCurrentBufferGap

## Description

Returns in seconds the difference between:

- the current time.
- the end of the current contiguous loaded range.

In other words, this is the amount of seconds left in the buffer before the end
of the current contiguous range of media data.
If we're currently playing at the position at `51` seconds, and there is media
data from the second `40` to the second `60`, then `getCurrentBufferGap()` will
return `9` (`60 - 51`).

## Syntax

```js
const bufferGap = player.getCurrentBufferGap();
```

 - **return value** `number`

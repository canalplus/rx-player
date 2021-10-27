# player.getWantedBufferAhead()

## Description

returns the buffering goal, as a duration ahead of the current position, in
seconds.
This is the amount of seconds after the current position that the RxPlayer will
try to preload in the buffer.

Once that value is reached, the RxPlayer won't normally request new media data
until the value comes down again (due e.g. to the current position evolving or
to a seeking operation).

By default, this value is set to `30`.

## Syntax

```js
const bufferGoal = player.getWantedBufferAhead();
```

  - **return value** `number`: current "buffering goal", in seconds.

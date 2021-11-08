# setWantedBufferAhead

## Description

Set the buffering goal, as a duration ahead of the current position, in seconds.

Once this size of buffer reached, the player won't try to download new segments
anymore.

By default, this value is set to `30`.

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setWantedBufferAhead(bufferGoal);
```

- **arguments**:

  1. _bufferGoal_ `number`: Ideal amount of buffer that should be pre-loaded,
     in seconds.

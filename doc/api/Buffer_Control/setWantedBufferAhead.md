# setWantedBufferAhead method

---

**syntax**: `player.setWantedBufferAhead(bufferGoal)`

**arguments**:

- _bufferGoal_ (`Number`): Ideal amount of buffer that should be pre-loaded,
  in seconds.

---

Set the buffering goal, as a duration ahead of the current position, in seconds.

Once this size of buffer reached, the player won't try to download new segments
anymore.

By default, this value is set to `30`.

:::caution
This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](../Loading_a_Content.md#transport)).
:::

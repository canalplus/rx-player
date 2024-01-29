# setMaxBufferBehind

## Description

Set the maximum kept buffer before the current position, in seconds.

Everything before that limit (`currentPosition - maxBufferBehind`) will be automatically
garbage collected.

This feature is not necessary as the browser should by default correctly remove old
segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint of the
player, you might want to set this limit.

You can set it to `Infinity` to remove this limit and just let the browser do this job
instead.

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setMaxBufferBehind(bufferSize);
```

- **arguments**:

  1. _bufferSize_ `number`: Maximum amount of buffer behind the current position, in
     seconds.

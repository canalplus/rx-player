# setMaxVideoBufferSize

## Description

Set the maximum memory the video buffer can take up in the memory, in kilobytes
Defaults at `Infinity`

Once this value is reached, the player won't try to download new video
segments anymore.

This feature was designed with devices that have limited memory and trying to play very
high bitrates representations in minds. 

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

You can set it to `Infinity` to remove this limit and just let the browser do
this job instead.

<div class="warning">
The limit set by `setMaxVideoBufferSize` is approximative, and bypassed in edge case scenarios if we dont have enough buffer because of this limitation.
</div>

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setMaxVideoBufferSize(bufferSize);
```

- **arguments**:

  1. _bufferSize_ `number`: Maximum amount of memory the buffer can download,
    in kilobytes

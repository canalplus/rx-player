# getAudioBitrate

## Description

Returns the bitrate of the audio quality currently chosen, in bits per second.

Returns `undefined` if no content is loaded.

<div class="note">
Note for multi-Period contents:

This method will only return the chosen audio bitrate for the
Period that is currently playing.

</div>

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method returns "undefined".
</div>

## Syntax

```js
const bitrate = player.getAudioBitrate();
```

- **return value** `number|undefined`: Bitrate of the current audio quality
  chosen. `undefined` if none is chosen yet.

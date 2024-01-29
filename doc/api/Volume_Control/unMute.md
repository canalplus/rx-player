# unMute

## Description

Un-mute the audio volume if previously muted.

As the volume is not dependent on a single content (it is persistent), this method can
also be called when no content is playing.

## Syntax

```js
player.unMute();
```

## Example

```js
// mute the current volume
player.mute();

// unmute and restore the previous volume
player.unMute();
```

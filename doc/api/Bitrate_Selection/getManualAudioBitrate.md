# getManualAudioBitrate

## Description

Get the last audio bitrate manually set. Either via `setAudioBitrate` or via
the `initialAudioBitrate` constructor option.

This value can be different than the one returned by `getAudioBitrate`:

- `getManualAudioBitrate` returns the last bitrate set manually by the user
- `getAudioBitrate` returns the actual bitrate of the current audio track

`-1` when no audio bitrate is forced.

## Syntax

```js
const currentManualAudioBitrate = player.getManualAudioBitrate();
```

  - **return value**: `Number`: Last audio bitrate manually set.
    `-1` if nothing is manually set.

# getManualVideoBitrate

## Description

Get the last video bitrate manually set. Either via `setVideoBitrate` or via
the `initialVideoBitrate` constructor option.

This value can be different than the one returned by `getVideoBitrate`:

- `getManualVideoBitrate` returns the last bitrate set manually by the user
- `getVideoBitrate` returns the actual bitrate of the current video track

`-1` when no video bitrate is forced.

## Syntax

```js
const currentManualVideoBitrate = player.getManualVideoBitrate();
```

  - **return value**: `Number`: Last video bitrate manually set.
    `-1` if nothing is manually set.

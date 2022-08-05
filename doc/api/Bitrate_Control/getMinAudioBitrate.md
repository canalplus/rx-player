# getMinAudioBitrate

## Description

Returns the minimum audio bitrate reachable through adaptive streaming, in bits
per second.

This minimum limit has usually been set either through the `setMinAudioBitrate`
method or through the `minAudioBitrate` constructor option.

This limit can be further updated by calling the
[setMinAudioBitrate](./setMinAudioBitrate.md) method.

Note that this only affects adaptive strategies. Forcing the quality manually
(for example by calling `lockAudioRepresentations`) bypasses this limit
completely.

## Syntax

```js
const minBitrate = player.getMinAudioBitrate();
```

 - **return value** `number`

# getMaxAudioBitrate

## Description

Returns the maximum audio bitrate reachable through adaptive streaming, in bits
per second.

This maximum limit has usually been set either through the `setMaxAudioBitrate`
method or through the `maxAudioBitrate` constructor option.

This limit can be further updated by calling the
[setMaxAudioBitrate](./setMaxAudioBitrate.md) method.

Note that this only affects adaptive strategies. Forcing the quality manually
(for example by calling `lockAudioRepresentations`) bypasses this limit
completely.


## Syntax

```js
const maxBitrate = player.getMaxAudioBitrate();
```

 - **return value** `number`

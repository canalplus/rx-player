# getMaxVideoBitrate

## Description

Returns the maximum video bitrate reachable through adaptive streaming, in bits
per second.

This maximum limit has usually been set either through the `setMaxVideoBitrate`
method or through the `maxVideoBitrate` constructor option.

This limit can be further updated by calling the
[setMaxVideoBitrate](./setMaxVideoBitrate.md) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setVideoBitrate`) bypass this limit completely.

## Syntax

```js
const maxBitrate = player.getMaxVideoBitrate();
```

 - **return value** `number`

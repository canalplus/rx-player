# getMinVideoBitrate

## Description

Returns the minimum video bitrate reachable through adaptive streaming, in bits
per second.

This minimum limit has usually been set either through the `setMinVideoBitrate`
method or through the `minVideoBitrate` constructor option.

This limit can be further updated by calling the
[setMinVideoBitrate](./setMinVideoBitrate.md) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setVideoBitrate`) bypass this limit completely.

## Syntax

```js
const minBitrate = player.getMinVideoBitrate();
```

 - **return value** `number`

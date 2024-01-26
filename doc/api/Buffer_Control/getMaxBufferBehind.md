# getMaxBufferBehind

## Description

Returns the maximum kept buffer before the current position, in seconds.

This setting can be updated either by:

- calling the `setMaxBufferBehind` method.
- instanciating an RxPlayer with a `maxBufferBehind` property set.

## Syntax

```js
const bufferSize = player.getMaxBufferBehind();
```

- **return value** `number`: Maximum kept buffer before the current
  position, in seconds.

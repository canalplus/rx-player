# getMaxBufferAhead

## Description

Returns the maximum kept buffer ahead of the current position, in seconds.

This setting can be updated either by:

- calling the `setMaxBufferAhead` method.
- instanciating an RxPlayer with a `maxBufferAhead` property set.

## Syntax

```js
const bufferSize = player.getMaxBufferAhead();
```

- **return value** `number`: Maximum kept buffer in front of the current
  position, in seconds.

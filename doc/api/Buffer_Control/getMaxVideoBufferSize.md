# getMaxBufferSize

## Description

Returns the maximum video buffer memory size limit , in kilobytes.

This setting can be updated either by:

- calling the [setMaxVideoBufferSize](./setMaxVideoBufferSize.md) method.
- instanciating an RxPlayer with a `maxVideoBufferSize` property set.

## Syntax

```js
const bufferSize = player.getMaxBufferSize();
```

  - **return value** `number`: Maximum buffer memory size limit,
  in kilobytes. 

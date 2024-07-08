# getLastStoredContentPosition

## Description

Returns the last stored position of the last played content, in seconds. Returns
`undefined` if no content was previously loaded.

This method can be useful if you want to reload using `player.loadVideo()` and not
`player.reload()`, after an error for example.

It can also be used to retrieve the position where the player was at when the error
arised.

## Syntax

```js
const lastStoredContentPosition = player.getLastStoredContentPosition();
```

- **return value** `number|undefined`

#### Example

```js
const lastStoredContentPosition = player.getLastStoredContentPosition();

if (lastStoredContentPosition !== undefined) {
  player.loadVideo({
    // ...
    startAt: {
      position: lastStoredContentPosition,
    },
  });
}
```

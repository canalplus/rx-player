# stop

## Description

Stop playback of the current content if one.

This will totaly un-load the current content. To re-start playing the same content, you
can either call the `reload` method or just call `loadVideo` again.

## Syntax

```js
player.stop();
```

## Example

```js
const stopVideo = () => {
  player.stop();
};
```

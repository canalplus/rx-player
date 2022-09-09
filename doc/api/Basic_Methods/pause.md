# pause

## Description

Pause the current loaded video. Equivalent to a video element's pause method.

Note that a content can be paused even if its current state is `BUFFERING`,
`SEEKING` or `FREEZING`.

You might want for a content to be loaded before being able to pause (the
current state has to be different than `LOADING`, `RELOADING` or `STOPPED`).

## Syntax

```js
player.pause();
```

## Example

```js
const pauseContent = () => {
  player.pause();
};
```

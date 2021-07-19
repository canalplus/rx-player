---
id: play-api
title: play method
sidebar_label: play
slug: play
---

---

**syntax**: `player.play()`

**return value**: `Promise.<void>`

---

Play/resume the current loaded video. Equivalent to a video element's play
method.

You might want to call that method either to start playing (when the content is
in the `"LOADED"` state and auto-play has not been enabled in the last
`loadVideo` call) or to resume when the content has been paused.

The returned Promise informs you on the result:

- if playback succeeds, the Promise is fulfilled

- if playback fails, the Promise is rejected along with an error message
  explaining the failure - coming directly from the browser.

  Such failure can for example be due to your browser's policy, which may
  forbid to call play on a media element without any user interaction.
  Please note that in that case, you will also receive a
  [warning event](../errors.md) containing a `MEDIA_ERROR` with the code:
  `MEDIA_ERR_PLAY_NOT_ALLOWED`.

:::note
On browsers which do not support Promises natively (such as Internet
Explorer 11), a JavaScript implementation is provided instead. This
implementation has the exact same implementation than [ES2015 Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
:::

You might want for a content to be loaded before being able to play (the
current state has to be different than `LOADING`, `RELOADING` or `STOPPED`).

#### Example

```js
const resumeContent = () => {
  player.play();
};
```

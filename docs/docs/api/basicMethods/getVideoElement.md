---
id: getVideoElement-api
title: getVideoElement method
sidebar_label: getVideoElement
slug: getVideoElement
---

---

**syntax**: `const elt = player.getVideoElement()`

**return value**: `HTMLMediaElement`

---

Returns the media element used by the RxPlayer.

You're not encouraged to use its APIs as they can enter in conflict with the
RxPlayer's API.

Despite its name, this method can also return an audio element if the RxPlayer
was instantiated with one.

#### Example

```js
const videoElement = player.getVideoElement();
videoElement.className = "my-video-element";
```

# getMediaElement

## Description

Returns the media element used by the RxPlayer.

You're not encouraged to use its APIs as they can enter in conflict with the
RxPlayer's API.

Despite its name, this method can also return an audio element if the RxPlayer
was instantiated with one.

## Syntax

```js
const elt = player.getMediaElement();
```

  - **return value** `HTMLMediaElement`: The media element attached to the
    RxPlayer.

## Example

```js
const videoElement = player.getMediaElement();
videoElement.className = "my-video-element";
```

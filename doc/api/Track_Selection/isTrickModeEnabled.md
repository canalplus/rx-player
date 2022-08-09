# isTrickModeEnabled

## Description

Tells if trick mode tracks are currently enabled if available.

Trick mode tracks are video tracks with a generally lower frame rate, allowing
for example to play content fast-forward in an efficient way.

Note that `isTrickModeEnabled` returning `true` does not always mean that
a video trick mode track is currently displayed, as it depends on whether it is
actually available on the current content.

You can know if a trick mode video track is currently playing by checking if the
track returned by the [`getVideoTrack`](./getVideoTrack.md) method has its
`isTrickModeTrack` property set to `true`.

## Syntax

```js
const isTrickModeEnabled = player.isTrickModeEnabled();
```

 - **return value** `boolean`

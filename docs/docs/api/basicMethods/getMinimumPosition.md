---
id: getMinimumPosition-api
title: getMinimumPosition method
sidebar_label: getMinimumPosition
slug: getMinimumPosition
---

---

**syntax**: `const minimumPosition = player.getMinimumPosition()`

**return value**: `Number|null`

---

Returns the minimum seekable player position.
Returns `null` if no content is loaded.

This is useful for live contents, where the earliest time at which it is
possible to seek usually evolves over time.
This method allows to know the earliest possible time a seek can be performed
at any point in time.

As the given position is the absolute minimum position, you might add a security
margin (like a few seconds) when seeking to this position in a live content.
Not doing so could led to the player being behind the minimum position after
some time (e.g. because of buffering or decoding issues), and thus unable to
continue playing.

You will be alerted if the player's position fell behind the minimum possible
position by receiving a `warning` event (see the [player events
page](../events.md)) with an error having a `MEDIA_TIME_BEFORE_MANIFEST`
`code` property (see the [player errors page](../errors.md)).
Note that you can also have those warnings without any seek operation, e.g. due
to buffering for too long.

For VoD contents, as the minimum position normally doesn't change, seeking at
the minimum position should not cause any issue.

#### Example

```js
// Seeking close to the minimum position (with a 5 seconds security margin)
player.seekTo({ position: player.getMinimumPosition() + 5 });
```

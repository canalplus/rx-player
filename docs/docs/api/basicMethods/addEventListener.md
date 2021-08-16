---
id: addEventListener-api
title: addEventListener method
sidebar_label: addEventListener
slug: addEventListener
---

---

**syntax**: `player.addEventListener(event, callback)`

**arguments**:

- _event_ (`string`): The event name.

- _callback_ (`Function`): The callback for the event.
  The same callback may be used again when calling `removeEventListener`.

---

Add an event listener to trigger a callback as it happens. The callback will
have the event payload as a single argument.

The RxPlayer API is heavily event-based. As an example: to know when a content
is loaded, the most straightforward way is to add an event listener for the
`"playerStateChange"` event. This can be done only through this method.

To have the complete list of player events, consult the [Player events
page](../events.md).

#### Example

```js
player.addEventListener("error", function (err) {
  console.log(`The player crashed: ${err.message}`);
});
```

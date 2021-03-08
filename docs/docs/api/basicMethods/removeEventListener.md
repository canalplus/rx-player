---
id: removeEventListener-api
title: removeEventListener method
sidebar_label: removeEventListener
slug: removeEventListener
---

---

**syntax**: `player.removeEventListener(event)` /
`player.removeEventListener(event, callback)`

**arguments**:

- _event_ (`string`): The event name.

- _callback_ (optional) (`Function`): The callback given when calling the
  corresponding `addEventListener` API.

---

Remove an event listener.
That is, remove a callback previously registered with `addEventListener` from
being triggered on the corresponding event. This also free-up the corresponding
ressources.

The callback given is optional: if not given, _every_ registered callback to
that event will be removed.

#### Example

```js
player.removeEventListener("playerStateChange", listenerCallback);
```

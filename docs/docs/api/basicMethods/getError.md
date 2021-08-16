---
id: getError-api
title: getError method
sidebar_label: getError
slug: getError
---

---

**syntax**: `const currentError = player.getError()`

**return value**: `Error|null`

---

Returns the current "fatal error" if one happenned for the last loaded content.
Returns `null` otherwise.

A "fatal error" is an error which led the current loading/loaded content to
completely stop.
Such errors are usually also sent through the `"error"` event when they happen.

See [the Player Error documentation](../errors.md) for more information.

#### Example

```js
const error = player.getError();

if (!error) {
  console.log("The player did not crash");
} else if (error.code === "PIPELINE_LOAD_ERROR") {
  console.error("The player crashed due to a failing request");
} else {
  console.error(`The player crashed: ${error.code}`);
}
```

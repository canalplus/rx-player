---
id: isLive-api
title: isLive method
sidebar_label: isLive
slug: isLive
---

---

**syntax**: `const isLive = player.isLive()`

**return value**: `Boolean`

---

Returns `true` if the content is a "live" content (e.g. a live TV Channel).
`false` otherwise.

Also `false` if no content is loaded yet.

#### Example

```js
if (player.isLive()) {
  console.log("We're playing a live content");
}
```

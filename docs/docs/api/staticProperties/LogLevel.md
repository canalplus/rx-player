---
id: LogLevel-api
title: LogLevel method
sidebar_label: LogLevel
slug: LogLevel
---

---

_type_: `string`

_default_: `"NONE"`

---

The current level of verbosity for the RxPlayer logs. Those logs all use the
console.

From the less verbose to the most:

- `"NONE"`: no log

- `"ERROR"`: unexpected errors (via `console.error`)

- `"WARNING"`: The previous level + minor problems encountered (via
  `console.warn`)

- `"INFO"`: The previous levels + noteworthy events (via `console.info`)

- `"DEBUG"`: The previous levels + normal events of the player (via
  `console.log`)

If the value set to this property is different than those, it will be
automatically set to `"NONE"`.

#### Example

```js
import RxPlayer from "rx-player";
RxPlayer.LogLevel = "WARNING";
```

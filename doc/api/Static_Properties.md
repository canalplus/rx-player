# RxPlayer Static Properties

The RxPlayer has multiple static properties allowing to read or modify global
RxPlayer attributes.

## version

The `version` static property returns a string corresponding to the current
version of the RxPlayer:

### example

```js
import RxPlayer from "rx-player";

console.log("Current RxPlayer version:", RxPlayer.version);
```

## LogLevel

The current level of verbosity for the RxPlayer logs, as a string.

Those logs all use the console.
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

### Example

```js
import RxPlayer from "rx-player";
RxPlayer.LogLevel = "WARNING";
```

## ErrorTypes

The different "types" of Error you can get on playback error,

See [the Player Error documentation](./Player_Errors.md) for more information.

## ErrorCodes

The different Error "codes" you can get on playback error,

See [the Player Error documentation](./Player_Errors.md) for more information.

# RxPlayer Static Properties

The RxPlayer has multiple static properties allowing to read or modify global RxPlayer
attributes.

## version

The `version` static property returns a string corresponding to the current version of the
RxPlayer:

### example

```js
import RxPlayer from "rx-player";

console.log("Current RxPlayer version:", RxPlayer.version);
```

## LogLevel

The current level of verbosity for the RxPlayer logs, as a string.

Those logs all use the console. From the less verbose to the most:

- `"NONE"`: no log

- `"ERROR"`: unexpected errors (via `console.error`)

- `"WARNING"`: The previous level + minor problems encountered (via `console.warn`)

- `"INFO"`: The previous levels + noteworthy events (via `console.info`)

- `"DEBUG"`: The previous levels + normal events of the player (via `console.log`)

If the value set to this property is different than those, it will be automatically set to
`"NONE"`.

### Example

```js
import RxPlayer from "rx-player";
RxPlayer.LogLevel = "WARNING";
```

## LogFormat

Allows to configure the format log messages will have.

Can be set to either:

- `"standard"`: Regular log messages will be printed, this is the default format.

- `"full"`: Log messages will be enriched with timestamps and namespaces, which allows
  them to be easier to programatically exploit.

  You may for example prefer that format when reporting issues to the RxPlayer's
  maintainers, so we are able to extract more information from those logs.

### Example

```js
import RxPlayer from "rx-player";
RxPlayer.LogFormat = "full";
```

## ErrorTypes

The different "types" of Error you can get on playback error,

See [the Player Error documentation](./Player_Errors.md) for more information.

## ErrorCodes

The different Error "codes" you can get on playback error,

See [the Player Error documentation](./Player_Errors.md) for more information.

# getWallClockOffset

## Description

When playing live contents, you might want to display in your interface time adjusted so
it corresponds to the diffusion time (e.g. `09:00` if a live program begins at 9) and not
the more abstract position returned by API like `getPosition`, `getMinimumPosition` or
`getMaximumPosition`.

For the current position, you can just call
[the `getWallClockTime` method](./getWallClockTime.md) for this, however for other API
(like `getMinimumPosition` etc.) there's no specialized method to adjust that time.

That is what `getWallClockOffset` is for, it returns the offset allowing to convert the
media position you get from most RxPlayer API into a live-adjusted unix timestamp (in
seconds) by adding the two.

For example, the following equality is true:

```js
player.getPosition() + player.getWallClockOffset() === player.getWallClockTime();
```

You may want to use this method to simplify conversion between the two units.

Note that there's nothing guaranteeing that this offset won't evolve over time for a given
content. You should call this method every time you need to perform the conversion.

### Example

```js
const wallClockTime = player.getWallClockTime();

// This one is expressed as a media position
const maximumPosition = player.getMaximumPosition();

// convert wall-clock time to a media position
const currentPosition = wallClockTime - player.getWallClockOffset();

console.log("delay from maximum position, in seconds", maximumPosition - currentPosition);
```

## Syntax

```js
const offset = player.getWallClockOffset();
```

- **return value** `number`: The offset in seconds to add to a media position to obtain
  the "wall-clock time" (live-adjusted time, in seconds).

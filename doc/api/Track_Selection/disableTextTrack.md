# disableTextTrack

## Description

Disable the current text track, if one.

After calling that method, no subtitles track will be displayed for the current
Period until `setTextTrack` is called.

You can also disable the text track for another Period by calling
`disableTextTrack` with the corresponding Period's id in argument. Such id can
be obtained through the `getAvailablePeriods` method, the `newAvailablePeriods`
event or the `periodChange` event.

```js
// example: disabling the text track for all Periods
const periods = rxPlayer.getAvailablePeriods();
for (const period of periods) {
  rxPlayer.disableTextTrack(period.id);
}
```

## Syntax

```js
// Disable the current text track
player.disableTextTrack();

// Disable the text track for a specific Period
player.disableTextTrack(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to disable the text track. If not defined, the text track of the
      currently-playing Period will be disabled.

# disableAudioTrack

## Description

Disable the current audio track, if one.

Might enter in `RELOADING` state for a short period after calling this API.

You can also disable the audio track for another Period by calling `disableAudioTrack`
with the corresponding Period's id in argument. Such id can be obtained through the
`getAvailablePeriods` method, the `newAvailablePeriods` event or the `periodChange` event.

```js
// example: disabling the audio track for all Periods
const periods = rxPlayer.getAvailablePeriods();
for (const period of periods) {
  rxPlayer.disableAudioTrack(period.id);
}
```

Note that disabling the audio track if there's no video track currently selected currently
will lead to a [`NO_AUDIO_VIDEO_TRACKS` player error](../Player_Errors.md).

## Syntax

```js
// Disable the current audio track
player.disableAudioTrack();

// Disable the audio track for a specific Period
player.disableAudioTrack(periodId);
```

- **arguments**:
  1.  _periodId_ `string|undefined`: The `id` of the Period for which you want to disable
      the audio track. If not defined, the audio track of the currently-playing Period
      will be disabled.

# getLockedAudioRepresentations

## Description

Get the last audio Representations manually locked through the
[`lockAudioRepresentations`](./lockAudioVideoRepresentations.md) method.

Returns `null` when no audio Representation is locked.

Without arguments, it returns the list of locked audio Representation for the
current [`Period`](../../Getting_Started/Glossary.md#period). You can also
get the list for any Period by providing its `id` property as argument.

```js
// example: getting Representations locked for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getLockedAudioRepresentations(periods[0].id);
```

## Syntax

```js
// Get information about the locked audio Representation for the current Period
const lockedAudioRepresentations = player.getLockedAudioRepresentations();

// Get information about the locked audio Representation for a specific Period
const lockedAudioRepresentations = player.getLockedAudioRepresentations(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get its locked audio Representation.
      If not defined, the information associated to the currently-playing Period
      will be returned.

  - **return value**: `Array.<string>|null`: Last locked audio
    Representation for the corresponding Period
    `null` if no audio Representation is locked.

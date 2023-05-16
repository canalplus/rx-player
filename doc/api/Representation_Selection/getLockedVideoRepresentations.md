# getLockedVideoRepresentations

## Description

Get the last video Representations manually locked through the
[`lockVideoRepresentations`](./lockAudioVideoRepresentations.md) method.

Returns `null` when no video Representation is locked.

Without arguments, it returns the list of locked video Representation for the
current [`Period`](../../Getting_Started/Glossary.md#period). You can also
get the list for any Period by providing its `id` property as argument.

```js
// example: getting Representations locked for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getLockedVideoRepresentations(periods[0].id);
```

## Syntax

```js
// Get information about the locked video Representation for the current Period
const lockedVideoRepresentations = player.getLockedVideoRepresentations();

// Get information about the locked video Representation for a specific Period
const lockedVideoRepresentations = player.getLockedVideoRepresentations(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get its locked video Representation.
      If not defined, the information associated to the currently-playing Period
      will be returned.

  - **return value**: `Array.<string>|null`: Last locked video
    Representation for the corresponding Period
    `null` if no video Representation is locked.

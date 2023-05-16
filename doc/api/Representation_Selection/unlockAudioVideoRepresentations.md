# unlockVideoRepresentations / unlockAudioRepresentations

## Description

Disable a lock previously set respectively with [the `lockVideoRepresentations`
or the `lockAudioRepresentations`](./lockAudioVideoRepresentations.md)
methods.

Without arguments, it unlocks locked Representation for the current
[`Period`](../../Getting_Started/Glossary.md#period).

You can also unlock Representations for any Period by providing its `id`
property as argument.

```js
// Example: unlocking video Representations for the first Period
const periods = rxPlayer.getAvailablePeriods();
rxPlayer.unlockVideoRepresentations(periods[0].id);
```

## Syntax

```js
// Unlock video Representations for the current Period
player.unlockVideoRepresentations();

// Unlock audio Representations for the current Period
player.unlockAudioRepresentations();

// Unlock video Representations for a specific Period
player.unlockVideoRepresentations(periodId);

// Unlock audio Representations for a specific Period
player.unlockAudioRepresentations(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get its video or audio Representations unlock.
      If not defined, it will apply to the currently-playing Period.

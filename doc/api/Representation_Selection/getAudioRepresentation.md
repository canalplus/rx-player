# getAudioRepresentation

## Description

Get information about the audio Representation currently loaded.

Note that this only returns the audio Representation that is *loaded* which may
be different to the one that is *played*.

The returned value can either be an object or:
  - `null` if no audio track is enabled right now.
  - `undefined` if no audio content has been loaded yet or if its information
    is unknown.

In case it a audio track is set and its properties is known, the
`getAudioRepresentation` method will return an object with the following
properties:

  - `id` (`string`): The id used to identify this Representation. No other
    audio Representation for the same [Period](../../Getting_Started/Glossary.md#period)
    will have the same `id`.

    This can be useful when locking the Representation through the
    [`lockAudioRepresentations`](./lockAudioVideoRepresentations.md) method.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in
    bits per seconds.

    `undefined` if unknown.

  - `codec` (`string|undefined`): The audio codec the Representation is
    in, as announced in the corresponding Manifest.

You can also get the information on the loaded audio Representation for another
Period by calling `getAudioRepresentation` with the corresponding Period's id
in argument. Such id can be obtained through the `getAvailablePeriods` method,
the `newAvailablePeriods` event or the `periodChange` event.

```js
// example: getting Representation information for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getAudioRepresentation(periods[0].id);
```

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), this method
returns "undefined".
</div>

## Syntax

```js
// Get information about the currently-loaded audio Representation
const audioRepresentation = player.getAudioRepresentation();

// Get information about the loaded audio Representation for a specific Period
const audioRepresentation = player.getAudioRepresentation(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get information about its currently loaded audio Representation.
      If not defined, the information associated to the currently-playing Period
      will be returned.

 - **return value** `Object|null|undefined`



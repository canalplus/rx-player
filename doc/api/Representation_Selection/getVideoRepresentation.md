# getVideoRepresentation

## Description

Get information about the video Representation currently loaded.

Note that this only returns the video Representation that is *loaded* which may
be different to the one that is *played*.

The returned value can either be an object or:
  - `null` if no video track is enabled right now.
  - `undefined` if no video content has been loaded yet or if its information
    is unknown.

In case it a video track is set and its properties is known, the
`getVideoRepresentation` method will return an object with the following
properties:

  - `id` (`string`): The id used to identify this Representation. No other
    video Representation for the same [Period](../../Getting_Started/Glossary.md#period)
    will have the same `id`.

    This can be useful when locking the Representation through the
    [`lockVideoRepresentations`](./lockAudioVideoRepresentations.md) method.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in
    bits per seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of this video Representation, in
    pixels.

  - `height` (`Number|undefined`): The height of this video Representation, in
    pixels.

  - `codec` (`string|undefined`): The video codec the Representation is
    in, as announced in the corresponding Manifest.

  - `frameRate` (`number|undefined`): The video frame rate, in frames per second.

  - `hdrInfo` (`Object|undefined`) Information about the hdr
    characteristics of the Representation.
    (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

You can also get the information on the loaded video Representation for another
Period by calling `getVideoRepresentation` with the corresponding Period's id
in argument. Such id can be obtained through the `getAvailablePeriods` method,
the `newAvailablePeriods` event or the `periodChange` event.

```js
// example: getting Representation information for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getVideoRepresentation(periods[0].id);
```

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), this method
returns "undefined".
</div>

## Syntax

```js
// Get information about the currently-loaded video Representation
const videoRepresentation = player.getVideoRepresentation();

// Get information about the loaded video Representation for a specific Period
const videoRepresentation = player.getVideoRepresentation(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get information about its currently loaded video Representation.
      If not defined, the information associated to the currently-playing Period
      will be returned.

 - **return value** `Object|null|undefined`


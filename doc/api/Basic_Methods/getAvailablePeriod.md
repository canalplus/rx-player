# getAvailablePeriods

## Description

Returns information on all [Periods](../Getting_Started/Glossary.md#period)
currently in the current content.

This method mainly allows to obtain and information on the audio, video or text
tracks as well as on audio and video Representations - and to change any of
them - by using the corresponding Period's `id` property returned here.

The value returned by this method is an array of object, each describing a
single Period in chronological order.
Those objects all contain the following properties:

  - `start` (`number`): The starting position at which the Period starts, in
    seconds.

  - `end` (`number|undefined`): The position at which the Period ends, in
    seconds.

    `undefined` either if not known or if the Period has no end yet (e.g. for
    live contents, the end might not be known for now).

  - `id` (`string`): `id` for this Period, allowing to call track and
    Representation selection APIs (such as `setAudioTrack` and
    `lockVideoRepresentations` for example) even if that Period is not currently
    playing.

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method might just return an empty array.
</div>

## Syntax

```js
const periods = rxPlayer.getAvailablePeriods();
```

  - **return value** `Array.<Object>`: Information on all Periods currently
    available in the content.


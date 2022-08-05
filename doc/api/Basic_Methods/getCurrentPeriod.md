# getCurrentPeriod

## Description

Returns information on the current[Periods](../Getting_Started/Glossary.md#period)
being played.

The value returned by this method is either `null`, for when no content is
currently being played or when it is unknown, or an object with the following
properties:

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
const currentPeriod = rxPlayer.getCurrentPeriod();
```

  - **return value** `Object|null`: Information on the current Period being
    played.

    `null` either if no content is currently playing or if the current `Period`
    is unknown.


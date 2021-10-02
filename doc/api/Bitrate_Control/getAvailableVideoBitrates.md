# getAvailableVideoBitrates

## Description

The different bitrates available for the current video track in bits per
seconds.

<div class="note">
Note for multi-Period contents:

This method will only return the available video bitrates of the
<a href="../../Getting_Started/Glossary.md#period">Period</a> that is currently playing.

</div>

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method returns an empty array.
</div>

## Syntax

```js
const bitrates = player.getAvailableVideoBitrates();
```

- **return value** `Array.<Number>`: the available video bitrates for the
  current track of the current Period.

## Example

```js
const videoBitrates = player.getAvailableVideoBitrates();
if (videoBitrates.length) {
  console.log(
    "The current video is available in the following bitrates",
    videoBitrates.join(", ")
  );
}
```

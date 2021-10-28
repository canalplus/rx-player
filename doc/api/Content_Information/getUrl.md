# player.getUrl()

## Description

Returns the URL of the downloaded [Manifest](../../Getting_Started/Glossary.md#manifest).

<div class="note">
In <i>DirectFile</i> mode (see <a href="../Loading_a_Content.md#transport">
loadVideo options</a>), returns the URL of the content being played.
</div>

Returns `undefined` if no content is loaded yet.

#### Example

```js
const url = player.getUrl();
if (url) {
  console.log("We are playing the following content:", url);
}
```

## Syntax

```js
const url = player.getUrl();
```

 - **return value** `string`

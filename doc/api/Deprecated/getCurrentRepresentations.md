# getCurrentRepresentations

<div class="warning">
This option is deprecated, it will disappear in the next major release
`v4.0.0` (see <a href="../Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

## Description

Returns the [Representations](../../Getting_Started/Glossary.md#representation) being
loaded per type if a [Manifest](../../Getting_Started/Glossary.md#manifest) is loaded. The
returned object will have at most a key for each type ("video", "audio", "text" and
"image") which will each contain an array of Representation Objects.

The Representation object structure is relatively complex and is described in the
[Manifest Object structure page](../Miscellaneous/Manifest_Object.md#structure-of-a-representation-object).

`null` if the current Representations are not known yet.

`null` in _DirectFile_ mode (see [loadVideo options](../Loading_a_Content.md#transport)).

## Syntax

```js
const representations = player.getCurrentRepresentations();
```

- **return value** `Object|null`: The current Representation objects, per type. `null` if
  not known.

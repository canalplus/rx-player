# getContentUrls

## Description

Returns URLs through which the [Manifest](../../Getting_Started/Glossary.md#manifest)
being played can be reached, or in `DirectFile` mode, of the content being
played.

Returns `undefined` if no content is loaded yet or if no URL is known.

#### Example

```js
const urls = player.getContentUrls();
if (urls !== undefined && urls.length > 0) {
  console.log(
    "We are playing a content reachable through the following URLs:",
    urls
  );
}
```

## Syntax

```js
const urls = player.getContentUrls();
```

 - **return value** `Array.<string>|undefined`

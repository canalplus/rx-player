---
id: getUrl-api
title: getUrl method
sidebar_label: getUrl
slug: api/content-information/getUrl
---

--

**syntax**: `const url = player.getUrl()`

**return value**: `string`

--

Returns the URL of the downloaded [Manifest](../terms.md#manifest).

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns the URL of the content
being played.

Returns `undefined` if no content is loaded yet.

#### Example

```js
const url = player.getUrl();
if (url) {
  console.log("We are playing the following content:", url);
}
```

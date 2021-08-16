---
id: getPreferredTextTracks-api
title: getPreferredTextTracks method
sidebar_label: getPreferredTextTracks
slug: getPreferredTextTracks
---

---

**syntax**: `const preferences = player.getPreferredTextTracks()`

**return value**: `Array.<Object|null>`

---

Returns the current list of preferred text tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredTextTracks` constructor option or the last `setPreferredTextTracks` if
it was called:

```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```

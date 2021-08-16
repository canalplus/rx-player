---
id: getPreferredVideoTracks-api
title: getPreferredVideoTracks method
sidebar_label: getPreferredVideoTracks
slug: getPreferredVideoTracks
---

---

**syntax**: `const preferences = player.getPreferredVideoTracks()`

**return value**: `Array.<Object|null>`

---

Returns the current list of preferred video tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredVideoTracks` constructor option or the last `setPreferredVideoTracks`
if it was called.

It will return an empty Array if none of those two APIs were used until now.

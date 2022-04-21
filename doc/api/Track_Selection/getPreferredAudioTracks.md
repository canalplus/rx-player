# getPreferredAudioTracks

## Description

Returns the current list of preferred audio tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredAudioTracks` constructor option or the last `setPreferredAudioTracks`
if it was called.

It will return an empty Array if none of those two APIs were used until now.

## Syntax

```js
const preferences = player.getPreferredAudioTracks();
```

 - **return value** `Array.<Object>`

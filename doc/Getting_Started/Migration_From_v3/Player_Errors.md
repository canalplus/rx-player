# RxPlayer errors

Errors are what are sent through the `"error"` event, the `"warning"` event and
optionally returned by the `getPlayerError` method.

A few of them have changed in the v4.0.0. They are all listed here.

## `MediaError`

Previously, if no compatible audio and/or video codec was found in the Manifest,
a `MediaError` with the code `MANIFEST_PARSE_ERROR` would be sent through a
`"error"` event (and returned by the `getPlayerError` method) after several
`MediaError` with `MANIFEST_INCOMPATIBLE_CODECS_ERROR` `"warning"` events for each Adaptation with no supported codec found.

Now this final fatal error is also a `MediaError` with the code
`MANIFEST_INCOMPATIBLE_CODECS_ERROR`, as it's more precize.

## `NetworkError`

We removed the `xhr` property from `NetworkError` objects as it prevented us
from relying on the `fetch` API for requests.

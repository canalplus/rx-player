# Transport code ###############################################################


## Overview ####################################################################

The `transports` code in the ``transports/`` directory is the code translating
the streaming protocols available into a unified API.

Its roles are to:

  - download the manifest and parse it into an object that can be understood
    by the core of the rx-player

  - download segments, convert them into a decodable format if needed, and
    report important informations about them (like the duration of a segment)

  - give networking metrics to allow the core to better adapt to poor networking
    conditions


As such, most network request needed by the player are directly performed by
the `transports` code.



## Implementation ##############################################################

This code is completely divided by streaming protocols used.
E.g.  `DASH` streaming is entirely defined in its own directory and same thing
for `Smooth Streaming` or `MetaPlaylist` contents.
When playing a `DASH` content only the DASH-related code will be called. When
switching to a `Smooth Streaming` content, only the `Smooth Streaming` code
will be used instead.

To allow this logic, any streaming protocol exposed in `transports` exposes
the same interface and abstracts the difference to the rest of the code.
For the core of the rx-player, we do not have any difference between playing
any of the streaming protocols available.

This also means that all code relative to a specific streaming technology is
completely within the `transports` directory.
This allows to greatly simplify code maintenance and evolutivity. For example,
managing a new streaming protocol would mainly just need us to add some code
there. Same thing for adding a new feature to e.g. `DASH` or `Smooth`.

Each streaming protocol implementation present in the `transports` code exports
a single `transport` function.

The object returned by that function is often referenced as the `transport
pipelines`. It is documented [here](./pipeline.md).



## MetaPlaylist implementation #################################################

A MetaPlaylist is a specific case, as it wraps other streaming protocols.

More documentation about it can be found in [the corresponding API
documentation](../api/metaplaylist.md).

Architecture informations on it can also be found [here](./metaplaylist.md).

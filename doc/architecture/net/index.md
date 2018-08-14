# Networking code ##############################################################


## Overview ####################################################################

The networking code in the ``net/`` directory is the code handling streaming
protocols.

Its roles are to:

  - download the manifest and parse it into an object that can be understood
    by the core of the rx-player

  - download segments, convert them into a decodable format if needed, and
    report important informations about them (like the duration of a segment)

  - give networking metrics to allow the core to better adapt to poor networking
    conditions


As such, most network request needed by the player are directly performed by
the networking code.

The networking code is completely divided by streaming protocols used.
E.g.  `DASH` streaming has its own networking code and same thing for `Smooth
Streaming`.
When playing a `DASH` content only the DASH-related code will be called. When
switching to an `HSS` content, the `Smooth Streaming` code will be used instead.

To allow this logic, any streaming protocol exposed in the networking code
exposes the same interface and abstracts the difference to the rest of the code.
For the core of the rx-player, we do not have any difference between playing
any of the streaming protocols available.

This also means that all code relative to a specific streaming technology is
completely within the networking code.
This allows to greatly simplify code maintenance and evolutivity. For example,
managing a new streaming protocol would mainly just need us to add some code
there. Same thing for adding a new feature to e.g. `DASH` or `HSS`.



## Code organization ###########################################################

Each streaming protocol implementation present in the networking code exports
a single "transport" function.

This function takes configuration options as argument and returns an object
containing multiple other functions allowing to download and parse the manifest
and all type of segments managed in the rx-player.

It is then the task of the core of the rx-player to call those functions at the
right time.

The interface used by the transport function, its arguments and what it returns
is heavily documented in the typings declared in the corresponding code.

The networking code written there should limit at most any observable
side-effects and should stay relatively pure, meaning that calling functions
defined there with the same arguments should always return the same response.

As this code is heavily decoupled from the core, we found that keeping it that
way greatly simplified how we can both write it and use it in the core.

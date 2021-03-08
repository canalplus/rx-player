---
id: api-architecture
title: API
sidebar_label: API
slug: architecture/api
---

# The API

## Overview

The API is the front-facing part of the code.
It will be the only layer used by applications integrating the RxPlayer library.

As such, its main roles are to:

- provide a comprehensive API for the user

- translate user order into actions in the player

- redirecting events to the user

## Why is it so big?

`core/api/public_api.ts` is at the time of writing the longest file in all the
RxPlayer, with more than 2000 lines!

So why is that, isn't that a signal that we should split up its role into
multiple files?

Well, yes and no.
The reason why it ends up so big is mainly because of the following reasons:

- our API is itself pretty big!

- The API needs to have a considerable state because most of the other modules
  rely on Observables.

  I'll explain:
  The API can't just interogate at any time the concerned module as if it was
  a class with methods. Here most modules are functions which send events.

  The problem is that a library user might want to have an information at any
  given moment (for example, the current bitrate), which internally is only
  sent as an event by some module.
  It is thus the role of the API to store that information when it receives
  this event to then communicate it back to the user.

A huge part of what is defined in that file is actually the entire API, as
small functions. We found that having the whole API in a single file was
actually useful.

Likewise, as the API is a single class with a huge private state, being able
to see those state mutations in a single file allows us to better think about
how it all works.

Still, we did some efforts to reduce the size of that file. For example, some
long argument-parsing code has been moved out of this file, into
`core/api/option_parsers`. We might find other ways to reduce that size in the
future, but that's not a main concern for now.

## Subparts

To facilitate those actions, the API relies on multiple building blocks:

- **the Clock**

  Provide an Observable emitting regularly the current viewing conditions for
  the Player. Many RxPlayer modules rely on that clock.

- **the TrackChoiceManager**

  Ease up text/audio/video track switching to provide a simple-to-use API.

- **the option parsers**

  Parse options given to some RxPlayer API calls, to add default parameters
  and provide inteligible warnings/errors

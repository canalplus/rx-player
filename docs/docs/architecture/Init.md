---
id: init-architecture
title: Init
sidebar_label: Init
slug: architecture/init
---

# The Init

## Overview

The Init is the part of the code starting the logic behind playing a content.

Its code is written in the `src/core/init` directory.

Every time you're calling the API to load a new video, the init is called by it
(with multiple options).

The Init then starts loading the content and communicate back its progress to
the API through events.

```
                 +-----------+
 1. LOAD VIDEO   |           |      2. CALLS
---------------> |    API    | -------------------+
                 |           |                    |
                 +-----------+                    |
                       ^                          v
                       |                    +--------------+
                       |   3. EMIT EVENTS   |              |
                       +------------------- |     Init     |
                                            |              |
                                            +--------------+
```

During the various events happening on content playback, the Init will create /
destroy / update various player blocks. Example of such blocks are:

- Adaptive streaming management

- DRM management

- Manifest loading, parsing and refreshing

- Buffer management

- ...

## Usage

Concretely, the Init is a function which returns an Observable.
This Observable:

- will automatically load the described content on subscription

- will automatically stop and clean-up infos related to the content on
  unsubscription

- communicate on various streaming events through emitted notifications

- throw in the case of a fatal error (i.e. an error interrupting playback)

### Communication between the API and the Init

Objects emitted by the Observable is the only way the Init should be able to
communicate with the API.

The API is then able to communicate back to the Init, either:

- by Observable provided by the API as arguments when the Init function was
  called

- by emitting through Subject provided by the Init, as a payload of one of
  its event

Thus, there is three ways the API and Init can communicate:

- API -> Init: When the Init function is called (so a single time)

- Init -> API: Through events emitted by the returned Observable

- API -> Init: Through Observables/Subjects the Init function is in possession
  of.

### Emitted Events

Events allows the Init to reports milestones of the content playback, such as
when the content is ready to play.

It's also a way for the Init to communicate information about the content and
give some controls to the user.

For example, as available audio languages are only known after the manifest has
been downloaded and parsed, and as it is most of all a user preference, the
Init can emit to the API, RxJS Subjects allowing the API to "choose" at any
time the wanted language.

### Playback rate management

The playback rate (or speed) is updated by the Init.

There can be three occasions for these updates:

- the API set a new Speed (`speed$` Observable).

- the content needs to build its buffer.

  In which case, the playback speed will be set to 0 (paused) even if the
  API set another speed.

- the content has built enough buffer to un-pause.
  The regular speed set by the user will be set again in that case.

---
id: dash_rxplayer_adaptation_difference
title: Differences between DASH' AdaptationSets and the rx-player "Adaptation"
sidebar_label: DASH' AdaptationSets vs rx-player "Adaptation"
slug: additional_ressources/dash_rxplayer_adaptation_difference
---

The RxPlayer defines an `Adaptation` object (also sometimes called `Track`)
which follow as close as possible the concept of the `AdaptationSet` in
the DASH protocol.

However, to answer practically to some of the features allowed by DASH while
still respecting the [DASH-IF "IOP"](https://dashif.org/guidelines/), we had to
take some (minor) freedom with our interpretation of it.

## Merging of multiple AdaptationSets into a single Adaptation

The main difference is that all similar `AdaptationSet` which are marked as
"seamlessly switchable" between one another are merged into a single
`Adaptation` in the player.

### Why do we do that

This "switchable" concept is for example used in cases were multiple encryption
keys are present for different `Representation` (e.g. due to limitations coming
from right holders).

The problem is that the DASH-IF tells us that all `Representation` in a given
`AdaptationSet` have to use the same license.
This means that in the aforementioned case, the concerned `Representation`
have to be divided into multiple `AdaptationSet`. In a player, different
`AdaptationSet` means different "tracks" and thus a player won't try to
automatically switch between them.

This means that our adaptive algorithm won't be able to set the right quality
and that the library user would have to manually manage that instead.

Fortunately, the DASH-IF IOP planned a work-around for that kind of situation:
To allow a player to seamlessly switch between multiple `AdaptationSets`, the
DASH-IF allows a specific node, called `SupplementalProperty` to be added as
children of the concerned `AdaptationSet`s (with a specific value).

However, this brings another set of issues in the rx-player, where this
separation would lead to an excessively complicated API.

### What do we do

We thus decided to "merge" the `AdaptationSet`s into a single `Adaptation` if
all those conditions are filled:

- they both support seamless-switching between one-another (i.e. they both
  contain a `SupplementalProperty` node with the right values)

- they represent the same type of content ("audio", "video" or "text")

- they are of the same language, if one (letter-for-letter in the manifest)

- they have the same accessibility information (e.g. both are closed
  captions or audio description for the visually impaired).

If any of these conditions is not filled, the concerned `AdaptationSet`s stay
separated and the player will not try to switch between them.

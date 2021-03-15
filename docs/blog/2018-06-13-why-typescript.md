---
slug: why-typescript
title: Why Typescript?
author: Paul Berberian
author_title: RxPlayer Core Team
author_url: https://github.com/peaBerberian
author_image_url: https://avatars1.githubusercontent.com/u/8694124?v=4
tags: [typescript]
---

We recently (as from `v3.0.1`) have chosen to switch the rx-player codebase
from plain JavaScript to TypeScript.

We decided to write it down the reasons that have pushed us going into a full typescript codebase...

<!--truncate-->

# On using TypeScript

We recently (as from `v3.0.1`) have chosen to switch the rx-player codebase
from plain JavaScript to TypeScript.

This was in fact going for more than a month before the official `v3.0.1`
release, a time during which we maintained both JavaScript and TypeScript
versions of the player:

- We ported fixes we found with our typescript branch on the regular releases
- We ported improvements we were doing on regular releases to our typescript
  branch.

This is one of the reasons why you saw a LOT of release candidates for the
`v3.0.0`, as we were seeing more typos and other minor errors in master we had
to fix.

## Why refactoring?

It may appear shocking to most developpers, but we do not dislike JavaScript.
The language has its quirks (that we, as JS developers, learned to avoid the
hard way) but it has a flexibility that few other languages can compete with.

For example, our codebase adopts concepts of both Functional Programming and
Object Oriented Programming and it still looks idiomatic to the JS language
(even more since we're using ES6+ and RxJS).

In recent years, we were spectators of a huge trend to write desktop
applications (thanks to Electron), mobile applications (e.g. with react-native)
and servers (thanks to Node.js) in what is basically JavaScript. Because it is
becoming a kind of developper
[lingua-franca](https://en.wikipedia.org/wiki/Lingua_franca), the pool of
possible contributors is amazing. Moreover, as many developpers can read and
judge the quality of JavaScript codebases, open-sourcing becomes only more
exciting with a JavaScript project.

Despite this, we had issues with where our codebase was evolving toward:

- it was becoming fairly large, and the old team in charge of the project
  left. We lost a lot of the code's knowledge in that process.

- to renew the codebase and bring new features, some refactoring were
  needed. But we did not have enough confidence on our code to do them.

- As new features were added, bugs were also added.
  A majority of these issues were either based on typos, or on a wrong
  representation of the data structure we had at a certain point in the code.

- There also were multiple coding styles in different parts of the player,
  depending on the "era" in which the file was written in.
  This harms the "welcomeness" of the codebase, which, as an open-source
  library, is an important factor.

We liked to present the rx-player as a really maintanable project, but by
keeping things like they were, we had a substantial risk of going toward the
exact opposite.

With that in mind, we observed that none of us were developping in "browser's
JavaScript" anymore, as most projects we worked on made usage of Babel for
years now.
The code we write in looks very different than what is transpiled to run on
browsers (we're treating the "real" JavaScript today as a - easily
readable - bytecode).

As such, we knew we needed to do something about the code, and we were not
hesitant to do substantial changes, while not wanting to depart too much from
JavaScript.

## Why TypeScript?

When we were brainstorming on what we could do to improve our codebase, we edged
a lot around a better type system. As functional-programming fans, we were
seeing some wonderful type systems in other programming languages (Haskell,
Scala, Rust) that we thought could partially answer to a lot of our problems.
One of us worked with Scala in its previous professional experience, this also
amplified the need to "improve" our JavaScript.

In the browser's world, there were two possibilities:

- using another language transpiled to JavaScript (elm, PureScript, Scala.js)
- using a "superset" of JavaScript, which gives us typings without changing
  the base language

The first solution was not wanted, as we would lost a lot of possible
contributors (both in-house or external), but also because it would need a lot
more work we could not afford.

The second solution was the only one we actually seriously thought about.
As such, a little more than a month ago, We began porting the rx-player in both
flow and TypeScript, to see which type system we could profit the more from.

We found both to be really similar for what we wanted to achieve. TypeScript
was finally chosen because:

1. It has a lot more traction than flow today, with a lot more tools and a lot
   more codebases written in/for TypeScript. This gives us more guarantees
   about the language's future.

2. RxJS, VisualStudioCode, BabylonJS and AngularJS are all well-regarded
   codebases, all written in TypeScript. We consider this as a proof that the
   language can helps us toward our goals, and that the language is mature
   enough today.

3. The future of flow seemed too uncertain. This is even more the case now
   that Facebook is working on [the Reason
   language](https://reasonml.github.io/).

## What we have done

When we began to really consider switching the source to TypeScript, we set one
goal before the release: The whole RxPlayer should work under TypeScript's
"strict" mode, and the code should look enough like idiomatic TypeScript to be
presented as a _TypeScript project_ (and not as a _ported JavaScript_ one).

As such, we worked on every files in the _src_ directory, even doing important
refactorings, to ensure our code was elegant enough to be maintenable and
presentable.
Today, we have the confidence that the base we have can be approached naturally
in a TypeScript way.

We "switched" every rx-player source and unit tests files.

## What we still need to do

Some parts of the code still need work to look like perfect _idiomatic_
TypeScript.

For example, the part gluing our networking logic to the streaming logic (what
we call the "pipeline") relies too much on **any** types and casting.
This is the main part that needs work today. Specifically, the
manifest-refreshing logic shares too much logic with the segment-downloading
one, leading to types impossible to set.

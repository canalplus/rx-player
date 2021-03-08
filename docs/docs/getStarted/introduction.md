---
id: introduction-getStarted
title: Introduction
sidebar_label: Introduction
slug: /intro
---

The **RxPlayer** is a library implementing a [DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP)
and [Microsoft Smooth Streaming](https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming#Microsoft_Smooth_Streaming)
video player directly on the browser, without plugins.
It relies on HTML5 [Media Source Extensions](https://en.wikipedia.org/wiki/Media_Source_Extensions)
and [Encrypted Media extensions](https://en.wikipedia.org/wiki/Encrypted_Media_Extensions)
and is written in [TypeScript](http://www.typescriptlang.org/), a superset of
JavaScript.

It is currently used in production for premium services and targets several
devices, such as computers, phones, but also set-top-boxes, smart TVs and other
peculiar environments.

Its main goals are:

- To play live and On Demand Smooth and DASH contents for extended amounts of
  time, with or without DRM

- To offer a first-class user experience (best quality without any buffering,
  low latency...)

- To be configurable and extendable (e.g. for Peer-to-Peer streaming, STB
  integration...)

- To be easy to integrate and use as a library in various codebases.

---
id: setFullscreen-api
title: setFullscreen method
sidebar_label: setFullscreen
slug: api/deprecated/setFullscreen
---

--

:warning: This method is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](./deprecated.md)).

--

_arguments_: `Boolean`

Switch or exit the `<video>` element to fullscreen mode. The argument is an
optional boolean:

- if set:

  - `true`: enters fullscreen
  - `false`: exit fullscreen

- if not set: enter fullscreen

Note that **only the video element will be set to fullscreen mode**. You might
prefer to implement your own method to include your controls in the final UI.

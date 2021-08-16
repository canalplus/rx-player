---
id: hdr
title: High Dynamic Range
sidebar_label: HDR
slug: hdr
---

# HDR support

## Overview

HDR (High Dynamic Range) is a video technology that improves the way light is
represented by permitting to render brighter highlights, darker shadows and
more details beetwen both ends. Sometimes, it allows to reproduce richer colors
than with the standard dynamic range.

## API

Behind this principle, several formats exists (HDR10, HLG, Dolby Vision) and
implements specific media and stream encoding and packaging technologies. When
using streaming technologies, both streaming manifest and codecs strings can
provide information about the technical HDR characteristics of the content.

These information are parsed and exposed through the `hdrInfo` attribute that
can be found in the periods/adaptation/representation path of the RxPlayer
manifest object. Also, the `getAvailableVideoTracks` and `getVideoTrack`
functions and the `videoTrackChange` event carries the `hdrInfo`.

### hdrInfo

- colorDepth: `number|undefined` : It is the bit depth used for encoding the
  color for a pixel. The more bits are used for encoding, the more color shades
  could be rendered. It allows to increase rendering dynamic range without color
  banding.
- eotf: `string|undefined` : It is the HDR eotf. It is the transfer function
  having the video signal as input and converting it into the linear light
  output of the display.
  For example, pq (published as standard SMPTE2084) is an eotf developped by
  Dolby for HDR contents and capable of rendering brightness until 10000 nits
  (the derived SI unit of luminance).
- colorSpace: `string|undefined` : It is the video color space used for
  encoding. An HDR content may not have a wide color gamut.
  HD TV standards define the use of the rec709 color space for content. Most of
  HDR standards define the use of rec2020, which is a color space that contains
  rec709 color space and more. In other words, rec2020 can reproduce colors that
  cannot be shown with the rec709.

## Exploiting the API

HDR do not specify new display's capabilities. However, it allows to make better
use of the display brightness, contrast and color capabilities. HDR will not be
rendered the same way on each used display. It is possible through several APIs
to query the browser about its screen characteristics, to speculate about the
quality of the HDR rendering. Here are the available APIs now :

### Color depth

In HDR, more colors and brightness levels have to be encoded. More than 8 bits
par component are used in most of standards. It is possible to check how many
bits are used for reproducing colors on the output display, to ensure the color
shades could be rendered.

```js
/**
 * It is the bit depth used for encoding one color. Example :
 * screen.colorDepth = 48 :
 * - 12 bits for the red component
 * - 12 bits for the blue component
 * - 12 bits for the green component
 * - 12 bits for the alpha component (optional)
 */
const colorDepth = screen.colorDepth;

/**
 * The media query tells if the current output device is compatible
 * with the given media characteristics.
 * Here, it tells if the given color depth for one component is supported.
 */
const is10bitsSupported = window.matchMedia("(min-color: 10)").matches;
```

### Color gamut

It is possible to check if the output device is capable of displaying standard
color gamut that are used in HDR formats.

```js
/**
 * The media query tells if the current output device is compatible
 * with the given media characteristics.
 * Here, it tells if the output device is capable of displaying approximatively
 * the given color space.
 */
const isRec2020Supported = window.matchMedia("(color-gamut: rec2020)").matches;
```

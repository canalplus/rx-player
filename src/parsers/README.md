# Parsers

| Consideration           | Status                                       |
| ----------------------- | -------------------------------------------- |
| Preferred import style  | Specific parsers can be imported explicitely |
| Multithread environment | May run in WebWorker depending on the parser |

## Overview

This directory regroups "parsers", which translate a given format (either a
Manifest format, a text track format, a media container etc.) into more
exploitable properties for the rest of the RxPlayer.

They are here grouped by purposes:

- `containers`: For media containers files, such as ISOBMFF, CMAF and WebM
- `images`: For thumbnails container files, such as BIF.
- `manifest`: For Manifest files. Like the DASH's MPD or Smooth's Manifest.
- `texttracks`: For text track formats, most often subtitles. For example:
  WebVTT, TTML, SRT and so on.

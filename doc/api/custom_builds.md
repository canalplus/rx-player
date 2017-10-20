# Custom Builds

## Overview

The RxPlayer comes with many features, some of them you might not need. For example, you may only care for DASH with TTML subtitles and not about Smooth, VTT or SRT parsing.

Because each implementation has its need, we included the possibility to build customized files without the features you don't care about. This principally lead to a smaller file size.

This customization is done through environment variables. The code will be removed when the minified version of the RxPlayer is built. To avoid any conflict with other environment variables, all of those are named ``RXP_<FEATURE-NAME>``.

For example, the following will remove all code related to Microsoft Smooth Streaming from the build:
```sh
RXP_SMOOTH=false npm run build:min
```

## Environment variables

Here is the list of available environment variables:

  - RXP_SMOOTH
  If set to "false", all code relative to HSS streaming will be ignored
  during a build.


  - RXP_DASH
  If set to "false", all code relative to DASH streaming will be ignored
  during a build.


  - RXP_NATIVE_TTML
  If set to "false", all code relative to TTML parsing for native text tracks
  will be ignored during a build.


  - RXP_NATIVE_SAMI
  If set to "false", all code relative to SAMI parsing for native text tracks
  will be ignored during a build.


  - RXP_NATIVE_VTT
  If set to "false", all code relative to VTT parsing for native text tracks
  will be ignored during a build.


  - RXP_NATIVE_SRT
  If set to "false", all code relative to SRT parsing for native text tracks
  will be ignored during a build.


  - RXP_HTML_SAMI
  If set to "false", all code relative to SAMI parsing for html text tracks*
  will be ignored during a build.


  - RXP_HTML_TTML
  If set to "false", all code relative to TTML parsing for html text tracks*
  will be ignored during a build.


  - RXP_HTML_VTT
  If set to "false", all code relative to VTT parsing for html text tracks*
  will be ignored during a build.


  - RXP_HTML_SRT
  If set to "false", all code relative to SRT parsing for html text tracks*
  will be ignored during a build.


  - RXP_ENV
  Either "production" or "development". "production" as a default.
  In the "development" case:
    - logs will be activated
    - the code will be less tolerant towards unwanted behavior
    - the code will be less optimized

*html text tracks are tracks which are added to a DOM element instead of a
<track> (the latter here being called "native") tag for a richer
formatting.

As you can see, this can lead to a lot of environment variable if you only need a handful of features. Their is no _barebone_/_minimal_ option to set them all to false by default right now as more feature switch can come in the near future.

Once this set is finalized, we will add the feature to set minimal builds.

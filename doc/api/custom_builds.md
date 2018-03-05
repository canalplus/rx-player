# Custom Builds ################################################################


## Table of Contents ###########################################################

- [Overview](#overview)
- [Environment variables](#env)
    - [RXP_SMOOTH](#env-smooth)
    - [RXP_DASH](#env-dash)
    - [RXP_NATIVE_TTML](#env-native-ttml)
    - [RXP_NATIVE_SAMI](#env-native-sami)
    - [RXP_NATIVE_VTT](#env-native-vtt)
    - [RXP_NATIVE_SRT](#env-native-srt)
    - [RXP_HTML_TTML](#env-html-ttml)
    - [RXP_HTML_SAMI](#env-html-sami)
    - [RXP_HTML_VTT](#env-html-vtt)
    - [RXP_HTML_SRT](#env-html-srt)
    - [RXP_ENV](#env-env)
- [Notes](#notes)



<a name="overview"></a>
## Overview ####################################################################

The RxPlayer comes with many features, some of them you might not need.
For example, you may only care for DASH with TTML subtitles and not about
Smooth, VTT or SRT parsing.

Because each implementation has its need, we included the possibility to build
customized files without the features you don't care about.
This principally lead to a smaller file size.

This customization is done through environment variables. The code will be
removed when the minified version of the RxPlayer is built.
To avoid any conflict with other environment variables, all of those are named
``RXP_<FEATURE-NAME>``.

For example, the following will remove all code related to Microsoft Smooth
Streaming from the build:

```sh
RXP_SMOOTH=false npm run build:min
```



<a name="env"></a>
## Environment variables #######################################################

Here is the list of available environment variables:


<a name="env-smooth"></a>
### RXP_SMOOTH #################################################################

True by default. If set to "false", all code relative to HSS streaming will be
ignored during a build.


<a name="env-dash"></a>
### RXP_DASH ###################################################################

True by default. If set to "false", all code relative to DASH streaming will be
ignored during a build.


<a name="env-native-ttml"></a>
### RXP_NATIVE_TTML ############################################################

True by default. If set to "false", all code relative to TTML parsing for native
text tracks will be ignored during a build.


<a name="env-native-sami"></a>
### RXP_NATIVE_SAMI ############################################################

True by default. If set to "false", all code relative to SAMI parsing for native
text tracks will be ignored during a build.


<a name="env-native-vtt"></a>
### RXP_NATIVE_VTT #############################################################

True by default. If set to "false", all code relative to VTT parsing for native
text tracks will be ignored during a build.


<a name="env-native-srt"></a>
### RXP_NATIVE_SRT #############################################################

True by default. If set to "false", all code relative to SRT parsing for native
text tracks will be ignored during a build.


<a name="env-html-ttml"></a>
### RXP_HTML_TTML ##############################################################

True by default. If set to "false", all code relative to TTML parsing for html
text tracks[[1]](#note-1) will be ignored during a build.


<a name="env-html-sami"></a>
### RXP_HTML_SAMI ##############################################################

True by default. If set to "false", all code relative to SAMI parsing for html
text tracks[[1]](#note-1) will be ignored during a build.


<a name="env-html-vtt"></a>
### RXP_HTML_VTT ###############################################################

True by default. If set to "false", all code relative to VTT parsing for html
text tracks[[1]](#note-1) will be ignored during a build.


<a name="env-html-srt"></a>
### RXP_HTML_SRT ###############################################################

True by default. If set to "false", all code relative to SRT parsing for html
text tracks[[1]](#note-1) will be ignored during a build.


<a name="env-env"></a>
### RXP_ENV ####################################################################

Either "production" or "development". "production" as a default.
In the "development" case:
  - logs will be activated
  - the code will be less tolerant towards unwanted behavior
  - the code will be less optimized



<a name="notes"></a>
## Notes #######################################################################
<a name="note-1"></a>[1] html text tracks are tracks which are added to a DOM

element instead of a ``<track>`` (the latter here being called "native") tag for
a richer formatting.

--------------------------------------------------------------------------------

As you can see, this can lead to a lot of environment variable if you only need
a handful of features. Their is no _barebone_/_minimal_ option to set them all
to false by default right now as more feature switch can come in the near
future.

Once this set is finalized, we will add the feature to set minimal builds.

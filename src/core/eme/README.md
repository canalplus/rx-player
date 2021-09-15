# The EMEManager ###############################################################


## Overview ####################################################################

This directory exports the ``EMEManager``, which allows to easily interface with
the browser APIs for decrypting a crypted content, it follows the [Encrypted
Media Extensions recommandations](https://www.w3.org/TR/encrypted-media/).

Like most modules in the RxPlayer, the `EMEManager` is just a function - called
a single time - returning an Observable.

This Observable then return event corresponding to different milestones related
to decrypting the content.

This module is particularly isolated from the rest of the code it mostly take:
  - The media element
  - DRM-related options
  - Observable emitting encryption initialization data found in the content

And can then do most of its work in the background.

Before going in, you're encouraged to read a little about the Encrypted Media
Extensions (EME). This code is heavy on EME APIs and may be difficult to follow
if you don't have a vague understanding of the concept of a `MediaKeySession`
or of a `MediaKeySystemAccess`.

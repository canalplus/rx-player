# Compatibility files ##########################################################

| Consideration           | Status                                      |
|-------------------------|---------------------------------------------|
| Preferred import style  | Compat files can be imported directly       |
| Multithread environment | Main thread or WebWorker depending on file  |

## Overview ####################################################################

Those are "Compat" files, which regroups any compatibility-related logic.

All those files try to make the RxPlayer work the exact same way on different
browsers and environments (desktop, set-top boxes, ChromeCast, smart TVs, game
consoles...) as those may have some differences between one another, most often
due to platform-specific issues.

Any logic which is just about implementing work-arounds for specific browsers
or environments (because they do not follow the specifications or the most
popular implementation of a feature) should be put there. This logic can be
either the implementation itself or just be the conditions to trigger those
work-arounds, on a case-by-case basis depending on what's more maintainable.

By having a single directory for compatibility work-arounds, we make those
specific issues more visible and easily updatable if a new target shares an
issue with an old one or if a platform issue is fixed.

The files exported here are mostly organized as one file per function. The rest
of the RxPlayer logic can then import those files when platform-specific
work-arounds and implementations are needed.

It is important that those files do not import any code from the RxPlayer,
outside of utils (in `src/utils`) to prevent both circular dependencies and
having a difficult-to-follow (a.k.a. "spaghetti") code architecture.

Any EME-related (Encrypted Media Extensions, specific APIs linked to DRM) are
implemented in the `eme` subdirectory.

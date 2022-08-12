# Compatibility files ##########################################################

Those are "Compat" files, which concentrates any compatibility-related logic.

All those files try to make the RxPlayer work the exact same way on different
browsers and environments (desktop, set-top boxes, ChromeCast, smart TVs...)
as those may have some differences between one another.

The files exported here are mostly organized as one file per function and are
all exported through the `index.ts` file.

Any logic which is just about implementing work-arounds for specific browsers
or environments (because the do not follow the specifications nor the most
popular implementation of a feature) should be put there.
This way, those can be easily checked and updated (for example when a new
browser version fixing the issue come, or when another browser is found to have
the same one) at any time.

It is important that those files do not import any code from the RxPlayer,
outside of utils (in `src/utils`).

Any EME-related (Encrypted Media Extensions, specific APIs linked to DRM) are
implemented in the `eme` subdirectory.

# Experimental tools and features

This directory defines "experimental" tools and features, which are tools and features
that:

- might rapidly evolve and change without needing to publish a new major version.
- might be removed at any new RxPlayer version.
- have less stability guarantees than other features and tools in the RxPlayer

The experimental tools' code is often directly written in that directory.

The experimental features' code however is most often written in their respective "normal"
directory in the RxPlayer code, to then be imported through this directory. This last step
is mainly to confine the "library path" of that feature to the
`rx-player/experimental/features` subdirectory.

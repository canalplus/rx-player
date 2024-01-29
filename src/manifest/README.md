# Manifest

This directory regroups definitions, types and utils related to the `Manifest`
concept which is a document/structure describing a played content.

Most RxPlayer modules are expected to only need to rely on the types exported
by this directory (they usually don't need to construct one). For this reason,
the `Manifest` class and its sub-classes are exported only through the `classes`
subdirectory. This is to make developers of other RxPlayer modules think hard if
what they want is the `Manifest` class, or just the type definition (in which
case it would be less error-prone to just depend on the corresponding type).

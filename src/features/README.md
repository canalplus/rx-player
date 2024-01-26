# Features code

This directory regroups the code importing all the "features" of the RxPlayer
piece by piece.

It is mostly used for allowing a library user to only imports some features of
the RxPlayer without importing others.

How this is technically done is through a global `features` Object, which will
have added properties (which corresponds to those features' code) each time a
new feature is added.

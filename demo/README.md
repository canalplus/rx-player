# RxPlayer demos ###############################################################

This directory hosts the code of various demo applications allowing to showcase
and more importantly test the RxPlayer.

As of now, there are two demos available:

  - the "full" demo (in ./full): This is the more advanced demo, the one that we
    generally link to but also the one with which we test the most often.

  - the "standalone" demo (in ./standalone): This is a very minimal demo relying
    just on an index.html containing a `<video>` element and an RxPlayer default
    build exposed through `window`,

This directory is not exposed to the outside world and as such can change as we
see fit.

Note that this directory only contains the code for the demo pages. Any script
allowing to serve them or push them to a server are out of its scope.

To know how to perform those actions, you can start from the topmost
documentation.

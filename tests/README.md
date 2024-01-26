# Tests

This directory regroups the RxPlayer's tests.

For now, they are of three natures:

- unit tests: they test specific and sensitive parts of the Player.

  They are written in directories named `__test__` alongside the
  corresponding tested code (in `src`).
  What's present in the `unit` directory here is just configuration code
  necessary to launch those tests.

- integration tests: they test the player globally, by simulating different
  "scenarios" (like playing a content and seeking to an un-buffered part).

  They are written here in the `integration` directory.

- memory tests: they check specifically the memory usage of the player.

  They are written here in the `memory` directory.

The `contents` directory exports mock contents useful for the `integration`
and `memory` tests. The syntax of those mocks is specific, please refer to
those already present before creating a new one.

The `utils` directory exports helper functions useful for the `integration`
and `memory` tests.

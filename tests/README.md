# Tests

This directory regroups the RxPlayer's tests.

## Types of RxPlayer tests

There are different types of tests in the RxPlayer:

- unit tests: they test specific and sensitive parts of the Player.

  They are written in directories named `__tests__` alongside the corresponding tested
  code (in `src`).

- integration tests: they test the player globally, by simulating different "scenarios"
  (like playing a content and seeking to an un-buffered part).

  They are written here in the `integration` directory.

- memory tests: they check specifically the memory usage of the player.

  They are written here in the `memory` directory.

- performance tests: they check the time taken to perform some key operations: loading a
  content, seeking etc.

  The intent is to limit the possibility that future improvements lead to higher delays in
  those operations.

  They are written here in the `performance` directory.

- conformance tests: Standalone HTML pages allowing to check that the current platform
  support some important features for the RxPlayer.

  They are intended to be relied on manually.

  They are written here in the `conformance` directory.

## Other directories and files

- The `contents` directory exports mock contents useful for the `integration` and `memory`
  tests. The syntax of those mocks is specific, please refer to those already present
  before creating a new one.

  This directory also contains a `server.mjs` file allowing to serve those contents while
  tests are running.

- The `utils` directory exports helper functions useful for the `integration` and `memory`
  tests.

- `globalSetup.mjs` is a file intended to be run through Node.js by test runners before
  actually running tests. It sets up the environment and a content server.

- `worker_file.mjs` is a "RxPlayer Worker" file intended for tests relying on advanced
  Multithreading behavior. It defines worker-side logic that might then be exploited by
  integration tests.

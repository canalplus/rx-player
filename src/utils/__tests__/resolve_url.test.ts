/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";
import resolveURL, {
  normalizeBaseURL,
} from "../resolve_url";

describe("utils - resolveURL", () => {
  it("should return an empty string if no argument is given", () => {
    expect(resolveURL()).to.equal("");
  });

  it("should concatenate multiple URLs", () => {
    expect(resolveURL("http://toto.com/a"))
      .to.equal("http://toto.com/a");
    expect(resolveURL("http://toto.com/a", "b/c/d/", "g.a"))
      .to.equal("http://toto.com/a/b/c/d/g.a");
  });

  it("should ignore empty strings when concatenating multiple URLs", () => {
    expect(resolveURL("", "http://toto.com/a", ""))
      .to.equal("http://toto.com/a");
    expect(resolveURL("http://toto.com/a", "b/c/d/", "", "g.a"))
      .to.equal("http://toto.com/a/b/c/d/g.a");
  });

  it("should remove a leading slash if one", () => {
    expect(resolveURL("http://toto.com/a", "/b/c/d/", "/", "/g.a"))
      .to.equal("http://toto.com/a/b/c/d/g.a");
  });

  it("should reset the concatenation if a given string contains a scheme", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a", "b"))
      .to.equal("torrent://g.a/b");
  });

  it("should have a - fairly simple - algorithm to simplify parent directories", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../a"))
      .to.equal("torrent://g.a/b/c/a");
    expect(
      resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../c/../../a")
    ).to.equal("torrent://g.a/b/a");
  });

  /* tslint:disable max-line-length */
  it("should have a - fairly simple - algorithm to simplify the current directory", () => {
  /* tslint:enable max-line-length */
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "./a"))
      .to.equal("torrent://g.a/b/c/d/a");
    expect(
      resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../c/.././a")
    ).to.equal("torrent://g.a/b/c/a");
  });
});

describe("utils - normalizeBaseURL", () => {
  it("should do nothing if there is no / in the given string", () => {
    expect(normalizeBaseURL(";.<;L'dl'02984lirsahg;oliwr"))
      .to.equal(";.<;L'dl'02984lirsahg;oliwr");
  });
  it("should remove the content of a string after the last /", () => {
    expect(normalizeBaseURL(";ojdsfgje/eprowig/tohjroj/9ohyjwoij/s"))
      .to.equal(";ojdsfgje/eprowig/tohjroj/9ohyjwoij/");
  });
});

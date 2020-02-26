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

import resolveURL, {
  normalizeBaseURL,
} from "../resolve_url";

describe("utils - resolveURL", () => {
  it("should return an empty string if no argument is given", () => {
    expect(resolveURL()).toBe("");
  });

  it("should concatenate multiple URLs", () => {
    expect(resolveURL("http://toto.com/a"))
      .toBe("http://toto.com/a");
    expect(resolveURL("http://toto.com/a", "b/c/d/", "g.a"))
      .toBe("http://toto.com/a/b/c/d/g.a");
  });

  it("should ignore empty strings when concatenating multiple URLs", () => {
    expect(resolveURL("", "http://toto.com/a", ""))
      .toBe("http://toto.com/a");
    expect(resolveURL("http://toto.com/a", "b/c/d/", "", "g.a"))
      .toBe("http://toto.com/a/b/c/d/g.a");
  });

  it("should remove a leading slash if one", () => {
    expect(resolveURL("http://toto.com/a", "/b/c/d/", "/", "/g.a"))
      .toBe("http://toto.com/a/b/c/d/g.a");
  });

  it("should reset the concatenation if a given string contains a scheme", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a", "b"))
      .toBe("torrent://g.a/b");
  });

  it("should have a - fairly simple - algorithm to simplify parent directories", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../a"))
      .toBe("torrent://g.a/b/c/a");
    expect(
      resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../c/../../a")
    ).toBe("torrent://g.a/b/a");
  });

  /* tslint:disable max-line-length */
  it("should have a - fairly simple - algorithm to simplify the current directory", () => {
  /* tslint:enable max-line-length */
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "./a"))
      .toBe("torrent://g.a/b/c/d/a");
    expect(
      resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../c/.././a")
    ).toBe("torrent://g.a/b/c/a");
  });
});

describe("utils - normalizeBaseURL", () => {
  it("should do nothing if there is no / in the given string", () => {
    expect(normalizeBaseURL(";.<;L'dl'02984lirsahg;oliwr"))
      .toBe(";.<;L'dl'02984lirsahg;oliwr");
  });
  it("should remove the content of a string after the last /", () => {
    expect(normalizeBaseURL(";ojdsfgje/eprowig/tohjroj/9ohyjwoij/s"))
      .toBe(";ojdsfgje/eprowig/tohjroj/9ohyjwoij/");
  });
  it("should do nothing if the only slash are part of the protocol", () => {
    expect(normalizeBaseURL("http://www.example.com"))
      .toBe("http://www.example.com");
    expect(normalizeBaseURL("https://a.t"))
      .toBe("https://a.t");
    expect(normalizeBaseURL("ftp://s"))
      .toBe("ftp://s");
  });
  it("should not include slash coming in query parameters", () => {
    expect(normalizeBaseURL("http://www.example.com?test/toto"))
      .toBe("http://www.example.com");
    expect(normalizeBaseURL("https://ww/ddd?test/toto/efewf/ffe/"))
      .toBe("https://ww/");
    expect(normalizeBaseURL("https://ww/rr/d?test/toto/efewf/ffe/"))
      .toBe("https://ww/rr/");
    expect(normalizeBaseURL("https://ww/rr/d/?test/toto/efewf/ffe/"))
      .toBe("https://ww/rr/d/");
  });
});

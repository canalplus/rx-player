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
  getFilenameIndexInUrl,
} from "../resolve_url";

describe("utils - resolveURL", () => {
  it("should return an empty string if no argument is given", () => {
    expect(resolveURL()).toBe("");
  });

  it("should concatenate multiple URLs", () => {
    expect(resolveURL("http://toto.com/a"))
      .toBe("http://toto.com/a");
    expect(resolveURL("http://toto.com/a", "b/c/d/", "g.a"))
      .toBe("http://toto.com/b/c/d/g.a");
  });

  it("should ignore empty strings when concatenating multiple URLs", () => {
    expect(resolveURL("", "http://toto.com/a", ""))
      .toBe("http://toto.com/a");
    expect(resolveURL("http://toto.com/a", "b/c/d/", "", "g.a"))
      .toBe("http://toto.com/b/c/d/g.a");
  });

  it("should remove a leading slash if one", () => {
    expect(resolveURL("http://toto.com/a", "/b/c/d/", "/", "/g.a"))
      .toBe("http://toto.com/g.a");
  });

  it("should reset the concatenation if a given string contains a scheme", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a", "b"))
      .toBe("torrent://g.a/b");
  });

  it("should have a - fairly simple - algorithm to simplify parent directories", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../a"))
      .toBe("torrent://g.a/b/a");
    expect(
      resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../c/../../a")
    ).toBe("torrent://g.a/a");
  });

  /* eslint-disable max-len */
  it("should have a - fairly simple - algorithm to simplify the current directory", () => {
  /* eslint-enable max-len */
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "./a"))
      .toBe("torrent://g.a/b/c/a");
    expect(
      resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a/b/c/d", "../c/.././a")
    ).toBe("torrent://g.a/b/a");
  });
});

describe("utils - getFilenameIndexInUrl", () => {
  it("should return the length for a string without slash", () => {
    const str = ";.<;L'dl'02984lirsahg;oliwr";
    expect(getFilenameIndexInUrl(str))
      .toEqual(str.length);
  });
  it("should return the index after the last / if one in URL", () => {
    expect(getFilenameIndexInUrl(";ojdsfgje/eprowig/tohjroj/9ohyjwoij/s"))
      .toEqual(36);
  });
  it("should return length if the only slash are part of the protocol", () => {
    const url1 = "http://www.example.com";
    expect(getFilenameIndexInUrl(url1))
      .toEqual(url1.length);
    const url2 = "https://a.t";
    expect(getFilenameIndexInUrl(url2))
      .toEqual(url2.length);
    const url3 = "ftp://s";
    expect(getFilenameIndexInUrl(url3))
      .toEqual(url3.length);
  });
  it("should not include slash coming in query parameters", () => {
    expect(getFilenameIndexInUrl("http://www.example.com?test/toto"))
      .toEqual(22);
    expect(getFilenameIndexInUrl("https://ww/ddd?test/toto/efewf/ffe/"))
      .toEqual(11);
    expect(getFilenameIndexInUrl("https://ww/rr/d?test/toto/efewf/ffe/"))
      .toEqual(14);
    expect(getFilenameIndexInUrl("https://ww/rr/d/?test/toto/efewf/ffe/"))
      .toEqual(16);
  });
});

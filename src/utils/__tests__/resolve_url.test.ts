import { describe, it, expect } from "vitest";
import resolveURL, { getFilenameIndexInUrl, getRelativePathUrl } from "../resolve_url";

describe(`utils - resolveURL ${resolveURL.name}`, () => {
  it("should return an empty string if no argument is given", () => {
    expect(resolveURL()).toBe("");
  });

  it("should concatenate multiple URLs", () => {
    expect(resolveURL("http://toto.com/a")).toBe("http://toto.com/a");
    expect(
      resolveURL("http://toto.com/a" /** Trailling slash missing */, "b/c/d/", "g.a"),
    ).toBe("http://toto.com/b/c/d/g.a");
    expect(
      resolveURL("http://toto.com/a/" /** With a trailling slash */, "b/c/d/", "g.a"),
    ).toBe("http://toto.com/a/b/c/d/g.a");
  });

  it("should ignore empty strings when concatenating multiple URLs", () => {
    expect(resolveURL("", "http://toto.com/a", "")).toBe("http://toto.com/a");
    expect(resolveURL("http://toto.com/a/", "b/c/d/", "", "g.a")).toBe(
      "http://toto.com/a/b/c/d/g.a",
    );
  });

  it("should handle absolute path and keep the last one only", () => {
    expect(resolveURL("http://toto.com/a", "/b/c/d/", "/", "/g.a")).toBe(
      "http://toto.com/g.a",
    );
  });

  it("should reset the concatenation if a given string contains a scheme", () => {
    expect(resolveURL("http://toto.com/a", "b/c/d/", "torrent://g.a", "b")).toBe(
      "torrent://g.a/b",
    );
  });

  it("should have a - fairly simple - algorithm to simplify parent directories", () => {
    expect(
      resolveURL("http://toto.com/a/", "b/c/d/", "torrent://g.a/b/c/d/", "../a"),
    ).toBe("torrent://g.a/b/c/a");
    expect(
      resolveURL("http://toto.com/a/", "b/c/d/", "torrent://g.a/b/c/d/", "../c/../../a"),
    ).toBe("torrent://g.a/b/a");
  });

  it("should have a - fairly simple - algorithm to simplify the current directory", () => {
    expect(
      resolveURL("http://toto.com/a/", "b/c/d/", "torrent://g.a/b/c/d/", "./a"),
    ).toBe("torrent://g.a/b/c/d/a");
    expect(
      resolveURL("http://toto.com/a/", "b/c/d/", "torrent://g.a/b/c/d/", "../c/.././a"),
    ).toBe("torrent://g.a/b/c/a");
  });

  it("should resolve absolute urls with overriding baseURL path", () => {
    expect(resolveURL("http://a/b/c/d;p?q", "/g")).toBe("http://a/g");
  });

  const normalExamples = [
    { input: "g:h", output: "g:h" },
    { input: "g", output: "http://a/b/c/g" },
    { input: "./g", output: "http://a/b/c/g" },
    { input: "g/", output: "http://a/b/c/g/" },
    { input: "/g", output: "http://a/g" },
    { input: "//g", output: "http://g" },
    { input: "?y", output: "http://a/b/c/d;p?y" },
    { input: "g?y", output: "http://a/b/c/g?y" },
    { input: "#s", output: "http://a/b/c/d;p?q#s" },
    { input: "g#s", output: "http://a/b/c/g#s" },
    { input: "g?y#s", output: "http://a/b/c/g?y#s" },
    { input: ";x", output: "http://a/b/c/;x" },
    { input: "g;x", output: "http://a/b/c/g;x" },
    { input: "g;x?y#s", output: "http://a/b/c/g;x?y#s" },
    { input: "", output: "http://a/b/c/d;p?q" },
    { input: ".", output: "http://a/b/c/" },
    { input: "./", output: "http://a/b/c/" },
    { input: "..", output: "http://a/b/" },
    { input: "../", output: "http://a/b/" },
    { input: "../g", output: "http://a/b/g" },
    { input: "../..", output: "http://a/" },
    { input: "../../", output: "http://a/" },
    { input: "../../g", output: "http://a/g" },
  ];
  normalExamples.forEach((example) => {
    it("should conform to RFC 3986 normal examples - case: " + example.input, () => {
      const baseURL: string = "http://a/b/c/d;p?q";
      // https://datatracker.ietf.org/doc/html/rfc3986#section-5.4.1
      expect(resolveURL(baseURL, example.input)).toBe(example.output);
    });
  });
  const abnormalExamples = [
    { input: "../../../g", output: "http://a/g" },
    { input: "../../../../g", output: "http://a/g" },
    { input: "/./g", output: "http://a/g" },
    { input: "/../g", output: "http://a/g" },
    { input: "g.", output: "http://a/b/c/g." },
    { input: ".g", output: "http://a/b/c/.g" },
    { input: "g..", output: "http://a/b/c/g.." },
    { input: "..g", output: "http://a/b/c/..g" },
    { input: "./../g", output: "http://a/b/g" },
    { input: "./g/.", output: "http://a/b/c/g/" },
    { input: "g/./h", output: "http://a/b/c/g/h" },
    { input: "g/../h", output: "http://a/b/c/h" },
    { input: "g;x=1/./y", output: "http://a/b/c/g;x=1/y" },
    { input: "g;x=1/../y", output: "http://a/b/c/y" },
    { input: "g?y/./x", output: "http://a/b/c/g?y/./x" },
    { input: "g?y/../x", output: "http://a/b/c/g?y/../x" },
    { input: "g#s/./x", output: "http://a/b/c/g#s/./x" },
    { input: "g#s/../x", output: "http://a/b/c/g#s/../x" },
  ];
  abnormalExamples.forEach((example) => {
    it("should conform to RFC 3986 abnormal examples - case: " + example.input, () => {
      // https://datatracker.ietf.org/doc/html/rfc3986#section-5.4.2
      const baseURL: string = "http://a/b/c/d;p?q";
      expect(resolveURL(baseURL, example.input)).toBe(example.output);
    });
  });

  it("should work with URL with a port number in the URL", () => {
    const baseURL = "http://example.com:8090/foo/";
    const relative = "bar";
    expect(resolveURL(baseURL, relative)).toBe("http://example.com:8090/foo/bar");
  });

  it("should work with credentials in the URL", () => {
    const baseURL = "http://username:password@example.com/";
    const relative = "bar";
    expect(resolveURL(baseURL, relative)).toBe(
      "http://username:password@example.com/bar",
    );
  });
});

describe("utils - getFilenameIndexInUrl", () => {
  it("should return the length for a string without slash", () => {
    const str = ";.<;L'dl'02984lirsahg;oliwr";
    expect(getFilenameIndexInUrl(str)).toEqual(str.length);
  });
  it("should return the index after the last / if one in URL", () => {
    expect(getFilenameIndexInUrl(";ojdsfgje/eprowig/tohjroj/9ohyjwoij/s")).toEqual(36);
  });
  it("should return length if the only slash are part of the protocol", () => {
    const url1 = "http://www.example.com";
    expect(getFilenameIndexInUrl(url1)).toEqual(url1.length);
    const url2 = "https://a.t";
    expect(getFilenameIndexInUrl(url2)).toEqual(url2.length);
    const url3 = "ftp://s";
    expect(getFilenameIndexInUrl(url3)).toEqual(url3.length);
  });
  it("should not include slash coming in query parameters", () => {
    expect(getFilenameIndexInUrl("http://www.example.com?test/toto")).toEqual(22);
    expect(getFilenameIndexInUrl("https://ww/ddd?test/toto/efewf/ffe/")).toEqual(11);
    expect(getFilenameIndexInUrl("https://ww/rr/d?test/toto/efewf/ffe/")).toEqual(14);
    expect(getFilenameIndexInUrl("https://ww/rr/d/?test/toto/efewf/ffe/")).toEqual(16);
  });
});

describe("utils - getRelativePathUrl", () => {
  it("should return relative paths for two absolute URLs", () => {
    expect(
      getRelativePathUrl(
        "https://www.example.com/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual("b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someDir/a.mp4",
        "https://www.example.com/someDir/b.mp4",
      ),
    ).toEqual("b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someDir/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual("../b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/a.mp4",
        "https://www.example.com/someDir/b.mp4",
      ),
    ).toEqual("someDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/someOtherDir/a.mp4",
        "https://www.example.com/someCommonDir/someDir/different/b.mp4",
      ),
    ).toEqual("../different/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/someOtherDir/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual("../../../b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
  });

  it("should return relative paths for two relative URLs", () => {
    expect(getRelativePathUrl("a.mp4", "b.mp4")).toEqual("b.mp4");
    expect(getRelativePathUrl("someDir/a.mp4", "someDir/b.mp4")).toEqual("b.mp4");
    expect(getRelativePathUrl("someDir/a.mp4", "b.mp4")).toEqual("../b.mp4");
    expect(getRelativePathUrl("a.mp4", "someDir/b.mp4")).toEqual("someDir/b.mp4");
    expect(
      getRelativePathUrl(
        "someCommonDir/someDir/different/a.mp4",
        "someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "someCommonDir/someDir/someOtherDir/a.mp4",
        "someCommonDir/someDir/different/b.mp4",
      ),
    ).toEqual("../different/b.mp4");
    expect(
      getRelativePathUrl("someCommonDir/someDir/someOtherDir/a.mp4", "b.mp4"),
    ).toEqual("../../../b.mp4");
    expect(
      getRelativePathUrl(
        "someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
  });

  it("should return relative paths for two relative URLs starting with '/'", () => {
    expect(getRelativePathUrl("/a.mp4", "/b.mp4")).toEqual("b.mp4");
    expect(getRelativePathUrl("/someDir/a.mp4", "/someDir/b.mp4")).toEqual("b.mp4");
    expect(getRelativePathUrl("/someDir/a.mp4", "/b.mp4")).toEqual("../b.mp4");
    expect(getRelativePathUrl("/a.mp4", "/someDir/b.mp4")).toEqual("someDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/someCommonDir/someDir/different/a.mp4",
        "/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/someCommonDir/someDir/someOtherDir/a.mp4",
        "/someCommonDir/someDir/different/b.mp4",
      ),
    ).toEqual("../different/b.mp4");
    expect(
      getRelativePathUrl("/someCommonDir/someDir/someOtherDir/a.mp4", "/b.mp4"),
    ).toEqual("../../../b.mp4");
    expect(
      getRelativePathUrl(
        "/someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "/../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "/../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
  });

  it("should return relative paths for two relative URLs one of them starting with '/'", () => {
    expect(getRelativePathUrl("a.mp4", "/b.mp4")).toEqual("b.mp4");
    expect(getRelativePathUrl("/someDir/a.mp4", "someDir/b.mp4")).toEqual("b.mp4");
    expect(getRelativePathUrl("someDir/a.mp4", "/b.mp4")).toEqual("../b.mp4");
    expect(getRelativePathUrl("/a.mp4", "someDir/b.mp4")).toEqual("someDir/b.mp4");
    expect(
      getRelativePathUrl(
        "someCommonDir/someDir/different/a.mp4",
        "/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/someCommonDir/someDir/someOtherDir/a.mp4",
        "someCommonDir/someDir/different/b.mp4",
      ),
    ).toEqual("../different/b.mp4");
    expect(
      getRelativePathUrl("someCommonDir/someDir/someOtherDir/a.mp4", "/b.mp4"),
    ).toEqual("../../../b.mp4");
    expect(
      getRelativePathUrl(
        "someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "../someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "/../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "/someCommonDir/../someCommonDir/someDir/different/a.mp4",
        "../someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
  });

  it("should return `null` for different domains", () => {
    expect(
      getRelativePathUrl(
        "https://www.example.fr/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual(null);
    expect(
      getRelativePathUrl(
        "https://www.example.com/someDir/a.mp4",
        "https://example.com/someDir/b.mp4",
      ),
    ).toEqual(null);
    expect(
      getRelativePathUrl(
        "https://www.exmple.com/someDir/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual(null);
  });

  it("should return `null` for different schemes", () => {
    expect(
      getRelativePathUrl(
        "http://www.example.fr/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual(null);
    expect(
      getRelativePathUrl(
        "https://www.example.com/someDir/a.mp4",
        "http://example.com/someDir/b.mp4",
      ),
    ).toEqual(null);
    expect(
      getRelativePathUrl(
        "http://www.exmple.com/someDir/a.mp4",
        "https://www.example.com/b.mp4",
      ),
    ).toEqual(null);
  });

  it("should remove a query string", () => {
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4?foo=bar&bar=foo",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4?foo=bar&bar=foo&other",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4?foo=bar&bar=foo",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4?foo=bar&bar=foo&other",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
  });

  it("should remove a fragment", () => {
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4#some-fragment",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4#some-fragment&other",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4#some-fragment",
      ),
    ).toEqual("../someOtherDir/b.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/different/a.mp4#some-fragment&other",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/b.mp4",
      ),
    ).toEqual("../someOtherDir/b.mp4");
  });

  it("should just return the same file when the same URL is given", () => {
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/someOtherDir/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/a.mp4",
      ),
    ).toEqual("a.mp4");
    expect(
      getRelativePathUrl(
        "https://www.example.com/someCommonDir/someDir/someOtherDir/a.mp4",
        "https://www.example.com/someCommonDir/someDir/someOtherDir/a.mp4#some-fragment",
      ),
    ).toEqual("a.mp4");
  });
});

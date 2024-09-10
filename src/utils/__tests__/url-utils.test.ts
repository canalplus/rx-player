import { describe, it, expect } from "vitest";
import { getFilenameIndexInUrl, getRelativeUrl, resolveURL } from "../url-utils";

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

describe("utils - getRelativeUrl", () => {
  it("should succeed on two absolute URLs on the same domain", () => {
    expect(
      getRelativeUrl("https://foo.com/foo/bar/cil/", "https://foo.com/foo/bar/cil/diub"),
    ).toEqual("diub");
    expect(
      getRelativeUrl(
        "https://foo.com/foo/bar/cil/",
        "https://foo.com/foo/bar/cil/diub/emp",
      ),
    ).toEqual("diub/emp");
    expect(
      getRelativeUrl(
        "https://foo.com/foo/bar/cil/diub/emp/",
        "https://foo.com/foo/bar/cil/f/g/h/i",
      ),
    ).toEqual("../../f/g/h/i");

    expect(
      getRelativeUrl(
        "https://foo.com/foo/bar/cil/emp",
        "https://foo.com/foo/bar/cil/emp",
      ),
    ).toEqual("");
  });

  it("should handle it right when one of the input is just a domain name without a path", () => {
    expect(
      getRelativeUrl(
        "http://github.com" /** Without a starting slash */,
        "http://github.com/rx-player",
      ),
    ).toBe("/rx-player");
    expect(
      getRelativeUrl(
        "http://github.com/rx-player/",
        "http://github.com" /** Without a starting slash */,
      ),
    ).toBe("..");
  });

  it("should handle it right when one of the input has a path of length 0", () => {
    expect(getRelativeUrl("http://github.com/", "http://github.com/rx-player")).toBe(
      "rx-player",
    );
    expect(
      getRelativeUrl(
        "http://github.com/rx-player/",
        "http://github.com" /** Without a starting slash */,
      ),
    ).toBe("..");
  });

  it("should fail if scheme is different", () => {
    expect(
      getRelativeUrl("http://foo.com/foo/bar/cil/emp", "https://foo.com/foo/bar/cil/emp"),
    ).toEqual(null);

    expect(
      getRelativeUrl("https://foo.com/foo/bar/cil/emp", "http://foo.com/foo/bar/cil/emp"),
    ).toEqual(null);
  });

  it("should fail if domain is different", () => {
    expect(
      getRelativeUrl(
        "https://bar.com/foo/bar/cil/emp",
        "https://foo.com/foo/bar/cil/emp",
      ),
    ).toEqual(null);
  });

  it("should fail if one anounce a domain but not the other", () => {
    expect(getRelativeUrl("https://foo.com/foo/bar/cil/diub/emp", "/a")).toEqual(null);

    expect(getRelativeUrl("../url", "https://foo.com")).toEqual(null);
  });

  it('should output "." if the URL points to the same file', () => {
    expect(getRelativeUrl("../url", "../url")).toEqual("");
    expect(
      getRelativeUrl(
        "https://foo.com/foo/bar/cil/diub/emp",
        "https://foo.com/foo/bar/cil/diub/emp",
      ),
    ).toEqual("");
    expect(
      getRelativeUrl(
        "https://foo.com/foo/bar/cil/diub/emp",
        "https://foo.com/foo/bar/../bar/cil/diub/emp",
      ),
    ).toEqual("");
  });

  it("should succeed on two relative URLs", () => {
    expect(getRelativeUrl("../url/a", "../url/a/b")).toEqual("a/b");
    expect(getRelativeUrl("../url/a", "../url/b/c")).toEqual("b/c");
  });

  it("should fail if one seems to be relative to the domain's root, yet we don't know it", () => {
    expect(getRelativeUrl("/url/a", "../../../url/b/c")).toEqual(null);
    expect(getRelativeUrl("./url/a", "/url/b/c")).toEqual(null);
    expect(getRelativeUrl("http://foo.com/url/a", "../url/b/c")).toEqual(null);
  });

  it("should succeed if both seem to be relative to the domain's root, even if we don't know it", () => {
    expect(getRelativeUrl("/url/a", "/url/b/c")).toEqual("b/c");
  });

  const normalExamples = [
    { input: "http://a/b/c/g", output: "g" },
    { input: "http://a/b/c/g/", output: "g/" },
    { input: "http://a/g", output: "../../g" },
    { input: "http://a/b/c/d;p?y", output: "?y" },
    { input: "http://a/b/c/g?y", output: "g?y" },
    { input: "http://a/b/c/d;p?q#s", output: "#s" },
    { input: "http://a/b/c/g#s", output: "g#s" },
    { input: "http://a/b/c/g?y#s", output: "g?y#s" },
    { input: "http://a/b/c/;x", output: ";x" },
    { input: "http://a/b/c/g;x", output: "g;x" },
    { input: "http://a/b/c/g;x?y#s", output: "g;x?y#s" },
    { input: "http://a/b/c/d;p?q", output: "" },
    { input: "http://a/b/c/", output: "." },
    { input: "http://a/b/", output: ".." },
    { input: "http://a/b/g", output: "../g" },
    { input: "http://a/", output: "../.." },
    { input: "http://a/g", output: "../../g" },
  ];
  normalExamples.forEach((example) => {
    it("should conform to RFC 3986 normal examples - case: " + example.input, () => {
      const baseURL: string = "http://a/b/c/d;p?q";
      // https://datatracker.ietf.org/doc/html/rfc3986#section-5.4.1
      expect(getRelativeUrl(baseURL, example.input)).toBe(example.output);
    });
  });
});

import { describe, expect, it } from "vitest";
import resolveBaseURLs from "../../../../../../../src/parsers/manifest/dash/common/resolve_base_urls.ts";

describe("resolveBaseURLs", () => {
  it("resolves an empty BaseURL to its parent and preserves its serviceLocation", () => {
    expect(
      resolveBaseURLs(
        [{ url: "https://example.com/path/", serviceLocation: "parent-cdn" }],
        [{ value: "", attributes: { serviceLocation: "child-cdn" } }],
      ),
    ).toEqual([{ url: "https://example.com/path/", serviceLocation: "child-cdn" }]);
  });

  it("keeps the serviceLocation of newly encountered BaseURLs", () => {
    expect(
      resolveBaseURLs(
        [],
        [{ value: "https://cdn.example/", attributes: { serviceLocation: "cdn-a" } }],
      ),
    ).toEqual([{ url: "https://cdn.example/", serviceLocation: "cdn-a" }]);
  });

  it("inherits the parent serviceLocation when the child has none", () => {
    expect(
      resolveBaseURLs(
        [{ url: "https://example.com/path/", serviceLocation: "parent-cdn" }],
        [{ value: "video/", attributes: {} }],
      ),
    ).toEqual([
      { url: "https://example.com/path/video/", serviceLocation: "parent-cdn" },
    ]);
  });

  it("gives precedence to the child serviceLocation", () => {
    expect(
      resolveBaseURLs(
        [{ url: "https://example.com/path/", serviceLocation: "parent-cdn" }],
        [{ value: "video/", attributes: { serviceLocation: "child-cdn" } }],
      ),
    ).toEqual([{ url: "https://example.com/path/video/", serviceLocation: "child-cdn" }]);
  });
});

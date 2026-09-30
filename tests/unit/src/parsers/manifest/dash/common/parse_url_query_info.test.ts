import { describe, expect, it } from "vitest";
import {
  combineUrlQueryInfo,
  parseUrlQueryInfo,
} from "../../../../../../../src/parsers/manifest/dash/common/parse_url_query_info.ts";
import type {
  IDescriptorIntermediateRepresentation,
  IUrlQueryInfoIntermediateRepresentation,
} from "../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";

function createDescriptor(
  scheme: "2014" | "2016",
  attributes: IUrlQueryInfoIntermediateRepresentation["attributes"],
): IDescriptorIntermediateRepresentation {
  const queryInfo = { attributes };
  return {
    attributes: { schemeIdUri: `urn:mpeg:dash:urlparam:${scheme}` },
    children: {
      UrlQueryInfo: scheme === "2014" ? [queryInfo] : [],
      ExtUrlQueryInfo: scheme === "2016" ? [queryInfo] : [],
    },
  };
}

describe("DASH Annex I URL query information", () => {
  it("ignores unrelated descriptors", () => {
    const descriptor: IDescriptorIntermediateRepresentation = {
      attributes: { schemeIdUri: "urn:example" },
      children: { UrlQueryInfo: [], ExtUrlQueryInfo: [] },
    };
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd?a=1"),
    ).toBeUndefined();
  });

  it("uses MPD and explicit query strings as template sources", () => {
    const descriptor = createDescriptor("2014", {
      queryString: "b=2",
      queryTemplate: "$querypart$",
      useMpdUrlQuery: true,
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd?a=1#fragment"),
    ).toEqual({
      scheme: "2014",
      queryString: "a=1&b=2",
      sameOriginOnly: false,
      sourceUrl: "https://example.com/a.mpd?a=1#fragment",
      appliesTo: { segment: true, init: true },
    });
  });

  it("substitutes selected parameters, keeps the last value and escapes dollars", () => {
    const descriptor = createDescriptor("2016", {
      queryString: "token=first&token=last&unused=x",
      queryTemplate: "renamed=$query:token$&missing=$query:missing$&price=$$1",
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({
      queryString: "renamed=last&missing=&price=$1",
    });
  });

  it("preserves encoded source values during substitution", () => {
    const descriptor = createDescriptor("2016", {
      queryString: "token=a%26b%3Dc",
      queryTemplate: "token=$query:token$",
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({ queryString: "token=a%26b%3Dc" });
  });

  it("replaces unknown template identifiers with an empty string", () => {
    const descriptor = createDescriptor("2014", {
      queryString: "a=1",
      queryTemplate: "a=$unknown$",
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({ queryString: "a=" });
  });

  it("requires a query template", () => {
    const descriptor = createDescriptor("2014", { queryString: "a=1" });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toBeUndefined();
  });

  it("applies 2016 instructions to segment and wildcard request types", () => {
    const segment = createDescriptor("2016", {
      includeInRequests: "mpd segment",
      queryString: "a=1",
      queryTemplate: "$querypart$",
    });
    const wildcard = createDescriptor("2016", {
      includeInRequests: "*",
      queryString: "a=1",
      queryTemplate: "$querypart$",
    });
    expect(parseUrlQueryInfo([segment], [], "https://example.com/a.mpd")).toMatchObject({
      appliesTo: { segment: true, init: true },
    });
    expect(parseUrlQueryInfo([wildcard], [], "https://example.com/a.mpd")).toMatchObject({
      appliesTo: { segment: true, init: true },
    });
  });

  it("applies init-only 2016 instructions only to initialization segments", () => {
    const descriptor = createDescriptor("2016", {
      includeInRequests: "init",
      queryString: "a=1",
      queryTemplate: "$querypart$",
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({ appliesTo: { segment: false, init: true } });
  });

  it("defaults 2016 instructions to segment requests", () => {
    const descriptor = createDescriptor("2016", {
      queryString: "a=1",
      queryTemplate: "$querypart$",
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({ appliesTo: { segment: true, init: true } });
  });

  it("ignores 2016 instructions for other request types", () => {
    const descriptor = createDescriptor("2016", {
      includeInRequests: "mpd steering",
      queryString: "a=1",
      queryTemplate: "$querypart$",
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toBeUndefined();
  });

  it("prioritizes the first EssentialProperty over SupplementalProperty", () => {
    const firstEssential = createDescriptor("2014", {
      queryString: "essential=first",
      queryTemplate: "$querypart$",
    });
    const secondEssential = createDescriptor("2016", {
      queryString: "essential=second",
      queryTemplate: "$querypart$",
    });
    const supplemental = createDescriptor("2016", {
      queryString: "supplemental=true",
      queryTemplate: "$querypart$",
    });
    expect(
      parseUrlQueryInfo(
        [firstEssential, secondEssential],
        [supplemental],
        "https://example.com/a.mpd",
      ),
    ).toMatchObject({ scheme: "2014", queryString: "essential=first" });
  });

  it("uses the first SupplementalProperty when no EssentialProperty matches", () => {
    const first = createDescriptor("2016", {
      queryString: "first=true",
      queryTemplate: "$querypart$",
    });
    const second = createDescriptor("2014", {
      queryString: "second=true",
      queryTemplate: "$querypart$",
    });
    expect(
      parseUrlQueryInfo([], [first, second], "https://example.com/a.mpd"),
    ).toMatchObject({ scheme: "2016", queryString: "first=true" });
  });

  it("retains same-origin restrictions for the 2016 scheme", () => {
    const descriptor = createDescriptor("2016", {
      queryString: "token=1",
      queryTemplate: "$querypart$",
      sameOriginOnly: true,
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({ sameOriginOnly: true, sourceUrl: "https://example.com/a.mpd" });
  });

  it("does not apply the extended same-origin attribute to the 2014 scheme", () => {
    const descriptor = createDescriptor("2014", {
      queryString: "token=1",
      queryTemplate: "$querypart$",
      sameOriginOnly: true,
    });
    expect(
      parseUrlQueryInfo([descriptor], [], "https://example.com/a.mpd"),
    ).toMatchObject({ sameOriginOnly: false });
  });

  it("orders 2016 from parent to child and 2014 from child to parent", () => {
    expect(
      combineUrlQueryInfo([
        {
          scheme: "2014",
          queryString: "mpd-2014",
          sameOriginOnly: false,
          appliesTo: { segment: true, init: true },
        },
        {
          scheme: "2016",
          queryString: "period-2016",
          sameOriginOnly: false,
          appliesTo: { segment: true, init: true },
        },
        {
          scheme: "2014",
          queryString: "representation-2014",
          sameOriginOnly: false,
          appliesTo: { segment: true, init: true },
        },
        {
          scheme: "2016",
          queryString: "representation-2016",
          sameOriginOnly: false,
          appliesTo: { segment: true, init: true },
        },
      ]).map((info) => info.queryString),
    ).toEqual(["period-2016", "representation-2016", "representation-2014", "mpd-2014"]);
  });
});

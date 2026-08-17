import { describe, expect, it } from "vitest";
import { createMPDIntermediateRepresentation } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/MPD.ts";
import parseRequestParam from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/UrlQueryInfo.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

describe("DASH Node Parsers - RequestParam", () => {
  it("parses ExtendedUrlInfoType attributes", () => {
    const element = parseXml(
      `<RequestParam queryString="token=1" queryTemplate="token=$query:token$"
        includeInRequests="segment steering" useMPDUrlQuery="true"
        headerParamSource="mpd" sameOriginOnly="true" header="X-Token" />`,
    )[0] as ITNode;

    expect(parseRequestParam(element)).toEqual([
      {
        attributes: {
          queryString: "token=1",
          queryTemplate: "token=$query:token$",
          includeInRequests: "segment steering",
          useMpdUrlQuery: true,
          headerParamSource: "mpd",
          sameOriginOnly: true,
          header: "X-Token",
        },
      },
      [],
    ]);
  });

  it("forwards boolean parsing warnings", () => {
    const element = parseXml(
      '<RequestParam useMPDUrlQuery="invalid" sameOriginOnly="invalid" />',
    )[0] as ITNode;

    const [, warnings] = parseRequestParam(element);
    expect(warnings).toHaveLength(2);
  });

  it("parses direct elements throughout the represented MPD hierarchy", () => {
    const element = parseXml(
      `<MPD>
        <RequestParam queryString="mpd=1" />
        <Period>
          <RequestParam queryString="period=1" />
          <EventStream>
            <RequestParam queryString="event=1" />
          </EventStream>
          <AdaptationSet>
            <RequestParam queryString="adaptation=1" />
            <Representation bandwidth="1000">
              <RequestParam queryString="representation=1" />
            </Representation>
          </AdaptationSet>
        </Period>
      </MPD>`,
    )[0] as ITNode;

    const [mpd, warnings] = createMPDIntermediateRepresentation(element, "");
    const period = mpd.children.Period[0];
    const adaptation = period.children.AdaptationSet[0];
    const representation = adaptation.children.Representation[0];
    expect(mpd.children.RequestParam[0].attributes.queryString).toBe("mpd=1");
    expect(period.children.RequestParam[0].attributes.queryString).toBe("period=1");
    expect(period.children.EventStream[0].children.RequestParam[0].attributes.queryString)
      .toBe("event=1");
    expect(adaptation.children.RequestParam[0].attributes.queryString).toBe(
      "adaptation=1",
    );
    expect(representation.children.RequestParam[0].attributes.queryString).toBe(
      "representation=1",
    );
    expect(warnings).toEqual([]);
  });
});

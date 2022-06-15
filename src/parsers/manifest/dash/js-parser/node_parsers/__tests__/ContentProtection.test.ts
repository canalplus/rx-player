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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable max-len */

function testStringAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  it(`should correctly parse a ContentProtection element with a correct ${attributeName} attribute`, () => {
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element1 = new DOMParser()
      .parseFromString(`<ContentProtection ${attributeName}="foobar" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element1))
      .toEqual([ { attributes: { [_variableName]: "foobar" },
                   children: { cencPssh: [] } },
                 [] ]);

    const element2 = new DOMParser()
      .parseFromString(`<ContentProtection ${attributeName}=\"\" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element2))
      .toEqual([ { attributes: { [_variableName]: "" },
                   children: { cencPssh: [] } },
                 [] ]);
  });
}

describe("DASH Node Parsers - ContentProtection", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should correctly parse a ContentProtection element without attributes", () => {
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element = new DOMParser().parseFromString("<ContentProtection />", "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element))
      .toEqual([ { attributes: {},
                   children: { cencPssh: [] } },
                 [] ]);
  });

  testStringAttribute("schemeIdUri");
  testStringAttribute("value");

  it("should correctly parse a ContentProtection element with a correct cenc:default_KID attribute", () => {

    const keyId = new Uint8Array([0, 1, 2, 3]);
    const mockHexToBytes = jest.fn().mockImplementation(() => {
      return keyId;
    });
    jest.mock("../../../../../../utils/string_parsing", () => ({
      hexToBytes: mockHexToBytes,
    }));
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element1 = new DOMParser()
      .parseFromString(`<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xmlns:mspr="urn:microsoft:playready"
  xmlns:scte35="urn:scte:scte35:2014:xml+bin">
  <ContentProtection cenc:default_KID=\"dead-beef\" />
</MPD>
`, "text/xml")
      .getElementsByTagName("ContentProtection")[0];

    expect(parseContentProtection(element1))
      .toEqual([ { attributes: { keyId },
                   children: { cencPssh: [] } },
                 [] ]);
    expect(mockHexToBytes).toHaveBeenCalledTimes(1);
    expect(mockHexToBytes).toHaveBeenCalledWith("deadbeef");
  });

  it("should correctly parse a ContentProtection with every attributes", () => {
    const keyId = new Uint8Array([0, 1, 2, 3]);
    const mockHexToBytes = jest.fn().mockImplementation(() => {
      return keyId;
    });
    jest.mock("../../../../../../utils/string_parsing", () => ({
      hexToBytes: mockHexToBytes,
    }));
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element = new DOMParser()
      .parseFromString(`<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xmlns:mspr="urn:microsoft:playready"
  xmlns:scte35="urn:scte:scte35:2014:xml+bin">
  <ContentProtection
    schemeIdUri="foo"
    value="bar"
    cenc:default_KID="dead-beef"
  />
</MPD>
`, "text/xml")
      .getElementsByTagName("ContentProtection")[0];
    expect(parseContentProtection(element))
      .toEqual([ { attributes: { keyId,
                                 schemeIdUri: "foo",
                                 value: "bar" },
                   children: { cencPssh: [] } },
                 [] ]);
  });

  it("should correctly parse a ContentProtection with cenc:pssh children", () => {
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element = new DOMParser()
      .parseFromString(`<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xmlns:mspr="urn:microsoft:playready"
  xmlns:scte35="urn:scte:scte35:2014:xml+bin">
  <ContentProtection>
    <cenc:pssh>AABBCC</cenc:pssh>
    <cenc:pssh>AAABAC</cenc:pssh>
  </ContentProtection>
</MPD>
`, "text/xml")
      .getElementsByTagName("ContentProtection")[0];
    expect(parseContentProtection(element))
      .toEqual([ { attributes: {},
                   children: { cencPssh: [ new Uint8Array([0, 0, 65, 8]),
                                           new Uint8Array([0, 0, 1, 0]) ] } },
                 [] ]);
  });

  it("should correctly parse a ContentProtection with both cenc:pssh children and every attributes", () => {
    const keyId = new Uint8Array([0, 1, 2, 3]);
    const mockHexToBytes = jest.fn().mockImplementation(() => {
      return keyId;
    });
    jest.mock("../../../../../../utils/string_parsing", () => ({
      hexToBytes: mockHexToBytes,
    }));
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element = new DOMParser()
      .parseFromString(`<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xmlns:mspr="urn:microsoft:playready"
  xmlns:scte35="urn:scte:scte35:2014:xml+bin">
  <ContentProtection
    schemeIdUri="foo"
    value="bar"
    cenc:default_KID="dead-beef"
  >
    <cenc:pssh>AABBCC</cenc:pssh>
    <cenc:pssh>AAABAC</cenc:pssh>
  </ContentProtection>
</MPD>
`, "text/xml")
      .getElementsByTagName("ContentProtection")[0];
    expect(parseContentProtection(element))
      .toEqual([ { attributes: { keyId,
                                 schemeIdUri: "foo",
                                 value: "bar" },
                   children: { cencPssh: [ new Uint8Array([0, 0, 65, 8]),
                                           new Uint8Array([0, 0, 1, 0]) ] } },
                 [] ]);
  });

  it("should return a warning if one of the cenc:pssh is invalid base64", () => {
    const parseContentProtection = jest.requireActual("../ContentProtection").default;
    const element = new DOMParser()
      .parseFromString(`<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xmlns:mspr="urn:microsoft:playready"
  xmlns:scte35="urn:scte:scte35:2014:xml+bin">
  <ContentProtection>
    <cenc:pssh>AA!BCC</cenc:pssh>
    <cenc:pssh>AAABAC</cenc:pssh>
  </ContentProtection>
</MPD>
`, "text/xml")
      .getElementsByTagName("ContentProtection")[0];
    const parsed = parseContentProtection(element);
    expect(parsed[0])
      .toEqual({ attributes: {},
                 children: { cencPssh: [ new Uint8Array([0, 0, 1, 0]) ] } });
    expect(parsed[1]).not.toBe(null);
    expect(parsed[1]).toHaveLength(1);
    expect(parsed[1][0]).toBeInstanceOf(Error);
    expect(parsed[1][0].message)
      .toEqual("`cenc:pssh` is not a valid base64 string: \"AA!BCC\"");
  });
});

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

import parseContentProtection from "../ContentProtection";

function testStringAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* tslint:disable max-line-length */
  it(`should correctly parse a ContentProtection element with a correct ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const element1 = new DOMParser()
      .parseFromString(`<ContentProtection ${attributeName}="foobar" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element1))
      .toEqual({ [_variableName]: "foobar" });

    const element2 = new DOMParser()
      .parseFromString(`<ContentProtection ${attributeName}=\"\" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element2))
      .toEqual({ [_variableName]: "" });
  });
}

describe("DASH Node Parsers - ContentProtection", () => {
  it("should correctly parse a ContentProtection element without attributes", () => {
    const element = new DOMParser().parseFromString("<ContentProtection />", "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element)).toEqual({});
  });

  testStringAttribute("schemeIdUri");
  testStringAttribute("value");

  it("should correctly parse a ContentProtection with every attributes", () => {
    const element = new DOMParser()
      .parseFromString(`<ContentProtection
        schemeIdUri="foo"
        value="bar"
        />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentProtection(element))
      .toEqual({
        schemeIdUri: "foo",
        value: "bar",
      });
  });
});

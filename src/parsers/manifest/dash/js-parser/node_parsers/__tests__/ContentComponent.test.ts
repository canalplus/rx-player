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

import parseContentComponent from "../ContentComponent";

function testStringAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* eslint-disable max-len */
  it(`should correctly parse a contentComponent element with a correct ${attributeName} attribute`, () => {
  /* eslint-enable max-len */
    const element1 = new DOMParser()
      .parseFromString(`<contentComponent ${attributeName}="foobar" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentComponent(element1))
      .toEqual({ [_variableName]: "foobar" });

    const element2 = new DOMParser()
      .parseFromString(`<contentComponent ${attributeName}=\"\" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentComponent(element2))
      .toEqual({ [_variableName]: "" });
  });
}

describe("DASH Node Parsers - ContentComponent", () => {
  it("should correctly parse a ContentComponent element without attributes", () => {
    const element = new DOMParser().parseFromString("<Content />", "text/xml")
      .childNodes[0] as Element;
    expect(parseContentComponent(element)).toEqual({});
  });
  testStringAttribute("id");
  testStringAttribute("lang", "language");
  testStringAttribute("contentType");
  testStringAttribute("par");

  it("should correctly parse a contentComponent with every attributes", () => {
    const element = new DOMParser()
      .parseFromString(`<contentComponent
        id ="foo"
        lang="bar"
        contentType="audio/mp5"
        par="3/4"
        />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseContentComponent(element))
      .toEqual({
        id: "foo",
        language: "bar",
        contentType: "audio/mp5",
        par: "3/4",
      });
  });
});

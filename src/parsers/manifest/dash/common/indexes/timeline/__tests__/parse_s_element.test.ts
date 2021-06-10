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

import log from "../../../../../../../log";
import parseS from "../parse_s_element";

function testNumberAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* eslint-disable max-len */
  it(`should correctly parse an S element with a correct ${attributeName} attribute`, () => {
  /* eslint-enable max-len */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<S ${attributeName}="012" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element1))
      .toEqual({ [_variableName]: 12 });

    const element2 = new DOMParser()
      .parseFromString(`<S ${attributeName}="0" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element2))
      .toEqual({ [_variableName]: 0 });

    const element3 = new DOMParser()
      .parseFromString(`<S ${attributeName}="-50" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element3))
      .toEqual({ [_variableName]: -50 });

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  /* eslint-disable max-len */
  it(`should correctly parse an S element with an incorrect ${attributeName} attribute`, () => {
  /* eslint-enable max-len */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<S ${attributeName}="toto" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element1))
      .toEqual({});
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("toto")`);

    const element2 = new DOMParser()
      .parseFromString(`<S ${attributeName}="PT5M" />`, "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element2))
      .toEqual({});
    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("PT5M")`);

    const element3 = new DOMParser()
      .parseFromString(`<S ${attributeName}="" />`, "text/xml")
      .childNodes[0] as Element;

    expect(parseS(element3))
      .toEqual({});
    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("")`);
    spyLog.mockRestore();
  });
}

describe("DASH Node Parsers - S", () => {
  it("should correctly parse an S element without attributes", () => {
    const element = new DOMParser().parseFromString("<S />", "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element)).toEqual({});
  });

  testNumberAttribute("t", "start");
  testNumberAttribute("r", "repeatCount");
  testNumberAttribute("d", "duration");

  it("should correctly parse an S element with every attributes", () => {
    const element1 = new DOMParser()
      .parseFromString("<S t=\"0\" d=\"4\" r=\"12\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element1)).toEqual({ start: 0, repeatCount: 12, duration: 4 });

    const element2 = new DOMParser()
      .parseFromString("<S t=\"99\" d=\"4\" r=\"0\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element2)).toEqual({ start: 99, repeatCount: 0, duration: 4 });
  });

  it("should correctly parse an S element with unknown attributes", () => {
    const element1 = new DOMParser()
      .parseFromString("<S t=\"0\" d=\"4\" r=\"12\" f=\"9\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element1)).toEqual({ start: 0, repeatCount: 12, duration: 4 });

    const element2 = new DOMParser()
      .parseFromString("<S b=\"7000\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseS(element2)).toEqual({});
  });
});

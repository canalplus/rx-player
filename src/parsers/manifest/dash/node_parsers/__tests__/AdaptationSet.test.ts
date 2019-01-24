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

import log from "../../../../../log";
import {
  createAdaptationSetIntermediateRepresentation,
} from "../AdaptationSet";

function testBooleanAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="true" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: { [_variableName]: true },
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}=\"false\" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: { [_variableName]: false },
        children: { baseURL: "", representations: [] },
      });

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="foobar" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: { [_variableName]: false },
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: { [_variableName]: false },
        children: { baseURL: "", representations: [] },
      });

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });
}

function testStringAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="foobar" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: { [_variableName]: "foobar" },
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}=\"\" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: { [_variableName]: "" },
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });
}

function testNumberAttribute(attributeName : string, variableName? : string) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="012" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: { [_variableName]: 12 },
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="0" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: { [_variableName]: 0 },
        children: { baseURL: "", representations: [] },
      });
    const element3 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="-50" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element3))
      .toEqual({
        attributes: { [_variableName]: -50 },
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="toto" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("toto")`);

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="PT5M" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("PT5M")`);

    const element3 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="" />`, "text/xml")
      .childNodes[0] as Element;

    expect(createAdaptationSetIntermediateRepresentation(element3))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("")`);
    spyLog.mockRestore();
  });
}

function testNumberOrBooleanAttribute(
  attributeName : string,
  variableName? : string
) : void {
  const _variableName = variableName == null ? attributeName : variableName;

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="012" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: { [_variableName]: 12 },
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="0" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: { [_variableName]: 0 },
        children: { baseURL: "", representations: [] },
      });
    const element3 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="-50" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element3))
      .toEqual({
        attributes: { [_variableName]: -50 },
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="toto" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("toto")`);

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="PT5M" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("PT5M")`);

    const element3 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="" />`, "text/xml")
      .childNodes[0] as Element;

    expect(createAdaptationSetIntermediateRepresentation(element3))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("")`);
    spyLog.mockRestore();
  });

  /* tslint:disable max-line-length */
  it(`should correctly parse an AdaptationSet element with a boolean ${attributeName} attribute`, () => {
  /* tslint:enable max-line-length */
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}="true" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: { [_variableName]: true },
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(`<AdaptationSet ${attributeName}=\"false\" />`, "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: { [_variableName]: false },
        children: { baseURL: "", representations: [] },
      });

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });
}

describe("DASH Node Parsers - AdaptationSet", () => {
  /* tslint:disable max-line-length */
  it("should correctly parse an AdaptationSet element without attributes nor children", () => {
  /* tslint:enable max-line-length */
    const element = new DOMParser()
      .parseFromString("<AdaptationSet />", "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
  });
  testStringAttribute("audioSamplingRate");
  testBooleanAttribute("bitstreamSwitching");
  testStringAttribute("codecs");
  testBooleanAttribute("codingDependency");
  testStringAttribute("contentType");
  testStringAttribute("frameRate");
  testNumberAttribute("group");
  testNumberAttribute("height");
  testStringAttribute("id");
  testStringAttribute("lang", "language");
  testNumberAttribute("maxBandwidth", "maxBitrate");
  testStringAttribute("maxFrameRate");
  testNumberAttribute("maxHeight");
  testNumberAttribute("maxPlayoutRate");
  testNumberAttribute("maxWidth");
  testNumberAttribute("maximumSAPPeriod");
  testStringAttribute("mimeType");
  testNumberAttribute("minBandwidth", "minBitrate");
  testStringAttribute("minFrameRate");
  testNumberAttribute("minHeight");
  testNumberAttribute("minWidth");
  testStringAttribute("par");
  testStringAttribute("profiles");
  testNumberOrBooleanAttribute("segmentAlignment");
  testStringAttribute("segmentProfiles");
  testNumberOrBooleanAttribute("subsegmentAlignment");
  testNumberAttribute("width");

  it("should correctly parse an empty BaseURL", () => {
    const element1 = new DOMParser()
      .parseFromString("<AdaptationSet><BaseURL /></AdaptationSet>", "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString("<AdaptationSet><BaseURL></ BaseURL</AdaptationSet>", "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: {},
        children: { baseURL: "", representations: [] },
      });
  });

  it("should correctly parse a non-empty BaseURL", () => {
    const element1 = new DOMParser()
      .parseFromString("<AdaptationSet><BaseURL>a</BaseURL></AdaptationSet>", "text/xml")
      .childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element1))
      .toEqual({
        attributes: {},
        children: { baseURL: "a", representations: [] },
      });

    const element2 = new DOMParser()
      .parseFromString(
        "<AdaptationSet><BaseURL>foo bar</ BaseURL></AdaptationSet>",
        "text/xml"
      ).childNodes[0] as Element;
    expect(createAdaptationSetIntermediateRepresentation(element2))
      .toEqual({
        attributes: {},
        children: { baseURL: "foo bar", representations: [] },
      });
  });
});

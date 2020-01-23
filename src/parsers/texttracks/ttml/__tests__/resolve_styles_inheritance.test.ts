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

import log from "../../../../log";
import resolveStylesInheritance from "../resolve_styles_inheritance";

/* tslint:disable no-unsafe-any */
jest.mock("../../../../log");
const logWarnMock = log.warn as jest.Mock<ReturnType<typeof log.warn>>;

describe("resolve_styles_inheritance", () => {
  afterEach(() => {
    logWarnMock.mockReset();
  });

  it("should not update styles without any inheritance", () => {
    logWarnMock.mockReturnValue(undefined);
    const initialStyle = [
      { id: "1", style: { titi: "toto", tata: "tutu"}, extendsStyles: [] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: [] },
    ];
    resolveStylesInheritance(initialStyle);
    expect(initialStyle).toEqual([
      { id: "1", style: { titi: "toto", tata: "tutu"}, extendsStyles: [] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: [] },
    ]);
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should resolve simple inheritance", () => {
    logWarnMock.mockReturnValue(undefined);
    const initialStyle1 = [
      { id: "1", style: { titi: "toto", tata: "tutu"}, extendsStyles: ["2"] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: [] },
    ];
    resolveStylesInheritance(initialStyle1);
    expect(initialStyle1).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tutu",
                 toti: "toti",
                 tati: "totu" },
        extendsStyles: [] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: [] },
    ]);
    const initialStyle2 = [
      { id: "1", style: { titi: "toto", tata: "tutu"}, extendsStyles: [] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: ["1"] },
    ];
    resolveStylesInheritance(initialStyle2);
    expect(initialStyle2).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tutu" },
        extendsStyles: [] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3",
        style: { titu: "totu",
                 tatu: "tatu",
                 titi: "toto",
                 tata: "tutu" },
        extendsStyles: [] },
    ]);
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should be able to inherit multiple styles at once", () => {
    logWarnMock.mockReturnValue(undefined);
    const initialStyle = [
      { id: "1", style: { titi: "toto", tata: "tutu"}, extendsStyles: ["2", "3"] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: [] },
    ];
    resolveStylesInheritance(initialStyle);
    expect(initialStyle).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tutu",
                 toti: "toti",
                 tati: "totu",
                 titu: "totu",
                 tatu: "tatu" },
        extendsStyles: [] },
      { id: "2", style: { toti: "toti", tati: "totu"}, extendsStyles: [] },
      { id: "3", style: { titu: "totu", tatu: "tatu"}, extendsStyles: [] },
    ]);
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should correctly overwrite inherited properties", () => {
    logWarnMock.mockReturnValue(undefined);
    const initialStyle = [
      { id: "1", style: { titi: "toto", tata: "tuto"}, extendsStyles: ["2", "3"] },
      { id: "2", style: { titi: "tito", tata: "titu"}, extendsStyles: [] },
      { id: "3", style: { teti: "teto", tata: "tutu"}, extendsStyles: [] },
    ];
    resolveStylesInheritance(initialStyle);
    expect(initialStyle).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tuto",
                 teti: "teto" },
        extendsStyles: [] },
      { id: "2", style: { titi: "tito", tata: "titu"}, extendsStyles: [] },
      { id: "3", style: { teti: "teto", tata: "tutu"}, extendsStyles: [] },
    ]);
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should correctly handle multiple levels of inheritance", () => {
    logWarnMock.mockReturnValue(undefined);
    const initialStyle = [
      { id: "1", style: { titi: "toto", tata: "tuto"}, extendsStyles: ["2", "3"] },
      { id: "2", style: { titi: "tito", tata: "titu"}, extendsStyles: ["4"] },
      { id: "3", style: { teti: "teto", tata: "tutu"}, extendsStyles: [] },
      { id: "4", style: { four: "4", four2: "four2"}, extendsStyles: [] },
    ];
    resolveStylesInheritance(initialStyle);
    expect(initialStyle).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tuto",
                 teti: "teto",
                 four: "4",
                 four2: "four2" },
        extendsStyles: [] },
      { id: "2",
        style: { titi: "tito",
                 tata: "titu",
                 four: "4",
                 four2: "four2" },
        extendsStyles: [] },
      { id: "3", style: { teti: "teto", tata: "tutu"}, extendsStyles: [] },
      { id: "4", style: { four: "4", four2: "four2"}, extendsStyles: [] },
    ]);
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should avoid infinite inheritance loops", () => {
    logWarnMock.mockReturnValue(undefined);

    // 1. simple case
    const initialStyle1 = [
      { id: "1", style: { titi: "toto", tata: "tuto"}, extendsStyles: ["3"] },
      { id: "2", style: { titi: "tito", teta: "tutu"}, extendsStyles: [] },
      { id: "3", style: { tata: "toto", tota: "tutu"}, extendsStyles: ["1"] },
    ];
    resolveStylesInheritance(initialStyle1);
    expect(initialStyle1).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tuto",
                 tota: "tutu" },
        extendsStyles: [] },
      { id: "2",
        style: { titi: "tito",
                 teta: "tutu" },
        extendsStyles: [] },
      { id: "3",
        style: { tata: "toto",
                 tota: "tutu",
                 titi: "toto" }, extendsStyles: [] },
    ]);

    expect(logWarnMock)
      .toHaveBeenNthCalledWith(1, "TTML Parser: infinite style inheritance loop avoided");
    expect(logWarnMock).toHaveBeenCalledTimes(1);
    logWarnMock.mockReset();

    // 2. More complex case
    const initialStyle2 = [
      { id: "1", style: { titi: "toto", tata: "tuto"}, extendsStyles: ["2", "3"] },
      { id: "2", style: { titi: "tito", teta: "tutu"}, extendsStyles: ["3"] },
      { id: "3", style: { tata: "toto", tota: "tutu"}, extendsStyles: ["2"] },
    ];
    resolveStylesInheritance(initialStyle2);
    expect(initialStyle2).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tuto",
                 teta: "tutu",
                 tota: "tutu" },
        extendsStyles: [] },
      { id: "2",
        style: { titi: "tito",
                 teta: "tutu",
                 tata: "toto",
                 tota: "tutu" },
        extendsStyles: [] },
      { id: "3",
        style: { tata: "toto",
                 tota: "tutu",
                 titi: "tito",
                 teta: "tutu" }, extendsStyles: [] },
    ]);
    expect(logWarnMock)
      .toHaveBeenNthCalledWith(1, "TTML Parser: infinite style inheritance loop avoided");
    expect(logWarnMock)
      .toHaveBeenNthCalledWith(2, "TTML Parser: infinite style inheritance loop avoided");
    expect(logWarnMock).toHaveBeenCalledTimes(2);
  });

  it("should ignore unknown IDs", () => {
    logWarnMock.mockReturnValue(undefined);
    const initialStyle = [
      { id: "1", style: { titi: "toto", tata: "tuto"}, extendsStyles: ["3", "6", "2"] },
      { id: "2", style: { titi: "tito", teta: "tutu"}, extendsStyles: [] },
      { id: "3", style: { tata: "toto", tota: "tutu"}, extendsStyles: [] },
    ];
    resolveStylesInheritance(initialStyle);
    expect(initialStyle).toEqual([
      { id: "1",
        style: { titi: "toto",
                 tata: "tuto",
                 teta: "tutu",
                 tota: "tutu" },
        extendsStyles: [] },
      { id: "2",
        style: { titi: "tito",
                 teta: "tutu"},
        extendsStyles: [] },
      { id: "3",
        style: { tata: "toto",
                 tota: "tutu"},
        extendsStyles: [] },
    ]);
    expect(logWarnMock)
      .toHaveBeenNthCalledWith(1, "TTML Parser: unknown style inheritance: 6");
    expect(logWarnMock).toHaveBeenCalledTimes(1);
  });
});

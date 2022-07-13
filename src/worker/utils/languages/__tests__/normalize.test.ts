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

import normalizeLanguage, {
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../normalize";

describe("utils - normalizeLanguage", () => {
  it("should translate an empty string to an empty string", () => {
    expect(normalizeLanguage("")).toBe("");
  });

  it("should translate ISO639-1 to ISO639-3", () => {
    expect(normalizeLanguage("fr")).toBe("fra");
    expect(normalizeLanguage("hy")).toBe("hye");
    expect(normalizeLanguage("de")).toBe("deu");
    expect(normalizeLanguage("ff")).toBe("ful");
  });

  it("should translate ISO639-2 to ISO639-3", () => {
    expect(normalizeLanguage("fre")).toBe("fra");
    expect(normalizeLanguage("alb")).toBe("sqi");
    expect(normalizeLanguage("ger")).toBe("deu");
  });

  it("should translate IETF language tags to ISO639-3", () => {
    expect(normalizeLanguage("fr-FR")).toBe("fra");
    expect(normalizeLanguage("en-US")).toBe("eng");
    expect(normalizeLanguage("pt-BR")).toBe("por");
  });

  it("should not translate languages it doesn't know", () => {
    expect(normalizeLanguage("ggg")).toBe("ggg");
  });
});

describe("utils - normalizeAudioTrack", () => {
  it("should return null if language is `null`", () => {
    expect(normalizeAudioTrack(null)).toBe(null);
  });

  it("should return undefined if language is `undefined`", () => {
    expect(normalizeAudioTrack(undefined)).toBe(undefined);
  });

  it("should format a normalized audio track for an empty string", () => {
    expect(normalizeAudioTrack("")).toEqual({ language: "",
                                              audioDescription: false,
                                              normalized: "" });
  });

  it("should format a normalized audio track for a given language", () => {
    expect(normalizeAudioTrack("fre")).toEqual({ language: "fre",
                                                 audioDescription: false,
                                                 normalized: "fra" });
    expect(normalizeAudioTrack("en")).toEqual({ language: "en",
                                                audioDescription: false,
                                                normalized: "eng" });
    expect(normalizeAudioTrack("pt-BR")).toEqual({ language: "pt-BR",
                                                   audioDescription: false,
                                                   normalized: "por" });
  });

  it("should accept an object indicating the language", () => {
    expect(normalizeAudioTrack({ language: "fre" })).toEqual({
      language: "fre",
      audioDescription: false,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({ language: "en" })).toEqual({
      language: "en",
      audioDescription: false,
      normalized: "eng",
    });
    expect(normalizeAudioTrack({ language: "pt-BR" })).toEqual({
      language: "pt-BR",
      audioDescription: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is not an audio description", () => {
    expect(normalizeAudioTrack({
      language: "fre",
      audioDescription: false,
    })).toEqual({
      language: "fre",
      audioDescription: false,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({
      language: "en",
      audioDescription: false,
    })).toEqual({
      language: "en",
      audioDescription: false,
      normalized: "eng",
    });
    expect(normalizeAudioTrack({
      language: "pt-BR",
      audioDescription: false,
    })).toEqual({
      language: "pt-BR",
      audioDescription: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is an audio description", () => {
    expect(normalizeAudioTrack({
      language: "fre",
      audioDescription: true,
    })).toEqual({
      language: "fre",
      audioDescription: true,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({
      language: "en",
      audioDescription: true,
    })).toEqual({
      language: "en",
      audioDescription: true,
      normalized: "eng",
    });
    expect(normalizeAudioTrack({
      language: "pt-BR",
      audioDescription: true,
    })).toEqual({
      language: "pt-BR",
      audioDescription: true,
      normalized: "por",
    });
  });

  it("should be able to specify that is is a dub", () => {
    expect(normalizeAudioTrack({
      language: "fre",
      audioDescription: true,
      isDub: true,
    })).toEqual({
      language: "fre",
      isDub: true,
      audioDescription: true,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({
      language: "en",
      audioDescription: false,
      isDub: true,
    })).toEqual({
      language: "en",
      audioDescription: false,
      normalized: "eng",
      isDub: true,
    });
    expect(normalizeAudioTrack({
      language: "pt-BR",
      audioDescription: true,
      isDub: true,
    })).toEqual({
      language: "pt-BR",
      audioDescription: true,
      normalized: "por",
      isDub: true,
    });
  });
});

describe("utils - normalizeTextTrack", () => {
  it("should return null if language is `null`", () => {
    expect(normalizeTextTrack(null)).toBe(null);
  });

  it("should return undefined if language is `undefined`", () => {
    expect(normalizeTextTrack(undefined)).toBe(undefined);
  });

  it("should format a normalized audio track for an empty string", () => {
    expect(normalizeTextTrack("")).toEqual({
      language: "",
      closedCaption: false,
      normalized: "",
    });
  });

  it("should format a normalized audio track for a given language", () => {
    expect(normalizeTextTrack("fre")).toEqual({
      language: "fre",
      closedCaption: false,
      normalized: "fra",
    });
    expect(normalizeTextTrack("en")).toEqual({
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
    expect(normalizeTextTrack("pt-BR")).toEqual({
      language: "pt-BR",
      closedCaption: false,
      normalized: "por",
    });
  });

  it("should accept an object indicating the language", () => {
    expect(normalizeTextTrack({ language: "fre" })).toEqual({
      language: "fre",
      closedCaption: false,
      normalized: "fra",
    });
    expect(normalizeTextTrack({ language: "en" })).toEqual({
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
    expect(normalizeTextTrack({ language: "pt-BR" })).toEqual({
      language: "pt-BR",
      closedCaption: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is not a closed caption", () => {
    expect(normalizeTextTrack({
      language: "fre",
      closedCaption: false,
    })).toEqual({
      language: "fre",
      closedCaption: false,
      normalized: "fra",
    });
    expect(normalizeTextTrack({
      language: "en",
      closedCaption: false,
    })).toEqual({
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
    expect(normalizeTextTrack({
      language: "pt-BR",
      closedCaption: false,
    })).toEqual({
      language: "pt-BR",
      closedCaption: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is a closed caption", () => {
    expect(normalizeTextTrack({
      language: "fre",
      closedCaption: true,
    })).toEqual({
      language: "fre",
      closedCaption: true,
      normalized: "fra",
    });
    expect(normalizeTextTrack({
      language: "en",
      closedCaption: true,
    })).toEqual({
      language: "en",
      closedCaption: true,
      normalized: "eng",
    });
    expect(normalizeTextTrack({
      language: "pt-BR",
      closedCaption: true,
    })).toEqual({
      language: "pt-BR",
      closedCaption: true,
      normalized: "por",
    });
  });
});

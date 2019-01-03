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

import { expect } from "chai";
import normalizeLanguage, {
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../normalize";

describe("utils - normalizeLanguage", () => {
  it("should translate an empty string to an empty string", () => {
    expect(normalizeLanguage("")).to.equal("");
  });

  it("should translate ISO639-1 to ISO639-3", () => {
    expect(normalizeLanguage("fr")).to.equal("fra");
    expect(normalizeLanguage("hy")).to.equal("hye");
    expect(normalizeLanguage("de")).to.equal("deu");
    expect(normalizeLanguage("ff")).to.equal("ful");
  });

  it("should translate ISO639-2 to ISO639-3", () => {
    expect(normalizeLanguage("fre")).to.equal("fra");
    expect(normalizeLanguage("alb")).to.equal("sqi");
    expect(normalizeLanguage("ger")).to.equal("deu");
  });

  it("should translate IETF language tags to ISO639-3", () => {
    expect(normalizeLanguage("fr-FR")).to.equal("fra");
    expect(normalizeLanguage("en-US")).to.equal("eng");
    expect(normalizeLanguage("pt-BR")).to.equal("por");
  });

  it("should not translate languages it doesn't know", () => {
    expect(normalizeLanguage("ggg")).to.equal("ggg");
  });
});

describe("utils - normalizeAudioTrack", () => {
  it("should return null if language is `null`", () => {
    expect(normalizeAudioTrack(null)).to.equal(null);
  });

  it("should return undefined if language is `undefined`", () => {
    expect(normalizeAudioTrack(undefined)).to.equal(undefined);
  });

  it("should format a normalized audio track for an empty string", () => {
    expect(normalizeAudioTrack("")).to.eql({
      language: "",
      audioDescription: false,
      normalized: "",
    });
  });

  it("should format a normalized audio track for a given language", () => {
    expect(normalizeAudioTrack("fre")).to.eql({
      language: "fre",
      audioDescription: false,
      normalized: "fra",
    });
    expect(normalizeAudioTrack("en")).to.eql({
      language: "en",
      audioDescription: false,
      normalized: "eng",
    });
    expect(normalizeAudioTrack("pt-BR")).to.eql({
      language: "pt-BR",
      audioDescription: false,
      normalized: "por",
    });
  });

  it("should accept an object indicating the language", () => {
    expect(normalizeAudioTrack({ language: "fre" })).to.eql({
      language: "fre",
      audioDescription: false,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({ language: "en" })).to.eql({
      language: "en",
      audioDescription: false,
      normalized: "eng",
    });
    expect(normalizeAudioTrack({ language: "pt-BR" })).to.eql({
      language: "pt-BR",
      audioDescription: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is not an audio description", () => {
    expect(normalizeAudioTrack({
      language: "fre",
      audioDescription: false,
    })).to.eql({
      language: "fre",
      audioDescription: false,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({
      language: "en",
      audioDescription: false,
    })).to.eql({
      language: "en",
      audioDescription: false,
      normalized: "eng",
    });
    expect(normalizeAudioTrack({
      language: "pt-BR",
      audioDescription: false,
    })).to.eql({
      language: "pt-BR",
      audioDescription: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is an audio description", () => {
    expect(normalizeAudioTrack({
      language: "fre",
      audioDescription: true,
    })).to.eql({
      language: "fre",
      audioDescription: true,
      normalized: "fra",
    });
    expect(normalizeAudioTrack({
      language: "en",
      audioDescription: true,
    })).to.eql({
      language: "en",
      audioDescription: true,
      normalized: "eng",
    });
    expect(normalizeAudioTrack({
      language: "pt-BR",
      audioDescription: true,
    })).to.eql({
      language: "pt-BR",
      audioDescription: true,
      normalized: "por",
    });
  });
});

describe("utils - normalizeTextTrack", () => {
  it("should return null if language is `null`", () => {
    expect(normalizeTextTrack(null)).to.equal(null);
  });

  it("should return undefined if language is `undefined`", () => {
    expect(normalizeTextTrack(undefined)).to.equal(undefined);
  });

  it("should format a normalized audio track for an empty string", () => {
    expect(normalizeTextTrack("")).to.eql({
      language: "",
      closedCaption: false,
      normalized: "",
    });
  });

  it("should format a normalized audio track for a given language", () => {
    expect(normalizeTextTrack("fre")).to.eql({
      language: "fre",
      closedCaption: false,
      normalized: "fra",
    });
    expect(normalizeTextTrack("en")).to.eql({
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
    expect(normalizeTextTrack("pt-BR")).to.eql({
      language: "pt-BR",
      closedCaption: false,
      normalized: "por",
    });
  });

  it("should accept an object indicating the language", () => {
    expect(normalizeTextTrack({ language: "fre" })).to.eql({
      language: "fre",
      closedCaption: false,
      normalized: "fra",
    });
    expect(normalizeTextTrack({ language: "en" })).to.eql({
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
    expect(normalizeTextTrack({ language: "pt-BR" })).to.eql({
      language: "pt-BR",
      closedCaption: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is not a closed caption", () => {
    expect(normalizeTextTrack({
      language: "fre",
      closedCaption: false,
    })).to.eql({
      language: "fre",
      closedCaption: false,
      normalized: "fra",
    });
    expect(normalizeTextTrack({
      language: "en",
      closedCaption: false,
    })).to.eql({
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
    expect(normalizeTextTrack({
      language: "pt-BR",
      closedCaption: false,
    })).to.eql({
      language: "pt-BR",
      closedCaption: false,
      normalized: "por",
    });
  });

  it("should be able to specify that is is a closed caption", () => {
    expect(normalizeTextTrack({
      language: "fre",
      closedCaption: true,
    })).to.eql({
      language: "fre",
      closedCaption: true,
      normalized: "fra",
    });
    expect(normalizeTextTrack({
      language: "en",
      closedCaption: true,
    })).to.eql({
      language: "en",
      closedCaption: true,
      normalized: "eng",
    });
    expect(normalizeTextTrack({
      language: "pt-BR",
      closedCaption: true,
    })).to.eql({
      language: "pt-BR",
      closedCaption: true,
      normalized: "por",
    });
  });
});

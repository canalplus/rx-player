import { describe, it, expect } from "vitest";
import type { ICapabilities, IMediaConfiguration } from "../types";
import { extend, filterConfigurationWithCapabilities } from "../utils";

describe("MediaCapabilitiesProber utils - extends", () => {
  it("should return extender if target is empty", () => {
    const target: ICapabilities = [];
    const extenders: ICapabilities[] = [["Pierre", "Paul", "Jacques", { key: ["usb"] }]];
    expect(extend(target, extenders)).toEqual([
      "Pierre",
      "Paul",
      "Jacques",
      { key: ["usb"] },
    ]);
  });

  it("should return a mix of extenders if target is empty", () => {
    const target: ICapabilities = [];
    const extenders: ICapabilities[] = [
      ["Pierre", "Paul", "Jacques", { key: ["usb"] }],
      ["Pierre", "Paul", "Jules", { key: ["usb"] }],
    ];
    expect(extend(target, extenders)).toEqual([
      "Pierre",
      "Paul",
      "Jacques",
      { key: ["usb"] },
      "Jules",
    ]);
  });

  it("should return an empty extended object if target is empty", () => {
    const target: ICapabilities = [];
    const extenders: ICapabilities[] = [];
    expect(extend(target, extenders)).toEqual([]);
  });

  it("should return target if no extenders", () => {
    const target: ICapabilities = [{ key: ["usb"] }, "Paul"];
    const extenders: ICapabilities[] = [];
    expect(extend(target, extenders)).toEqual(target);
  });

  it("should extend target attributes if extender includes some new ones", () => {
    const target: ICapabilities = [{ key: ["usb"] }, "Paul"];
    const extenders: ICapabilities[] = [
      ["Paul", "Jacques", { key: ["usb", "flat-minor"] }],
    ];
    expect(extend(target, extenders)).toEqual([
      { key: ["usb", "flat-minor"] },
      "Paul",
      "Jacques",
    ]);
  });

  it("should extend target attributes if extender includes only new ones", () => {
    const target: ICapabilities = [{ key: ["usb"] }, "Paul"];
    const extenders: ICapabilities[] = [
      ["Jacques", { key: ["flat-minor"] }, { planet: ["earth"] }],
    ];
    expect(extend(target, extenders)).toEqual([
      { key: ["usb", "flat-minor"] },
      "Paul",
      "Jacques",
      { planet: ["earth"] },
    ]);
  });

  it("should extend target attributes if extenders includes some new ones", () => {
    const target: ICapabilities = [{ key: ["usb"] }, "Paul"];
    const extenders: ICapabilities[] = [
      ["Paul", "Jacques", { key: ["usb", "flat-minor"] }],
      ["Henry", "Jacques", { key: ["passphrase", "flat-minor"] }],
    ];
    expect(extend(target, extenders)).toEqual([
      { key: ["usb", "flat-minor", "passphrase"] },
      "Paul",
      "Jacques",
      "Henry",
    ]);
  });

  it("should extend target attributes if extenders includes only new ones", () => {
    const target: ICapabilities = [{ key: ["usb"] }, "Paul"];
    const extenders: ICapabilities[] = [
      ["Jacques", { key: ["flat-minor"] }],
      ["Henry", { key: ["passphrase"] }, { planet: ["earth"] }],
    ];
    expect(extend(target, extenders)).toEqual([
      { key: ["usb", "flat-minor", "passphrase"] },
      "Paul",
      "Jacques",
      "Henry",
      { planet: ["earth"] },
    ]);
  });

  it("should extend target attributes if extender has an object with empty array", () => {
    const target: ICapabilities = [{ key: ["usb"] }, "Paul"];
    const extenders: ICapabilities[] = [[{ key: [] }]];
    expect(extend(target, extenders)).toEqual([{ key: ["usb"] }, "Paul"]);
  });

  it("should extend target if a shared object has an object child", () => {
    const target: ICapabilities = [{ key: ["usb", { key: ["passphrase"] }] }, "Paul"];
    const extenders: ICapabilities[] = [
      ["Jacques", { key: ["flat-minor"] }],
      [{ key: [{ key: ["lock"] }] }],
    ];
    expect(extend(target, extenders)).toEqual([
      { key: ["usb", { key: ["passphrase", "lock"] }, "flat-minor"] },
      "Paul",
      "Jacques",
    ]);
  });
});

describe("MediaCapabilitiesProber utils - filterConfigurationWithCapabilities", () => {
  it("should normally filter a part of configuration", () => {
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
        width: 1920,
        height: 1080,
        bitrate: 3000,
        framerate: "24000/1001",
      },
      audio: {
        contentType: "audio/wma",
        channels: "5.1",
        bitrate: 128,
        samplerate: 44100,
      },
    };

    const capabilities: ICapabilities = ["type", { video: ["contentType", "width"] }];

    expect(filterConfigurationWithCapabilities(capabilities, configuration)).toEqual({
      type: "media-source",
      video: {
        contentType: "video/mp5",
        width: 1920,
      },
    });
  });

  it("should return an empty conf if no capabilities", () => {
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
        width: 1920,
        height: 1080,
        bitrate: 3000,
        framerate: "24000/1001",
      },
      audio: {
        contentType: "audio/wma",
        channels: "5.1",
        bitrate: 128,
        samplerate: 44100,
      },
    };

    const capabilities: ICapabilities = [];

    expect(filterConfigurationWithCapabilities(capabilities, configuration)).toEqual({});
  });

  it("should return an empty conf if unknown capabilities", () => {
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
        width: 1920,
        height: 1080,
        bitrate: 3000,
        framerate: "24000/1001",
      },
      audio: {
        contentType: "audio/wma",
        channels: "5.1",
        bitrate: 128,
        samplerate: 44100,
      },
    };

    const capabilities: ICapabilities = ["text", { video: ["gamma"] }];

    expect(filterConfigurationWithCapabilities(capabilities, configuration)).toEqual({});
  });

  it("should return configuration if filter all capabilities", () => {
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
        width: 1920,
        height: 1080,
        bitrate: 3000,
        framerate: "24000/1001",
      },
      audio: {
        contentType: "audio/wma",
        channels: "5.1",
        bitrate: 128,
        samplerate: 44100,
      },
    };

    const capabilities: ICapabilities = [
      "type",
      { video: ["contentType", "width", "height", "bitrate", "framerate"] },
      { audio: ["contentType", "channels", "bitrate", "samplerate"] },
    ];

    expect(filterConfigurationWithCapabilities(capabilities, configuration)).toEqual(
      configuration,
    );
  });

  it("should return an empty object with empty conf and non-empty capabilities", () => {
    const configuration: IMediaConfiguration = {};

    const capabilities: ICapabilities = [
      "type",
      { video: ["contentType", "width", "height", "bitrate", "framerate"] },
      { audio: ["contentType", "channels", "bitrate", "samplerate"] },
    ];

    expect(filterConfigurationWithCapabilities(capabilities, configuration)).toEqual({});
  });

  it("should return an empty object with empty conf and empty capabilities", () => {
    const configuration: IMediaConfiguration = {};

    const capabilities: ICapabilities = [];

    expect(filterConfigurationWithCapabilities(capabilities, configuration)).toEqual({});
  });
});

import type { MockInstance } from "vitest";
import { describe, beforeEach, it, expect, vi } from "vitest";
import eme from "../../../compat/eme";
import type { IKeySystemOption } from "../../../public_types";
import TaskCanceller from "../../../utils/task_canceller";
import getMediaKeySystemAccess from "../find_key_system";
import LoadedSessionsStore from "../utils/loaded_sessions_store";
import mediaKeysAttacher from "../utils/media_keys_attacher";

describe("find_key_systems - ", () => {
  let requestMediaKeySystemAccessMock: MockInstance;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    requestMediaKeySystemAccessMock = vi.spyOn(eme, "requestMediaKeySystemAccess");
  });

  const baseEmeConfiguration: MediaKeySystemConfiguration = {
    initDataTypes: ["cenc"],
    videoCapabilities: [
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"',
        robustness: "HW_SECURE_ALL",
      },
      {
        contentType: 'video/mp4;codecs="avc1.42e01e"',
        robustness: "HW_SECURE_ALL",
      },
      {
        contentType: 'video/mp4;codecs="hvc1.1.6.L93.B0"',
        robustness: "HW_SECURE_ALL",
      },
      {
        contentType: 'video/webm;codecs="vp8"',
        robustness: "HW_SECURE_ALL",
      },
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"',
        robustness: "HW_SECURE_DECODE",
      },
      {
        contentType: 'video/mp4;codecs="avc1.42e01e"',
        robustness: "HW_SECURE_DECODE",
      },
      {
        contentType: 'video/mp4;codecs="hvc1.1.6.L93.B0"',
        robustness: "HW_SECURE_DECODE",
      },
      {
        contentType: 'video/webm;codecs="vp8"',
        robustness: "HW_SECURE_DECODE",
      },
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"',
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/mp4;codecs="avc1.42e01e"',
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/mp4;codecs="hvc1.1.6.L93.B0"',
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/webm;codecs="vp8"',
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"',
        robustness: "SW_SECURE_DECODE",
      },
      {
        contentType: 'video/mp4;codecs="avc1.42e01e"',
        robustness: "SW_SECURE_DECODE",
      },
      {
        contentType: 'video/mp4;codecs="hvc1.1.6.L93.B0"',
        robustness: "SW_SECURE_DECODE",
      },
      {
        contentType: 'video/webm;codecs="vp8"',
        robustness: "SW_SECURE_DECODE",
      },
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"',
        robustness: "SW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/mp4;codecs="avc1.42e01e"',
        robustness: "SW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/mp4;codecs="hvc1.1.6.L93.B0"',
        robustness: "SW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/webm;codecs="vp8"',
        robustness: "SW_SECURE_CRYPTO",
      },
    ],
    audioCapabilities: [
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
        robustness: "HW_SECURE_ALL",
      },
      {
        contentType: "audio/webm;codecs=opus",
        robustness: "HW_SECURE_ALL",
      },
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
        robustness: "HW_SECURE_DECODE",
      },
      {
        contentType: "audio/webm;codecs=opus",
        robustness: "HW_SECURE_DECODE",
      },
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: "audio/webm;codecs=opus",
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
        robustness: "SW_SECURE_DECODE",
      },
      {
        contentType: "audio/webm;codecs=opus",
        robustness: "SW_SECURE_DECODE",
      },
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
        robustness: "SW_SECURE_CRYPTO",
      },
      {
        contentType: "audio/webm;codecs=opus",
        robustness: "SW_SECURE_CRYPTO",
      },
    ],
    distinctiveIdentifier: "optional",
    persistentState: "optional",
    sessionTypes: ["temporary"],
  };

  it("should create a media key the first time and then reuse the previous one if it's the same configuration", async () => {
    requestMediaKeySystemAccessMock.mockImplementation(() => {
      return {
        createMediaKeys: () => ({
          createSession: () => ({
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            generateRequest: () => {},
          }),
        }),
        getConfiguration: () => {
          return baseEmeConfiguration;
        },
      };
    });
    const mediaElement = document.createElement("video");
    const keySystemOptionsA: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: () => null,
        persistentState: "optional",
      },
    ];

    const taskCanceller = new TaskCanceller();
    const event1 = await getMediaKeySystemAccess(
      mediaElement,
      keySystemOptionsA,
      taskCanceller.signal,
    );
    expect(event1.type).toBe("create-media-key-system-access");

    // create the mediaKeys and add it to the cache
    const mediaKeys = await event1.value.mediaKeySystemAccess.createMediaKeys();
    await mediaKeysAttacher.attach(mediaElement, {
      keySystemOptions: keySystemOptionsA[0],
      emeImplementation: eme,
      askedConfiguration: baseEmeConfiguration,
      mediaKeys,
      mediaKeySystemAccess: event1.value.mediaKeySystemAccess,
      loadedSessionsStore: new LoadedSessionsStore(mediaKeys),
    });

    const event2 = await getMediaKeySystemAccess(
      mediaElement,
      keySystemOptionsA,
      taskCanceller.signal,
    );
    expect(event2.type).toBe("reuse-media-key-system-access");
  });

  it("should create a media key the first time and then create another one if the previous is not compatible.", async () => {
    requestMediaKeySystemAccessMock.mockImplementation(() => {
      return {
        createMediaKeys: () => ({
          createSession: () => ({
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            generateRequest: () => {},
          }),
        }),
        getConfiguration: () => {
          return baseEmeConfiguration;
        },
      };
    });
    const mediaElement = document.createElement("video");
    const keySystemOptionsA: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: () => null,
        persistentState: "optional",
      },
    ];

    const taskCanceller = new TaskCanceller();
    const event1 = await getMediaKeySystemAccess(
      mediaElement,
      keySystemOptionsA,
      taskCanceller.signal,
    );
    expect(event1.type).toBe("create-media-key-system-access");

    // create the mediaKeys and add it to the cache
    const mediaKeys = await event1.value.mediaKeySystemAccess.createMediaKeys();
    await mediaKeysAttacher.attach(mediaElement, {
      keySystemOptions: keySystemOptionsA[0],
      emeImplementation: eme,
      askedConfiguration: baseEmeConfiguration,
      mediaKeys,
      mediaKeySystemAccess: event1.value.mediaKeySystemAccess,
      loadedSessionsStore: new LoadedSessionsStore(mediaKeys),
    });

    const keySystemOptionsB: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: () => null,
        persistentState: "required", // persistentState differs from configuration A.
      },
    ];

    const event2 = await getMediaKeySystemAccess(
      mediaElement,
      keySystemOptionsB,
      taskCanceller.signal,
    );
    expect(event2.type).toBe("create-media-key-system-access");
  });

  it("should create a media key the first time and then reuse the previous one if it's a different configuration but it's a compatible configuration.", async () => {
    requestMediaKeySystemAccessMock.mockImplementation(() => {
      return {
        createMediaKeys: () => ({
          createSession: () => ({
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            generateRequest: () => {},
          }),
        }),
        getConfiguration: () => {
          return baseEmeConfiguration;
        },
      };
    });
    const mediaElement = document.createElement("video");
    const keySystemOptionsA: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: () => null,
        videoCapabilitiesConfig: {
          type: "contentType",
          value: ['video/mp4;codecs="avc1.4d401e', 'video/mp4;codecs="hvc1.1.6.L93.B0"'],
        },
      },
    ];

    const taskCanceller = new TaskCanceller();
    const event1 = await getMediaKeySystemAccess(
      mediaElement,
      keySystemOptionsA,
      taskCanceller.signal,
    );
    expect(event1.type).toBe("create-media-key-system-access");

    // create the mediaKeys and add it to the cache
    const mediaKeys = await event1.value.mediaKeySystemAccess.createMediaKeys();
    await mediaKeysAttacher.attach(mediaElement, {
      keySystemOptions: keySystemOptionsA[0],
      emeImplementation: eme,
      askedConfiguration: baseEmeConfiguration,
      mediaKeys,
      mediaKeySystemAccess: event1.value.mediaKeySystemAccess,
      loadedSessionsStore: new LoadedSessionsStore(mediaKeys),
    });

    const keySystemOptionsB: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: () => null,
        videoCapabilitiesConfig: {
          type: "contentType",
          // configB contains only codec "avc1", it's a subset of configA, it should be compatible.
          value: ['video/mp4;codecs="avc1.4d401e'],
        },
      },
    ];

    const event2 = await getMediaKeySystemAccess(
      mediaElement,
      keySystemOptionsB,
      taskCanceller.signal,
    );
    expect(event2.type).toBe("reuse-media-key-system-access");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IManifestLoader } from "../../../../../src/public_types.ts";
import generateManifestLoader from "../../../../../src/transports/utils/generate_manifest_loader.ts";
import TaskCanceller from "../../../../../src/utils/task_canceller.ts";

const requestMock = vi.hoisted(() => vi.fn());
vi.mock("../../../../../src/utils/request/index.ts", async (importOriginal) => ({
  ...(await importOriginal()),
  default: requestMock,
}));

describe("generateManifestLoader", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      responseData: "manifest",
      size: 8,
      requestDuration: 1,
      url: "https://example.com/manifest.mpd",
    });
  });

  it.each(["arraybuffer", "text", "document"] as const)(
    "should add fallback headers to a %s Manifest request",
    async (preferredType) => {
      const customManifestLoader: IManifestLoader = (_, callbacks) => {
        callbacks.fallback({
          headers: {
            Authorization: "token",
            ["Cmcd-Request"]: "custom-cmcd",
          },
        });
      };
      const manifestLoader = generateManifestLoader(
        { customManifestLoader },
        preferredType,
        null,
      );

      await manifestLoader(
        "https://example.com/manifest.mpd",
        {
          cmcdPayload: {
            type: "headers",
            value: { ["CMCD-Request"]: "rxplayer-cmcd" },
          },
        },
        new TaskCanceller("test").signal,
      );

      expect(requestMock).toHaveBeenCalledOnce();
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            Authorization: "token",
            ["Cmcd-Request"]: "custom-cmcd",
          },
          responseType: preferredType,
        }),
      );
    },
  );
});

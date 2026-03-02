import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  __MANIFEST_CLASSES_MOCKS,
  type IRepresentationProtectionData,
  type Representation,
} from "../../../../manifest/classes";
import type { IProtectionDataInfo } from "../../../../transports";
import EncryptionDataNotifier from "../encryption_data_notifier";

describe("EncryptionDataNotifier", () => {
  let mockNotify: (contentProtections: IRepresentationProtectionData[]) => void;

  let dummyRepresentation: Representation;
  let mockGetEncryptionData: Mock<typeof dummyRepresentation.getEncryptionData>;
  let mockGetAllEncryptionData: Mock<typeof dummyRepresentation.getAllEncryptionData>;
  let mockAddProtectionData: Mock<typeof dummyRepresentation.addProtectionData>;

  beforeEach(() => {
    mockNotify = vi.fn();

    dummyRepresentation = new __MANIFEST_CLASSES_MOCKS.DummyRepresentation();
    mockGetEncryptionData = vi
      .spyOn(dummyRepresentation, "getEncryptionData")
      .mockReturnValue([]);
    mockGetAllEncryptionData = vi
      .spyOn(dummyRepresentation, "getAllEncryptionData")
      .mockReturnValue([]);
    mockAddProtectionData = vi
      .spyOn(dummyRepresentation, "addProtectionData")
      .mockReturnValue(false);
  });

  describe("constructor - early notification", () => {
    it("should send notification immediately when drmSystemId is provided and encryption data is complete", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          keyIds: [new Uint8Array([5, 6, 7, 8]), new Uint8Array([8, 7, 6, 5])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
          type: "cenc",
        },
      ];
      mockGetEncryptionData.mockReturnValue(mockEncryptionData);
      new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });
      expect(mockGetEncryptionData).toHaveBeenCalledWith(
        "edef8ba979d64acea3c827dcd51d21ed",
      );
      expect(mockNotify).toHaveBeenCalledWith(mockEncryptionData);
      expect(mockNotify).toHaveBeenCalledTimes(1);
    });

    it("should NOT send notification when encryption data exists but keyIds are undefined", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          keyIds: undefined,
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
          type: "cenc",
        },
      ];
      mockGetEncryptionData.mockReturnValue(mockEncryptionData);

      new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockGetEncryptionData).toHaveBeenCalledWith(
        "edef8ba979d64acea3c827dcd51d21ed",
      );
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("should NOT send notification when some items have keyIds and others don't", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          keyIds: [new Uint8Array([5, 6, 7, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
          type: "cenc",
        },
        {
          keyIds: undefined,
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
          type: "cenc",
        },
      ];

      vi.spyOn(dummyRepresentation, "getEncryptionData").mockReturnValue(
        mockEncryptionData,
      );

      new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("should NOT send notification when encryption data array is empty", () => {
      new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("should NOT send notification when drmSystemId is undefined", () => {
      new EncryptionDataNotifier({
        drmSystemId: undefined,
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockGetEncryptionData).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("should handle empty keyIds array as valid", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          keyIds: [],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
          type: "cenc",
        },
      ];

      vi.spyOn(dummyRepresentation, "getEncryptionData").mockReturnValue(
        mockEncryptionData,
      );

      new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockNotify).toHaveBeenCalledWith(mockEncryptionData);
    });
  });

  describe("onNewProtectionData - deferred notification", () => {
    it("should add protection data to representation and send notification", () => {
      const notifier = new EncryptionDataNotifier({
        drmSystemId: undefined,
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      const protectionData: IProtectionDataInfo[] = [
        {
          keyId: new Uint8Array([1, 2, 3]),
          initDataType: "cenc",
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
      ];

      const allEncryptionData: IRepresentationProtectionData[] = [
        {
          keyIds: [new Uint8Array([5, 6, 7, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
          type: "cenc",
        },
      ];
      mockGetAllEncryptionData.mockReturnValue(allEncryptionData);
      mockAddProtectionData.mockReturnValue(true);

      notifier.onNewProtectionData(protectionData);

      expect(mockAddProtectionData).toHaveBeenCalledWith(
        "cenc",
        new Uint8Array([1, 2, 3]),
        [
          {
            systemId: "edef8ba979d64acea3c827dcd51d21ed",
            data: new Uint8Array([4, 5, 6]),
          },
        ],
      );
      expect(mockGetAllEncryptionData).toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalledWith(allEncryptionData);
    });

    it("should add multiple protection data items to representation", () => {
      const notifier = new EncryptionDataNotifier({
        drmSystemId: undefined,
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      const protectionData: IProtectionDataInfo[] = [
        {
          initDataType: "cenc",
          keyId: new Uint8Array([1, 2, 3]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
        {
          initDataType: "cenc",
          keyId: new Uint8Array([7, 8, 9]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([10, 11, 12]),
            },
          ],
        },
      ];

      const allEncryptionData: IRepresentationProtectionData[] = [
        {
          type: "cenc",
          keyIds: [new Uint8Array([5, 6, 7, 8]), new Uint8Array([8, 7, 6, 5])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
      ];

      vi.spyOn(dummyRepresentation, "getAllEncryptionData").mockReturnValue(
        allEncryptionData,
      );
      mockAddProtectionData.mockReturnValue(true);

      notifier.onNewProtectionData(protectionData);

      expect(mockAddProtectionData).toHaveBeenCalledTimes(2);
      expect(mockAddProtectionData).toHaveBeenNthCalledWith(
        1,
        "cenc",
        new Uint8Array([1, 2, 3]),
        [
          {
            systemId: "edef8ba979d64acea3c827dcd51d21ed",
            data: new Uint8Array([4, 5, 6]),
          },
        ],
      );
      expect(mockAddProtectionData).toHaveBeenNthCalledWith(
        2,
        "cenc",
        new Uint8Array([7, 8, 9]),
        [
          {
            systemId: "edef8ba979d64acea3c827dcd51d21ed",
            data: new Uint8Array([10, 11, 12]),
          },
        ],
      );
      expect(mockNotify).toHaveBeenCalledWith(allEncryptionData);
    });

    it("should NOT send notification if no encryption data is available after adding", () => {
      const notifier = new EncryptionDataNotifier({
        drmSystemId: undefined,
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      mockGetAllEncryptionData.mockReturnValue([]);
      mockAddProtectionData.mockReturnValue(true);

      const protectionData: IProtectionDataInfo[] = [
        {
          initDataType: "cenc",
          keyId: new Uint8Array([1, 2, 3]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
      ];
      notifier.onNewProtectionData(protectionData);

      expect(mockAddProtectionData).toHaveBeenCalled();
      expect(mockGetAllEncryptionData).toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("should handle empty protection data array", () => {
      const notifier = new EncryptionDataNotifier({
        drmSystemId: undefined,
        representation: dummyRepresentation,
        notify: mockNotify,
      });
      mockAddProtectionData.mockReturnValue(true);
      notifier.onNewProtectionData([]);
      expect(mockAddProtectionData).not.toHaveBeenCalled();
      expect(mockGetAllEncryptionData).toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    });
  });

  describe("notification sent only once", () => {
    it("should NOT send notification again after early notification", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          keyIds: [new Uint8Array([5, 6, 7, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
          type: "cenc",
        },
      ];
      vi.spyOn(dummyRepresentation, "getEncryptionData").mockReturnValue(
        mockEncryptionData,
      );

      const notifier = new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      // Early notification should have been sent
      expect(mockNotify).toHaveBeenCalledTimes(1);

      // Now call onNewProtectionData
      const protectionData: IProtectionDataInfo[] = [
        {
          initDataType: "cenc",
          keyId: new Uint8Array([4, 5, 6]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([7, 8, 9]),
            },
          ],
        },
      ];

      vi.spyOn(dummyRepresentation, "getAllEncryptionData").mockReturnValue([
        ...mockEncryptionData,
        {
          keyIds: [new Uint8Array([8, 7, 6, 5])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([7, 8, 9]),
            },
          ],
          type: "cenc",
        },
      ]);
      mockAddProtectionData.mockReturnValue(true);

      notifier.onNewProtectionData(protectionData);

      // Should still be called only once
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockAddProtectionData).toHaveBeenCalled();
    });

    it("should NOT send notification again on subsequent onNewProtectionData calls", () => {
      const notifier = new EncryptionDataNotifier({
        drmSystemId: undefined,
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      const protectionData1: IProtectionDataInfo[] = [
        {
          initDataType: "cenc",
          keyId: new Uint8Array([1, 2, 3]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
      ];
      const allEncryptionData: IRepresentationProtectionData[] = [
        {
          type: "cenc",
          keyIds: [new Uint8Array([5, 6, 7, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
      ];
      vi.spyOn(dummyRepresentation, "getAllEncryptionData").mockReturnValue(
        allEncryptionData,
      );

      // First call should trigger notification
      notifier.onNewProtectionData(protectionData1);
      expect(mockNotify).toHaveBeenCalledTimes(1);

      // Second call should NOT trigger notification
      const protectionData2: IProtectionDataInfo[] = [
        {
          initDataType: "cenc",
          keyId: new Uint8Array([7, 8, 9]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([10, 11, 12]),
            },
          ],
        },
      ];
      mockAddProtectionData.mockReturnValue(true);

      notifier.onNewProtectionData(protectionData2);
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockAddProtectionData).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple encryption data items with all keyIds defined", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          type: "cenc",
          keyIds: [new Uint8Array([5, 6, 7, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
        },
        {
          type: "cenc",
          keyIds: [new Uint8Array([8, 7, 6, 5]), new Uint8Array([8, 8, 8, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([4, 5, 6]),
            },
          ],
        },
      ];

      vi.spyOn(dummyRepresentation, "getEncryptionData").mockReturnValue(
        mockEncryptionData,
      );

      new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockNotify).toHaveBeenCalledWith(mockEncryptionData);
    });

    it("should add protection data even when notification was already sent", () => {
      const mockEncryptionData: IRepresentationProtectionData[] = [
        {
          type: "cenc",
          keyIds: [new Uint8Array([5, 6, 7, 8])],
          values: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([1, 2, 3]),
            },
          ],
        },
      ];

      vi.spyOn(dummyRepresentation, "getEncryptionData").mockReturnValue(
        mockEncryptionData,
      );

      const notifier = new EncryptionDataNotifier({
        drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
        representation: dummyRepresentation,
        notify: mockNotify,
      });

      expect(mockNotify).toHaveBeenCalledTimes(1);

      const protectionData: IProtectionDataInfo[] = [
        {
          initDataType: "cenc",
          keyId: new Uint8Array([7, 8, 9]),
          initData: [
            {
              systemId: "edef8ba979d64acea3c827dcd51d21ed",
              data: new Uint8Array([10, 11, 12]),
            },
          ],
        },
      ];
      mockAddProtectionData.mockReturnValue(true);

      notifier.onNewProtectionData(protectionData);

      // Data should still be added even though notification won't be sent again
      expect(mockAddProtectionData).toHaveBeenCalledWith(
        "cenc",
        new Uint8Array([7, 8, 9]),
        [
          {
            systemId: "edef8ba979d64acea3c827dcd51d21ed",
            data: new Uint8Array([10, 11, 12]),
          },
        ],
      );
    });
  });
});

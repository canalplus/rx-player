import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IRepresentation } from "../../../manifest";
import GuessBasedChooser from "../guess_based_chooser";
import { ABRAlgorithmType } from "../utils/last_estimate_storage";
import type { IRequestInfo } from "../utils/pending_requests_store";
import type { IRepresentationMaintainabilityScore } from "../utils/representation_score_calculator";
import { ScoreConfidenceLevel } from "../utils/representation_score_calculator";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

const mocks = vi.hoisted(() => ({
  estimateRequestBandwidth: vi.fn(),
  getMonotonicTimeStamp: vi.fn(),
}));

vi.mock("../../../log", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../utils/array_find_index", () => ({
  // eslint-disable-next-line no-restricted-properties
  default: vi.fn((arr, predicate) => arr.findIndex(predicate)),
}));

vi.mock("../../../utils/monotonic_timestamp", () => ({
  default: mocks.getMonotonicTimeStamp,
}));

vi.mock("../network_analyzer", () => ({
  estimateRequestBandwidth: mocks.estimateRequestBandwidth,
}));

// Helper functions
function createRepresentation(id: string, bitrate: number): IRepresentation {
  return {
    id,
    bitrate,
  } as IRepresentation;
}

function createScoreData(
  score: number,
  confidenceLevel: ScoreConfidenceLevel,
): IRepresentationMaintainabilityScore {
  return { score, confidenceLevel };
}

function createRequest(
  representationId: string,
  segmentDuration: number,
  requestTimestamp: number,
  isInit = false,
): IRequestInfo {
  return {
    content: {
      representation: { id: representationId } as IRepresentation,
      segment: {
        duration: segmentDuration,
        isInit,
      },
    },
    requestTimestamp,
  } as IRequestInfo;
}

describe("GuessBasedChooser", () => {
  let mockScoreCalculator: any;
  let mockPrevEstimate: any;
  let representations: IRepresentation[];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMonotonicTimeStamp.mockReturnValue(10000);

    // Setup mock representations (sorted by bitrate ascending)
    representations = [
      createRepresentation("rep-1", 100000),
      createRepresentation("rep-2", 500000),
      createRepresentation("rep-3", 1000000),
      createRepresentation("rep-4", 2000000),
      createRepresentation("rep-5", 3000000),
    ];

    mockScoreCalculator = {
      getEstimate: vi.fn(),
    };

    mockPrevEstimate = {
      representation: null,
      algorithmType: ABRAlgorithmType.GuessBased,
    };
  });

  describe("constructor", () => {
    it("should initialize with correct default values", () => {
      const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);
      expect(chooser).toBeDefined();
    });
  });

  describe("getGuess", () => {
    describe("when last chosen representation is null", () => {
      it("should return null - nothing to base guess on", () => {
        mockPrevEstimate.representation = null;
        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 5, speed: 1 },
          representations[2],
          1500000,
          [],
        );

        expect(result).toBeNull();
      });
    });

    describe("when incomingBestBitrate > lastChosenRep.bitrate", () => {
      it("should return null - ABR estimates are already superior", () => {
        mockPrevEstimate.representation = representations[1]; // 500000
        mockPrevEstimate.algorithmType = ABRAlgorithmType.GuessBased;

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 5, speed: 1 },
          representations[1],
          1000000, // Higher than last chosen
          [],
        );

        expect(result).toBeNull();
      });

      it("should reset consecutive wrong guesses when algorithm was GuessBased", () => {
        mockPrevEstimate.representation = representations[1];
        mockPrevEstimate.algorithmType = ABRAlgorithmType.GuessBased;

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        // First call should reset counter
        chooser.getGuess(
          representations,
          { bufferGap: 5, speed: 1 },
          representations[1],
          1000000,
          [],
        );

        // Subsequent calls should still work (counter was reset)
        const result = chooser.getGuess(
          representations,
          { bufferGap: 5, speed: 1 },
          representations[1],
          1000000,
          [],
        );

        expect(result).toBeNull();
      });
    });

    describe("when not in guessing mode yet", () => {
      beforeEach(() => {
        mockPrevEstimate.representation = representations[1];
        mockPrevEstimate.algorithmType = ABRAlgorithmType.BufferBased;
      });

      it("should return null when score data is undefined", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(undefined);

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 5, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBeNull();
      });

      it("should return next representation when conditions allow guessing higher", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBe(representations[2]);
      });

      it("should return null when buffer gap is too low to guess higher", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 1.5, speed: 1 }, // Below 2.5 threshold
          representations[1],
          100000,
          [],
        );

        expect(result).toBeNull();
      });

      it("should return null when confidence level is not HIGH", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.LOW),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBeNull();
      });

      it("should return null when score/speed ratio is too low", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.005, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBeNull();
      });

      it("should account for playback speed when checking score", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(2.0, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 2.0 }, // Speed 2x requires higher score
          representations[1],
          100000,
          [],
        );

        expect(result).toBeNull(); // 2.0 / 2.0 = 1.0, not > 1.01
      });

      it("should return null when already at highest representation", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[4], // Highest representation
          100000,
          [],
        );

        expect(result).toBeNull();
      });
    });

    describe("when already in guessing mode", () => {
      beforeEach(() => {
        mockPrevEstimate.representation = representations[2]; // 1000000
        mockPrevEstimate.algorithmType = ABRAlgorithmType.GuessBased;
      });

      it("should take higher guess when conditions are met", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(2.0, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          1000000,
          [],
        );
        expect(result).toBe(representations[3]);
      });

      it("should take same guess when conditions are met with highest guess", () => {
        mockPrevEstimate.representation = representations[4];
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(2.0, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          1000000,
          [],
        );
        expect(result).toBe(representations[4]);
      });

      it("should return last chosen representation when current differs", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.2, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1], // Different from last chosen
          100000,
          [],
        );

        expect(result).toBe(representations[2]);
      });

      it("should stop guess and downgrade when score is too low", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(0.9, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        expect(result).toBe(representations[1]); // Previous representation
      });

      it("should stop guess when buffer gap is low and score is marginal", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.1, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 0.5, speed: 1 }, // Below 0.6 threshold
          representations[2],
          100000,
          [],
        );

        expect(result).toBe(representations[1]);
      });

      it("should stop guess when score is undefined and buffer gap is low", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(undefined);

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 0.5, speed: 1 },
          representations[2],
          100000,
          [],
        );

        expect(result).toBe(representations[1]);
      });

      it("should block guesses for increasing duration after consecutive wrong guesses", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(0.9, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        // First wrong guess
        chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        // Try to guess again immediately
        mocks.getMonotonicTimeStamp.mockReturnValue(10000 + 5000); // 5 seconds later
        mockPrevEstimate.algorithmType = ABRAlgorithmType.BufferBased;

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1],
          100000,
          [],
        );

        // Should be blocked (15 seconds block)
        expect(result).toBeNull();
      });

      it("should allow guessing after block period expires", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(0.9, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        // First wrong guess
        chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        // Wait for block to expire
        mocks.getMonotonicTimeStamp.mockReturnValue(10000 + 20000); // 20 seconds later
        mockPrevEstimate.algorithmType = ABRAlgorithmType.BufferBased;
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1],
          100000,
          [],
        );

        // Should be allowed now
        expect(result).toBe(representations[2]);
      });

      it("should guess higher when conditions allow in guessing mode", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        expect(result).toBe(representations[3]); // Next higher representation
      });

      it("should return current representation when score data is undefined and not stopping", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(undefined);

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        expect(result).toBe(representations[2]);
      });
    });

    describe("request-based guess stopping", () => {
      beforeEach(() => {
        mockPrevEstimate.representation = representations[2];
        mockPrevEstimate.algorithmType = ABRAlgorithmType.GuessBased;
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.2, ScoreConfidenceLevel.HIGH),
        );
      });

      it("should stop guess when init segment takes too long (>1000ms)", () => {
        const requests = [
          createRequest("rep-3", 0, 8000, true), // 2000ms elapsed (10000 - 8000)
        ];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[1]);
      });

      it("should not stop guess when init segment is fast enough", () => {
        const requests = [
          createRequest("rep-3", 0, 9500, true), // 500ms elapsed
        ];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[3]);
      });

      it("should stop guess when regular segment takes too long", () => {
        const requests = [
          createRequest("rep-3", 2, 5000, false), // 5000ms elapsed, duration is 2s
        ];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[1]); // Should downgrade
      });

      it("should not stop guess when regular segment is within acceptable time", () => {
        const requests = [
          createRequest("rep-3", 2, 8500, false), // 1500ms elapsed, duration is 2s (threshold: 2200ms)
        ];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[3]);
      });

      it("should stop guess when estimated bandwidth is too low", () => {
        vi.mocked(mocks.estimateRequestBandwidth).mockReturnValue(700000); // 70% of bitrate

        const requests = [createRequest("rep-3", 2, 9000, false)];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[1]);
      });

      it("should not consider requests for other representations", () => {
        const requests = [createRequest("rep-4", 2, 5000, false)];

        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.1, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 2.0, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[2]);
      });

      it("should handle multiple requests and stop on any failing condition", () => {
        const requests = [
          createRequest("rep-3", 2, 9500, false), // OK
          createRequest("rep-3", 2, 5000, false), // TOO SLOW - should trigger stop
          createRequest("rep-3", 2, 9000, false), // OK
        ];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          requests,
        );

        expect(result).toBe(representations[1]);
      });
    });

    describe("guess validation", () => {
      beforeEach(() => {
        mockPrevEstimate.representation = representations[2];
        mockPrevEstimate.algorithmType = ABRAlgorithmType.GuessBased;
      });

      it("should validate guess with high score and high confidence", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.6, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        // If validated, should allow guessing higher next time
        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          100000,
          [],
        );

        expect(result).toBe(representations[3]);
      });

      it("should validate guess when incoming bitrate matches and it's an improvement", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.2, ScoreConfidenceLevel.LOW),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[2],
          1000000, // Matches current bitrate
          [],
        );

        // Should be validated and allow progression
        expect(result).toBe(representations[2]);
      });
    });

    describe("edge cases", () => {
      it("should handle infinite buffer gap correctly", () => {
        mockPrevEstimate.representation = representations[1];
        mockPrevEstimate.algorithmType = ABRAlgorithmType.BufferBased;
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: Infinity, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBe(null);
      });

      it("should handle NaN buffer gap by not guessing", () => {
        mockPrevEstimate.representation = representations[1];
        mockPrevEstimate.algorithmType = ABRAlgorithmType.BufferBased;
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        const result = chooser.getGuess(
          representations,
          { bufferGap: NaN, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBeNull();
      });

      it("should cap block duration at 120 seconds", () => {
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(0.9, ScoreConfidenceLevel.HIGH),
        );
        mockPrevEstimate.algorithmType = ABRAlgorithmType.GuessBased;
        mockPrevEstimate.representation = representations[2];

        const chooser = new GuessBasedChooser(mockScoreCalculator, mockPrevEstimate);

        // Trigger many consecutive wrong guesses
        for (let i = 0; i < 20; i++) {
          chooser.getGuess(
            representations,
            { bufferGap: 3, speed: 1 },
            representations[2],
            100000,
            [],
          );
          mocks.getMonotonicTimeStamp.mockReturnValue(10000 + 1000 * (i + 1));
        }

        // The block should be capped at 120 seconds max
        // After 120 seconds, should be able to guess again
        mocks.getMonotonicTimeStamp.mockReturnValue(10000 + 20000 + 120100);
        mockPrevEstimate.algorithmType = ABRAlgorithmType.BufferBased;
        mockPrevEstimate.representation = representations[1]; // Update to reflect actual downgraded state
        mockScoreCalculator.getEstimate.mockReturnValue(
          createScoreData(1.5, ScoreConfidenceLevel.HIGH),
        );

        const result = chooser.getGuess(
          representations,
          { bufferGap: 3, speed: 1 },
          representations[1],
          100000,
          [],
        );

        expect(result).toBe(representations[2]);
      });
    });
  });
});

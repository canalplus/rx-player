/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("compat - shouldWaitForHaveEnoughData", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return false if we are not on the Playstation 5", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isPlayStation5: false,
      };
    });
    const shouldWaitForHaveEnoughData = jest.requireActual(
      "../should_wait_for_have_enough_data",
    );
    expect(shouldWaitForHaveEnoughData.default()).toBe(false);
  });

  it("should return true if we are on the Playstation 5", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isPlayStation5: true,
      };
    });
    const shouldWaitForHaveEnoughData = jest.requireActual(
      "../should_wait_for_have_enough_data",
    );
    expect(shouldWaitForHaveEnoughData.default()).toBe(true);
  });
});

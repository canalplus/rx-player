/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("compat - shouldWaitForEncryptedBeforeAttachment", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return false if we are not on Safari", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isSafariMobile: false,
        isSafariDesktop: false,
      };
    });
    const shouldWaitForEncryptedBeforeAttachment =
      jest.requireActual("../should_wait_for_encrypted_before_attachment");
    expect(shouldWaitForEncryptedBeforeAttachment.default()).toBe(false);
  });

  it("should return true if we are on Safari Mobile", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isIE11: false,
        isSafariMobile: true,
        isSafariDesktop: false,
      };
    });
    const shouldWaitForEncryptedBeforeAttachment =
      jest.requireActual("../should_wait_for_encrypted_before_attachment");
    expect(shouldWaitForEncryptedBeforeAttachment.default()).toBe(true);
  });

  it("should return true if we are on Safari Desktop", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isIE11: false,
        isSafariMobile: false,
        isSafariDesktop: true,
      };
    });
    const shouldWaitForEncryptedBeforeAttachment =
      jest.requireActual("../should_wait_for_encrypted_before_attachment");
    expect(shouldWaitForEncryptedBeforeAttachment.default()).toBe(true);
  });
});

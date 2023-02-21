/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("Features list - DEBUG_ELEMENT", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add DEBUG_ELEMENT in the current features", () => {
    const feat = {};
    jest.mock("../../../core/api/debug", () => ({ __esModule: true as const,
                                                  default: feat }));
    const addFeature = jest.requireActual("../debug_element").default;

    const featureObject : {
      createDebugElement? : unknown;
    } = {};
    addFeature(featureObject);
    expect(featureObject).toEqual({ createDebugElement: {} });
    expect(featureObject.createDebugElement).toBe(feat);
  });
});

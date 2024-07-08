import { describe, it, expect } from "vitest";
import type { IPeriodIntermediateRepresentation } from "../../node_parser_types";
import type { IParsedPeriodsContext } from "../get_periods_time_infos";
// https://github.com/typescript-eslint/typescript-eslint/issues/2315
/* eslint-disable no-duplicate-imports */
import getPeriodsTimeInformation from "../get_periods_time_infos";
/* eslint-enable no-duplicate-imports */

describe("DASH Parser - getPeriodsTimeInformation", () => {
  it("should guess duration and end from next period.", () => {
    const periodsInfos = [{ attributes: { start: 0 } }, { attributes: { start: 10 } }];
    const timeInfos = getPeriodsTimeInformation(
      periodsInfos as IPeriodIntermediateRepresentation[],
      {} as IParsedPeriodsContext,
    );
    expect(timeInfos[0].periodDuration).toBe(10);
    expect(timeInfos[0].periodEnd).toBe(10);
    expect(timeInfos[1].periodDuration).toBe(undefined);
    expect(timeInfos[1].periodEnd).toBe(undefined);
  });

  it("should guess start from previous period end", () => {
    const periodsInfos = [
      { attributes: { start: 0, duration: 10 } },
      { attributes: { duration: 10 } },
    ];
    const timeInfos = getPeriodsTimeInformation(
      periodsInfos as IPeriodIntermediateRepresentation[],
      {} as IParsedPeriodsContext,
    );
    expect(timeInfos[0].periodEnd).toBe(10);
    expect(timeInfos[1].periodStart).toBe(10);
    expect(timeInfos[1].periodEnd).toBe(20);
  });

  it("should return periods time infos corresponding to inputs", () => {
    const periodsInfos = [
      { attributes: { start: 0, duration: 5 } },
      { attributes: { start: 5, duration: 10 } },
    ];
    const timeInfos = getPeriodsTimeInformation(
      periodsInfos as IPeriodIntermediateRepresentation[],
      {} as IParsedPeriodsContext,
    );
    expect(timeInfos[0].periodStart).toEqual(periodsInfos[0].attributes.start);
    expect(timeInfos[0].periodDuration).toEqual(periodsInfos[0].attributes.duration);
    expect(timeInfos[1].periodStart).toEqual(periodsInfos[1].attributes.start);
    expect(timeInfos[1].periodDuration).toEqual(periodsInfos[1].attributes.duration);
  });

  it("should infer duration from manifest infos", () => {
    const periodsInfos = [{ attributes: { start: 0 } }];
    const manifestInfos = {
      duration: 20,
    };
    const timeInfos = getPeriodsTimeInformation(
      periodsInfos as IPeriodIntermediateRepresentation[],
      manifestInfos as IParsedPeriodsContext,
    );
    expect(timeInfos[0].periodDuration).toEqual(manifestInfos.duration);
  });

  it("should infer start from availability start time", () => {
    const periodsInfos = [{ attributes: { duration: 10 } }];
    const manifestInfos = {
      isDynamic: true,
      availabilityStartTime: 500,
    };
    const timeInfos = getPeriodsTimeInformation(
      periodsInfos as IPeriodIntermediateRepresentation[],
      manifestInfos as IParsedPeriodsContext,
    );
    expect(timeInfos[0].periodStart).toBe(500);
    expect(timeInfos[0].periodDuration).toBe(10);
    expect(timeInfos[0].periodEnd).toBe(510);
  });

  it("should infer start from non-static manifest", () => {
    const periodsInfos = [{ attributes: { duration: 10 } }];
    const manifestInfos = {
      isDynamic: false,
    };
    const timeInfos = getPeriodsTimeInformation(
      periodsInfos as IPeriodIntermediateRepresentation[],
      manifestInfos as IParsedPeriodsContext,
    );
    expect(timeInfos[0].periodStart).toBe(0);
    expect(timeInfos[0].periodDuration).toBe(10);
    expect(timeInfos[0].periodEnd).toBe(10);
  });
});

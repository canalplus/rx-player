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

import log from "../log";

/**
 * In some JavaScript engines, numbers are encoded as IEEE 754 floating
 * point numbers. Due to the binary nature of their encoding, some decimal
 * numbers cannot be represented with perfect accuracy. This leads to rounding
 * errors in calculation. One the most known example is :
 * 0.1 + 0.2 = 0.30000000000000004
 *
 * This is why we need some reliable operators for calculations. One of the logic
 * behind these functions is to turn floating number into scaled integers, do
 * the wanted operation, and divide it with the original scale factor.
 *
 * Example 1 :
 * 0.1 = 1 / 10
 * 0.2 = 2 / 10
 * So :
 * 0.1 + 0.2 = (1 + 2) / 10 = 0.3
 *
 * Example 2 :
 * On browsers, 192797480.641122 * 10000000 = 1927974806411220.2
 * It is false. The result is 0.2 above the expected result.
 *
 * 192797480.641122 = 192797480641122 / 1000000(common scale factor)
 * 10000000 = 10000000000000 / 10000000(common scale factor)
 * So :
 * 192797480.641122 * 10000000
 *  = (192797480641122 * 10000000000000) / 1000000(scale factor)
 *  = 1927974806411220
 */

function getScaledIntegers(nbr1: number, nbr2: number): [number, number, number] {
  const splittedNbr1 = nbr1.toString().split(".");
  const splittedNbr2 = nbr2.toString().split(".");

  const integer1 = splittedNbr1[0];
  let decimal1 = splittedNbr1[1] ?? "";

  const integer2 = splittedNbr2[0];
  let decimal2 = splittedNbr2[1] ?? "";

  let divider = 1;
  if (decimal1.length < decimal2.length) {
    divider = Math.pow(10, decimal2.length);
    const diff = decimal2.length - decimal1.length;
    for (let i = 0; i < diff; i++) {
      decimal1 += "0";
    }
  } else {
    divider = Math.pow(10, decimal1.length);
    const diff = decimal1.length - decimal2.length;
    for (let i = 0; i < diff; i++) {
      decimal2 += "0";
    }
  }
  const newTerm1 = parseInt(integer1 + decimal1, 10);
  const newTerm2 = parseInt(integer2 + decimal2, 10);
  return [newTerm1, newTerm2, divider];
}

function reliableMultiply(factor1: number, factor2: number): number {
  if (Number.isInteger(factor1) &&
      Number.isInteger(factor2)) {
    return factor1 * factor2;
  }
  const [newFactor1, newFactor2, divider] = getScaledIntegers(factor1, factor2);
  if (isNaN(newFactor1) || isNaN(newFactor2)) {
    log.warn("Utils: Can't make reliable multiplication. Using Javascript instead.");
    return factor1 * factor2;
  }
  return (newFactor1 * newFactor2) / Math.pow(divider, 2);
}

function reliableAdd(term1: number, term2: number): number {
  if (Number.isInteger(term1) &&
      Number.isInteger(term2)) {
    return term1 + term2;
  }
  const [newTerm1, newTerm2, divider] = getScaledIntegers(term1, term2);
  if (isNaN(newTerm1) || isNaN(newTerm2)) {
    log.warn("Utils: Can't make reliable addition. Using Javascript instead.");
    return term1 + term2;
  }
  return (newTerm1 + newTerm2) / divider;
}

export { reliableAdd, reliableMultiply };

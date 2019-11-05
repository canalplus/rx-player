/**
 * Shuffle members of an array into a random order.
 * @param {Array.<*>} arr
 * @returns {Array.<*>}
 */
export default function shuffleArray(arr) {
  const clonedArr = arr.slice();
  let currentIndex = arr.length;
  while (0 !== currentIndex) {
    // Pick a remaining element...
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    const temporaryValue = clonedArr[currentIndex];
    clonedArr[currentIndex] = clonedArr[randomIndex];
    clonedArr[randomIndex] = temporaryValue;
  }
  return clonedArr;
}

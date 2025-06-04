/** RegExp detecting the start of a code block only intended for debug builds */
const DEBUG_BLOCK_START = /^\s*\/\/\s##\s*START CODE BLOCK\s*:\s*DEBUG-BUILD-ONLY.*$/m;

/** RegExp detecting the end of a code block only intended for debug builds */
const DEBUG_BLOCK_END = /^\s*\/\/\s##\s*END CODE BLOCK\s*:\s*DEBUG-BUILD-ONLY.*$/m;

/** RegExp detecting the start of a code block only intended for bundles */
const BUNDLE_BLOCK_START = /^\s*\/\/\s##\s*START CODE BLOCK\s*:\s*BUNDLE-ONLY.*$/m;

/** RegExp detecting the start of a code block only intended for bundles */
const BUNDLE_BLOCK_END = /^\s*\/\/\s##\s*END CODE BLOCK\s*:\s*BUNDLE-ONLY.*$/m;

/**
 * Remove from the given source file's content the unwanted code blocks.
 * @param {string} src - The source file's content.
 * @param {Object} param1 - Stripping configuration .
 * @param {boolean} param1.stripDebugBlocks - If `true`, the code blocks intended
 * for debug builds will be removed.
 * @param {boolean} param1.stripBundleBlocks - If `true` the code blocks
 * intended for bundles will be removed.
 * @returns {string} - Resulting content with the right blocks removed.
 */
export default function stripCodeBlocks(src, { stripDebugBlocks, stripBundleBlocks }) {
  let output = src;

  // Fast path for the huge majority of files without any code block.
  // Much faster than the following Regex-based approach
  if (src.indexOf("START CODE BLOCK") < 0) {
    return output;
  }
  if (stripDebugBlocks) {
    output = stripSpecificCodeBlocks(output, DEBUG_BLOCK_START, DEBUG_BLOCK_END);
  }
  if (stripBundleBlocks) {
    output = stripSpecificCodeBlocks(output, BUNDLE_BLOCK_START, BUNDLE_BLOCK_END);
  }
  return output;
}

/**
 * Strip the given source code of the blocks of code matching the given RegExp.
 * @param {string} src - The source file's content.
 * @param {RegExp} codeBlockStartRegEx - RegExp detecting the start of a code
 * block to strip
 * @param {RegExp} codeBlockEndRegEx - RegExp detecting the end of a code
 * block to strip
 * @returns {string} - Source file's content with the corresponding code blocks
 * removed from it.
 */
function stripSpecificCodeBlocks(src, codeBlockStartRegEx, codeBlockEndRegEx) {
  const tempArr = [];
  let sourceText = src;
  let exec;
  while ((exec = codeBlockStartRegEx.exec(sourceText)) !== null) {
    const currentOffset = exec.index + exec[0].length;
    const execEnd = codeBlockEndRegEx.exec(sourceText.substring(currentOffset));
    if (execEnd === null) {
      throw new Error("Error: Missing end of code block");
    }
    tempArr.push(sourceText.substring(0, exec.index));
    sourceText = sourceText.substring(currentOffset + execEnd.index + execEnd[0].length);
  }
  tempArr.push(sourceText);
  return tempArr.join("");
}

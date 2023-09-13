/**
 * Prunes unused functions from the given shader code string. 
 * Keeps only the functions listed in the functionNames array and the functions 
 * that are recursively called by them.
 *
 * @param {string} shaderCode - The original shader code as a string.
 * @param {string[]} functionNames - An array of function names that should be retained in the shader code along with functions that are called by them, directly or recursively.
 *
 * @returns {string} - The pruned shader code as a string.
 */
export function prune(shaderCode: string, functionNames: string[]): string {
  // Remove all single line and multi-line comments
  shaderCode = shaderCode.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

  const functions = new Map<string, string>();
  const functionPattern = /fn\s+([a-zA-Z_][a-zA-Z_0-9]*)\s*\([^]*?->[^]*?\{/g;
  const globalStructsAndConstsPattern = /(struct\s+[a-zA-Z_][a-zA-Z_0-9]*\s*\{[^]*?\})|(\bconst\b[^;]*;)|(\balias\b\s+[a-zA-Z_][a-zA-Z_0-9]*\s*=\s*[a-zA-Z_][a-zA-Z_0-9]*\s*;)/g;

  let match;

  // Extract all global structs, constants, and aliases
  let globalStructsAndConsts = '';
  while ((match = globalStructsAndConstsPattern.exec(shaderCode)) !== null) {
    globalStructsAndConsts += match[0] + '\n\n';
  }

  // Extract all functions
  while ((match = functionPattern.exec(shaderCode)) !== null) {
    let braceCount = 1;
    let endIndex = match.index + match[0].length;
    while (braceCount > 0 && endIndex < shaderCode.length) {
      if (shaderCode[endIndex] === '{') {
        braceCount++;
      } else if (shaderCode[endIndex] === '}') {
        braceCount--;
      }
      endIndex++;
    }

    const funcBody = shaderCode.slice(match.index, endIndex);
    functions.set(match[1], funcBody);
  }

  const usedFunctions = new Set(functionNames);

  function addCalledFunctions(functionBody: string) {
    for (const [name, body] of functions.entries()) {
      if (functionBody.includes(name)) {
        if (!usedFunctions.has(name)) {
          usedFunctions.add(name);
          addCalledFunctions(body); // recursive call to handle nested function calls
        }
      }
    }
  }

  functionNames.forEach(fnName => {
    const body = functions.get(fnName);
    if (body) {
      addCalledFunctions(body);
    }
  });

  let prunedCode = globalStructsAndConsts;
  for (const usedFunction of usedFunctions.values()) {
    prunedCode += functions.get(usedFunction) + '\n\n';
  }

  return prunedCode;
}
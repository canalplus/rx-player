import path from "path";
import ts from "typescript";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { readdirSync, statSync } from "fs";
import { fileURLToPath } from "node:url";
import stripCodeBlocks from "./strip_code_blocks.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typescriptBaseConfigs = [
  {
    isEs5CommonJsBuild: true,
    includeTests: false,
  },
  {
    isEs5CommonJsBuild: false,
    includeTests: false,
  },
];

export default function generateTypeScriptBuilds({ devMode, noCheck }) {
  return new Promise((resolve, reject) => {
    let workersLeft = typescriptBaseConfigs.length;
    for (const config of typescriptBaseConfigs) {
      const worker = new Worker(import.meta.filename, {
        workerData: {
          ...config,
          isDebugBuild: devMode,
          ignoreErrors: noCheck,
        },
      });
      const messages = [];
      worker.on("message", (msg) => {
        messages.push(msg);
      });

      worker.on("error", (err) => {
        for (const msg of messages) {
          console.error(msg);
        }
        reject(new Error(`A Worker encountered an error: ${err.toString()}`));
      });
      worker.on("exit", (code) => {
        if (code === 0 && messages.length === 0) {
          workersLeft--;
          if (workersLeft === 0) {
            resolve();
          }
          return;
        }
        if (code !== 0) {
          console.error(`Error: Worker stopped with exit code ${code}`);
        }
        for (const msg of messages) {
          console.error(msg);
        }
        reject(new Error(`TypeScript build failed`));
      });
    }
  });
}

if (!isMainThread) {
  const diagnosticResult = runTypeScriptOnRxPlayer(workerData);
  if (diagnosticResult !== null) {
    parentPort.postMessage(diagnosticResult);
  }
}

function runTypeScriptOnRxPlayer({
  includeTests,
  isEs5CommonJsBuild,
  isDebugBuild,
  ignoreErrors,
}) {
  const includeRegex = /\.(m|c)?ts$/;
  const excludeRegex = includeTests ? null : /(\/__tests__\/)|(.*\.test\.ts$)/;
  const files = recursivelyFindFiles(
    path.join(__dirname, "..", "src"),
    includeRegex,
    excludeRegex,
  );
  let outDir;
  let target;
  let module;
  if (isEs5CommonJsBuild) {
    outDir = "./dist/commonjs";
    target = ts.ScriptTarget.ES5;
    module = ts.ModuleKind.CommonJS;
  } else {
    outDir = "./dist/es2017";
    target = ts.ScriptTarget.ES2017;
    module = ts.ModuleKind.ES2015;
  }
  if (!target) {
    throw new Error("Error: target not found. Has TypeScript broken its compiler API?");
  }
  if (!module) {
    throw new Error("Error: module not found. Has TypeScript broken its compiler API?");
  }
  return compile(
    files,
    {
      outDir,
      noEmitOnError: !ignoreErrors,
      allowJS: false,
      declaration: true,
      declarationMap: true,
      lib: ["lib.es2017.d.ts", "lib.dom.d.ts"],
      exactOptionalPropertyTypes: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: false,
      noImplicitAny: true,
      noImplicitAnyx: true,
      noUncheckedSideEffectImports: true,
      strict: true,
      strictNullChecks: true,
      strictPropertyInitialization: true,
      noUnusedParameters: true,
      noUnusedLocals: true,
      downlevelIteration: isEs5CommonJsBuild,
      target,
      module,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      typeRoots: ["./node_modules/@types"],
    },
    { isDebugBuild },
  );
}

function compile(fileNames, compilerOptions, buildInfo) {
  const host = ts.createCompilerHost(compilerOptions);
  host.getSourceFile = (fileName, opts) => {
    let sourceText = ts.sys.readFile(fileName);
    if (!sourceText) {
      return undefined;
    }
    sourceText = stripCodeBlocks(sourceText, {
      stripDebugBlocks: !buildInfo.isDebugBuild,
      stripBundleBlocks: true,
    });
    return ts.createSourceFile(fileName, sourceText, opts);
  };
  const program = ts.createProgram(fileNames, compilerOptions, host);
  const result = program.emit();
  return result.diagnostics.length === 0
    ? null
    : ts.formatDiagnosticsWithColorAndContext(result.diagnostics, host);
}

function recursivelyFindFiles(
  baseDir,
  includeRegex,
  excludeRegex,
  files,
  currentResults,
) {
  const checkedFiles = files ?? readdirSync(baseDir);
  let results = currentResults ?? [];
  for (let i = 0; i < checkedFiles.length; i++) {
    const file = path.join(baseDir, checkedFiles[i]);
    if (statSync(file).isDirectory()) {
      try {
        results = recursivelyFindFiles(
          file,
          includeRegex,
          excludeRegex,
          readdirSync(file),
          results,
        );
      } catch (error) {
        continue;
      }
    } else if (includeRegex.test(file) && (!excludeRegex || !excludeRegex.test(file))) {
      results.push(file);
    }
  }
  return results;
}

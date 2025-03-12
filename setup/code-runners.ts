/// <reference types="vite/client" />

import { defineCodeRunnersSetup } from "@slidev/types";
import {
  type QuickJSAsyncContext,
  newQuickJSAsyncWASMModule,
  newVariant,
  RELEASE_ASYNC,
} from "quickjs-emscripten";
import wasmLocation from "@jitl/quickjs-wasmfile-release-asyncify/wasm?url";

const QuickJS = await newQuickJSAsyncWASMModule(
  newVariant(RELEASE_ASYNC, { wasmLocation }),
);

const SUPPORTED_LOG_METHODS = [
  "log",
  "warn",
  "error",
  "info",
  "debug",
] satisfies (keyof Console)[];

function appendConsoleLog(
  vm: QuickJSAsyncContext,
  push: (output: string) => void,
) {
  const consoleHandle = vm.newObject();
  for (const method of SUPPORTED_LOG_METHODS) {
    const logHandle = vm.newFunction(method, (...args) => {
      const argString = args.map((v) => JSON.stringify(vm.dump(v))).join(", ");
      push(`console.${method}(${argString})`);
    });
    vm.setProp(consoleHandle, method, logHandle);
  }
  vm.setProp(vm.global, "console", consoleHandle);
  consoleHandle.dispose();
}

export default defineCodeRunnersSetup(() => {
  return {
    javascript: async (code, ctx) => {
      const vm = QuickJS.newContext();
      const outputs = [] as string[];
      appendConsoleLog(vm, (output) => {
        outputs.push(output);
      });

      const result = await vm.evalCodeAsync(code);

      try {
        const resultUnwrapped = vm.unwrapResult(result).consume(vm.dump);
        if (resultUnwrapped) {
          outputs.push(JSON.stringify(resultUnwrapped));
        }
        return outputs.map((output) => ({
          text: output,
          highlightLang: "javascript",
        }));
      } catch (error) {
        console.error(error);
        return {
          error: error,
        };
      } finally {
        vm.dispose();
      }
    },
  };
});

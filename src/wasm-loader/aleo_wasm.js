import * as wasm from "./aleo_wasm_bg.wasm";
import { __wbg_set_wasm } from "./aleo_wasm_bg.js";
__wbg_set_wasm(wasm);
export * from "./aleo_wasm_bg.js";

#!/usr/bin/env node
export declare function proveAndVerify(bytecodePath: string, witnessPath: string, crsPath: string, isRecursive: boolean): Promise<boolean>;
export declare function prove(bytecodePath: string, witnessPath: string, crsPath: string, isRecursive: boolean, outputPath: string): Promise<void>;
export declare function gateCount(bytecodePath: string): Promise<void>;
export declare function verify(proofPath: string, isRecursive: boolean, vkPath: string): Promise<boolean>;
export declare function contract(outputPath: string, vkPath: string): Promise<void>;
export declare function writeVk(bytecodePath: string, crsPath: string, outputPath: string): Promise<void>;
export declare function proofAsFields(proofPath: string, numInnerPublicInputs: number, outputPath: string): Promise<void>;
export declare function vkAsFields(vkPath: string, vkeyOutputPath: string): Promise<void>;
//# sourceMappingURL=main.d.ts.map
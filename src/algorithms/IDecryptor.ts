export interface IDecryptor {
  decrypt: (cipherText: string, viewKey: string) => Promise<string>;
  bulkDecrypt: (cipherTexts: string[], viewKey: string) => Promise<IDecryptResult[]>;
}

export interface IDecryptResult {
  cipherText: string;
  plainText: string;
}
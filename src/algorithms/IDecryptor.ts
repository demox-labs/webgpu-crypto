export interface IDecryptor {
  isOwner: (cipherText: string, viewKey: string) => Promise<boolean>;
  bulkIsOwner: (cipherTexts: string[], viewKey: string) => Promise<string[]>;
  decrypt: (cipherText: string, viewKey: string) => Promise<string>;
  bulkDecrypt: (cipherTexts: string[], viewKey: string) => Promise<IDecryptResult[]>;
}

export interface IDecryptResult {
  cipherText: string;
  plainText: string;
}
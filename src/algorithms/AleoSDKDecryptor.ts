import { IDecryptResult, IDecryptor } from './IDecryptor';
import { loadWasmModule } from '../wasm-loader/wasm-loader';

export class AleoSDKDecryptor implements IDecryptor {
  public async isOwner(cipherText: string, viewKey: string): Promise<boolean> {
    const aleo = await loadWasmModule();
    const aleoCipherText = aleo.RecordCiphertext.fromString(cipherText);
    const aleoViewKey = aleo.ViewKey.from_string(viewKey);
    return aleoCipherText.isOwner(aleoViewKey);
  }

  public async bulkIsOwner(cipherTexts: string[], viewKey: string): Promise<string[]> {
    const aleo = await loadWasmModule();

    const aleoViewKey = aleo.ViewKey.from_string(viewKey);

    return cipherTexts.filter(cipher => {
      const aleoCipherText = aleo.RecordCiphertext.fromString(cipher);
      return aleoCipherText.isOwner(aleoViewKey);
    });
  }

  public async decrypt(cipherText: string, viewKey: string): Promise<string> {
    const aleo = await loadWasmModule();
    const aleoViewKey = aleo.ViewKey.from_string(viewKey);
    return aleoViewKey.decrypt(cipherText);
  }

  public async bulkDecrypt(cipherTexts: string[], viewKey: string): Promise<IDecryptResult[]> {
    const aleo = await loadWasmModule();
    const aleoViewKey = aleo.ViewKey.from_string(viewKey);
    return cipherTexts.map(cipher => {
      const plainText = aleoViewKey.decrypt(cipher);
      return { cipherText: cipher, plainText };
    });
  }
}
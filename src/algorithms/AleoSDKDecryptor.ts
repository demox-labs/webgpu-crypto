// import * as Aleo from '@demox-labs/aleo-sdk';
import { IDecryptResult, IDecryptor } from './IDecryptor';
import { loadWasmModule } from '../utils/wasm-loader';

export class AleoSDKDecryptor implements IDecryptor {
  public async decrypt(cipherText: string, viewKey: string): Promise<string> {
    const aleo = await loadWasmModule();
    const aleoViewKey = aleo.ViewKey.from_string(viewKey);
    const decrypt = aleoViewKey.decrypt(cipherText);
    return decrypt;
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
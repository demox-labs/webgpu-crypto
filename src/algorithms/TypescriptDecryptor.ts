import { IDecryptResult, IDecryptor } from "./IDecryptor";
import { bech32m } from 'bech32';
import { curve, eddsa } from 'elliptic';

export class TypescriptDecryptor implements IDecryptor {
  public async isOwner(cipherText: string, viewKey: string): Promise<boolean> {
    throw new Error('not implemented');
  }

  public async bulkIsOwner(cipherTexts: string[], viewKey: string): Promise<string[]> {
    throw new Error('not implemented');
  }

  public async decrypt(cipherText: string, viewKey: string): Promise<string> {
    throw new Error('not implemented');
  }

  public async bulkDecrypt(cipherTexts: string[], viewKey: string): Promise<IDecryptResult[]> {
    throw new Error('not implemented');
  }

  public convertGroupElementToAddress(groupElement: curve.base.BasePoint): string {
    const twistedEdwards = new eddsa('ed25519');
    const bytesBuffer = twistedEdwards.encodePoint(groupElement);
    const bytes = new Uint8Array(bytesBuffer);
    return this.parseBytesToAddress(bytes);
  }

  public convertAddressToGroupElement(address: string) {
    const byteArray = Array.from(this.parseAddressToBytes(address));
    
    // Decode the address data from u5 to u8, and into an account address.
    const twistedEdwards = new eddsa('ed25519');
    // Convert the decoded address bytes to a Twisted Edwards group element
    const groupElement = twistedEdwards.decodePoint((byteArray as unknown as eddsa.Bytes));

    return groupElement;
  }

  public parseAddressToBytes(address: string): Uint8Array {
    const ADDRESS_PREFIX = "aleo";
    // Ensure the address string length is 63 characters.
    if (address.length !== 63) {
      throw new Error(`Invalid account address length: found ${address.length}, expected 63`);
    }
    
    // Decode the address string from bech32m.
    const { prefix, words: data } = bech32m.decode(address);

    if (prefix !== ADDRESS_PREFIX) {
      throw new Error(`Failed to decode address: '${prefix}' is an invalid prefix`);
    } else if (data.length === 0) {
      throw new Error("Failed to decode address: data field is empty");
    }
    
    const u8Data = bech32m.fromWords(data);
    // Decode the address data from u5 to u8, and into an account address.
    return new Uint8Array(u8Data);
  }

  // very important -- the bytes in the Uint8Array should be u8, not u5
  public parseBytesToAddress(bytes: Uint8Array): string {
    // Encode the address data from u8 to u5.
    const words = bech32m.toWords(bytes);
    const prefix = 'aleo';
    return bech32m.encode(prefix, words);
  }
}
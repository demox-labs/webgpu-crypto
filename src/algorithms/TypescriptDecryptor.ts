import { bytesToAddress } from "../utils/helper";
import { IDecryptResult, IDecryptor } from "./IDecryptor";
import { bech32m } from 'bech32';
import BN from 'bn.js';

export class TypescriptDecryptor implements IDecryptor {
  public fieldByteSize = 32;

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

  public async isOwnerCheck(cipherText: string, viewKey: string, address: string): Promise<boolean> {
    const RECORD_PREFIX = 'record';
    const { prefix, words: data } = bech32m.decode(cipherText, Infinity);
    if (prefix !== RECORD_PREFIX) {
      throw new Error(`Failed to decode address: '${prefix}' is an invalid prefix`);
    } else if (data.length === 0) {
      throw new Error("Failed to decode address: data field is empty");
    }

    const u8Data = bech32m.fromWords(data);

    const bytes = new Uint8Array(u8Data);

    const dataView = new DataView(bytes.buffer);

    let byteOffset = 0;

    const owner = dataView.getUint8(0);
    byteOffset += 1;
    // public
    if (owner === 0) {
      const bytesArray: Uint8Array = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytesArray[i] = (dataView.getUint8(byteOffset));
        byteOffset += 1;
      }
      const recordOwner = await bytesToAddress(bytesArray);
      return recordOwner === address;
    }
    // private
    else if (owner === 1) {
      const numFields = dataView.getUint16(byteOffset, true);
      console.log(numFields);
      byteOffset += 2;
      const ownerFieldBytes = this.readFieldBytes(dataView, byteOffset);
      byteOffset += this.fieldByteSize;
      const ownerField = this.convertBytesToFieldElement(ownerFieldBytes);
      
      console.log(ownerField);
      // nonce is at the end of the record
      const nonceOffset = dataView.byteLength - this.fieldByteSize;
      const nonceFieldBytes = this.readFieldBytes(dataView, nonceOffset);
      const nonceField = this.convertBytesToFieldElement(nonceFieldBytes);
      console.log(nonceField);
      throw new Error('not implemented');
    }
    else {
      throw new Error('Invalid owner: ' + owner);
    }
  }

  public getNonce(cipherText: string): string {
    const RECORD_PREFIX = 'record';
    const { prefix, words: data } = bech32m.decode(cipherText, Infinity);
    if (prefix !== RECORD_PREFIX) {
      throw new Error(`Failed to decode address: '${prefix}' is an invalid prefix`);
    } else if (data.length === 0) {
      throw new Error("Failed to decode address: data field is empty");
    }

    const u8Data = bech32m.fromWords(data);

    const bytes = new Uint8Array(u8Data);

    const dataView = new DataView(bytes.buffer);

    const nonceOffset = dataView.byteLength - this.fieldByteSize;
    const nonceFieldBytes = this.readFieldBytes(dataView, nonceOffset);
    const nonceField = this.convertBytesToFieldElement(nonceFieldBytes);
    return nonceField;
  }

  public readFieldBytes(dataView: DataView, byteOffset: number): Uint8Array {
    const fieldBytes = new Uint8Array(this.fieldByteSize);
    for (let i = 0; i < this.fieldByteSize; i++) {
      fieldBytes[i] = (dataView.getUint8(byteOffset));
      byteOffset += 1;
    }
    return fieldBytes
  }

  public convertBytesToFieldElement(bytes: Uint8Array): string {
    const fieldElement = new BN(bytes, 16, 'le');
    return fieldElement.toString();
  }
}
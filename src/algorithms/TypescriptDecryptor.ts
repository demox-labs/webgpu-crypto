import { convertBytesToFieldElement, convertCiphertextToDataView, getNonce, getPrivateOwnerBytes, getPublicOwnerBytes, isOwnerPublic } from "../utils/RecordParser";
import { bytesToAddress } from "../utils/helper";
import { IDecryptResult } from "./IDecryptor";

export class TypescriptDecryptor {
  public async isOwner(cipherText: string, viewKeyScalar: string, address: string): Promise<boolean> {
    const dataView = convertCiphertextToDataView(cipherText);

    const ownerPublic = isOwnerPublic(dataView);
    // public
    if (ownerPublic) {
      const ownerBytes = getPublicOwnerBytes(dataView);
      const recordOwner = await bytesToAddress(ownerBytes);
      return recordOwner === address;
    }
    // private
    else {
      const ownerBytes = getPrivateOwnerBytes(dataView);
      const ownerField = convertBytesToFieldElement(ownerBytes);
      
      // console.log(ownerField);
      const nonceField = getNonce(dataView);
      // console.log(nonceField);
      throw new Error('not implemented'); 
    }
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

  public async isOwnerCheck(cipherText: string, viewKeyScalar: string, address: string): Promise<boolean> {
    const dataView = convertCiphertextToDataView(cipherText);

    const ownerPublic = isOwnerPublic(dataView);
    // public
    if (ownerPublic) {
      const ownerBytes = getPublicOwnerBytes(dataView);
      const recordOwner = await bytesToAddress(ownerBytes);
      return recordOwner === address;
    }
    // private
    else {
      const ownerBytes = getPrivateOwnerBytes(dataView);
      const ownerField = convertBytesToFieldElement(ownerBytes);
      
      // console.log(ownerField);
      const nonceField = getNonce(dataView);
      // console.log(nonceField);
      throw new Error('not implemented'); 
    }
  }
}
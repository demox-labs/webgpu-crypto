import { getPointFromX, multiply, poseidonHash, poseidonHashFast, subtract } from "../utils/FieldMath";
import { convertBytesToFieldElement, convertCiphertextToDataView, getNonce, getPrivateOwnerBytes, getPublicOwnerBytes, isOwnerPublic } from "../parsers/RecordParser";
import { bytesToAddress } from "../utils/helper";
import { IDecryptResult } from "./IDecryptor";
import { convertXCoordinateToAddress, parseAddressToXCoordinate } from "../parsers/AddressParser";

export class TypescriptDecryptor {
  public isOwner(cipherText: string, viewKeyScalar: bigint, address: string, address_x: bigint): boolean {
    const dataView = convertCiphertextToDataView(cipherText);

    const ownerPublic = isOwnerPublic(dataView);
    // public
    if (ownerPublic) {
      const ownerBytes = getPublicOwnerBytes(dataView);
      const recordOwnerX = convertBytesToFieldElement(ownerBytes);
      const recordOwner = convertXCoordinateToAddress(recordOwnerX);
      return recordOwner === address;
    }
    // private
    else {
      const ownerBytes = getPrivateOwnerBytes(dataView);
      const ownerField = BigInt(convertBytesToFieldElement(ownerBytes));
      
      // console.log(ownerField);
      const nonceField = getNonce(dataView);
      const nonceGroup = getPointFromX(nonceField);
      const multiplication = multiply(nonceGroup.x, nonceGroup.y, viewKeyScalar);
      const recordViewKey = multiplication.x;
      const hash = poseidonHash(recordViewKey);

      const ownerX = subtract(ownerField, hash);
      return ownerX === address_x;
    }
  }

  public async bulkIsOwner(cipherTexts: string[], viewKeyScalar: bigint, address: string): Promise<string[]> {
    const address_x = parseAddressToXCoordinate(address);
    const isOwnerResults = cipherTexts.filter((cipherText) => {
      return this.isOwner(cipherText, viewKeyScalar, address, address_x);
    });
    return isOwnerResults;
  }

  public async benchmarkPrivateBulkIsOwner(cipherTexts: string[], viewKeyScalar: bigint, address: string): Promise<string[]> {
    const start = performance.now();
    const address_x = parseAddressToXCoordinate(address);
    const parseAddressToXCoordinateTime = performance.now();
    console.log(`parseAddressToXCoordinateTime: ${parseAddressToXCoordinateTime - start}`);
    const dataViews = cipherTexts.map(cipherText => convertCiphertextToDataView(cipherText));
    const ciphertextsToDataViewsTime = performance.now();
    console.log(`ciphertextsToDataViewsTime: ${ciphertextsToDataViewsTime - parseAddressToXCoordinateTime}`);
    // private
    const ownerBytes = dataViews.map(dataView => getPrivateOwnerBytes(dataView));
    const ownerBytesTime = performance.now();
    console.log(`ownerBytesTime: ${ownerBytesTime - ciphertextsToDataViewsTime}`);
    const ownerFields = ownerBytes.map(ownerByte => BigInt(convertBytesToFieldElement(ownerByte)));
    const ownerFieldsTime = performance.now();
    console.log(`ownerFieldsTime: ${ownerFieldsTime - ownerBytesTime}`);
    
    // console.log(ownerField);
    const nonceFields = dataViews.map(dataView => getNonce(dataView));
    const nonceFieldsTime = performance.now();
    console.log(`nonceFieldsTime: ${nonceFieldsTime - ownerFieldsTime}`);
    const nonceGroups = nonceFields.map(nonceField => getPointFromX(nonceField));
    const nonceGroupsTime = performance.now();
    console.log(`nonceGroupsTime: ${nonceGroupsTime - nonceFieldsTime}`);
    console.log(`total set up time: ${performance.now() - start}`);
    const multiplications = nonceGroups.map(nonceGroup => multiply(nonceGroup.x, nonceGroup.y, viewKeyScalar));
    const multiplicationsTime = performance.now();
    console.log(`multiplicationsTime: ${multiplicationsTime - nonceGroupsTime}`);
    const recordViewKeys = multiplications.map(multiplication => multiplication.x);
    const recordViewKeysTime = performance.now();
    console.log(`recordViewKeysTime: ${recordViewKeysTime - multiplicationsTime}`);
    const hashes = recordViewKeys.map(recordViewKey => poseidonHashFast(recordViewKey));
    const hashesTime = performance.now();
    console.log(`hashesTime: ${hashesTime - recordViewKeysTime}`);

    let ownersAndCiphers: { ownerX: bigint, ciphertext: string}[] = [];
    for (let i = 0; i < hashes.length; i++) {
      const ownerAndCipher = { ownerX: subtract(ownerFields[i], hashes[i]), ciphertext: cipherTexts[i] };
      ownersAndCiphers.push(ownerAndCipher);
    }
    const ownersAndCiphersTime = performance.now();
    console.log(`ownersAndCiphersTime: ${ownersAndCiphersTime - hashesTime}`);
    console.log(`total time after set up: ${performance.now() - nonceGroupsTime}`)

    return ownersAndCiphers.filter(ownerAndCipher => ownerAndCipher.ownerX === address_x).map(ownerAndCipher => ownerAndCipher.ciphertext);
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
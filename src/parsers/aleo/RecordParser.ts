import { bech32m } from "bech32";
import BN from "bn.js";

export const FIELD_BYTE_SIZE = 32;

export const convertCiphertextToDataView = (ciphertext: string): DataView => {
  const RECORD_PREFIX = 'record';
  const { prefix, words: data } = bech32m.decode(ciphertext, Infinity);
  if (prefix !== RECORD_PREFIX) {
    throw new Error(`Failed to decode address: '${prefix}' is an invalid prefix`);
  } else if (data.length === 0) {
    throw new Error("Failed to decode address: data field is empty");
  }

  const u8Data = bech32m.fromWords(data);

  const bytes = new Uint8Array(u8Data);

  return new DataView(bytes.buffer);
}

export const getNonce = (dataView: DataView): bigint => {
  const nonceOffset = dataView.byteLength - FIELD_BYTE_SIZE;
  const nonceFieldBytes = readFieldBytes(dataView, nonceOffset);
  const nonceField = BigInt(convertBytesToFieldElement(nonceFieldBytes));
  return nonceField;
}

export const readFieldBytes = (dataView: DataView, byteOffset: number): Uint8Array => {
  const fieldBytes = new Uint8Array(FIELD_BYTE_SIZE);
  for (let i = 0; i < FIELD_BYTE_SIZE; i++) {
    fieldBytes[i] = (dataView.getUint8(byteOffset));
    byteOffset += 1;
  }
  return fieldBytes
}

export const convertBytesToFieldElement = (bytes: Uint8Array): string => {
  const fieldElement = new BN(bytes, 16, 'le');
  return fieldElement.toString();
}

export const isOwnerPublic = (ciphertextData: DataView): boolean => {
  // first byte determines public vs private. Public is 0, private is 1.
  return ciphertextData.getUint8(0) === 0;
}

export const getPublicOwnerBytes = (ciphertextData: DataView): Uint8Array => {
  const byteOffset = 1; // the first byte is the owner type
  const ownerFieldBytes = readFieldBytes(ciphertextData, byteOffset);
  return ownerFieldBytes;
}

export const getPrivateOwnerBytes = (ciphertextData: DataView): Uint8Array => {
  const byteOffset = 3; // the first byte is the owner type, the second & third bytes are the number of fields
  const ownerFieldBytes = readFieldBytes(ciphertextData, byteOffset);
  return ownerFieldBytes;
}
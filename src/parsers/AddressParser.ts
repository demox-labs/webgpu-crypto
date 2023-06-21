import { bech32m } from "bech32";
import BN from "bn.js";
import bs58 from "bs58";

export const parseAddressToXCoordinate = (address: string): bigint => {
  const bytes = parseAddressToBytes(address);
  return BigInt(convertBytesToFieldElement(bytes));
}

export const parseViewKeyToScalar = (viewKey: string): bigint => {
  let bytes = bs58.decode(viewKey);
  bytes = bytes.slice(7);
  return BigInt(convertBytesToFieldElement(bytes));
}

const parseAddressToBytes = (address: string): Uint8Array => {
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

export const convertBytesToFieldElement = (bytes: Uint8Array): string => {
  const fieldElement = new BN(bytes, 16, 'le');
  return fieldElement.toString();
}

const convertFieldElementToBytes = (fieldElement: string): Uint8Array => {
  const fieldElementBN = new BN(fieldElement, 10, 'le');
  return new Uint8Array(fieldElementBN.toArray());
}

const parseBytesToAddress = (bytes: Uint8Array): string => {
  const words = bech32m.toWords(bytes);
  return bech32m.encode("aleo", words);
}

export const convertXCoordinateToAddress = (fieldElement: string): string => {
  const bytes = convertFieldElementToBytes(fieldElement);
  return parseBytesToAddress(bytes);
}
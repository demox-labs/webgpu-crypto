/* tslint:disable */
/* eslint-disable */
/**
*/
export class Address {
  free(): void;
/**
* @param {PrivateKey} private_key
* @returns {Address}
*/
  static from_private_key(private_key: PrivateKey): Address;
/**
* @param {ViewKey} view_key
* @returns {Address}
*/
  static from_view_key(view_key: ViewKey): Address;
/**
* @param {string} address
* @returns {Address}
*/
  static from_string(address: string): Address;
/**
* @returns {string}
*/
  to_string(): string;
/**
* @param {Uint8Array} bytes
* @returns {Address}
*/
  static from_bytes(bytes: Uint8Array): Address;
/**
* @returns {string}
*/
  to_x_coordinate(): string;
/**
* @param {Uint8Array} message
* @param {Signature} signature
* @returns {boolean}
*/
  verify(message: Uint8Array, signature: Signature): boolean;
}
/**
*/
export class PrivateKey {
  free(): void;
/**
* Generate a new private key
*/
  constructor();
/**
* Get a private key from a series of unchecked bytes
* @param {Uint8Array} seed
* @returns {PrivateKey}
*/
  static from_seed_unchecked(seed: Uint8Array): PrivateKey;
/**
* Create a private key from a string representation
*
* This function will fail if the text is not a valid private key
* @param {string} private_key
* @returns {PrivateKey}
*/
  static from_string(private_key: string): PrivateKey;
/**
* Get a string representation of the private key
*
* This function should be used very carefully as it exposes the private key plaintext
* @returns {string}
*/
  to_string(): string;
/**
* Get the view key corresponding to the private key
* @returns {ViewKey}
*/
  to_view_key(): ViewKey;
/**
* Get the address corresponding to the private key
* @returns {Address}
*/
  to_address(): Address;
/**
* Sign a message with the private key
* @param {Uint8Array} message
* @returns {Signature}
*/
  sign(message: Uint8Array): Signature;
/**
* Get a private key ciphertext using a secret.
*
* The secret is sensitive and will be needed to decrypt the private key later, so it should be stored securely
* @param {string} secret
* @returns {PrivateKeyCiphertext}
*/
  static newEncrypted(secret: string): PrivateKeyCiphertext;
/**
* Encrypt the private key with a secret.
*
* The secret is sensitive and will be needed to decrypt the private key later, so it should be stored securely
* @param {string} secret
* @returns {PrivateKeyCiphertext}
*/
  toCiphertext(secret: string): PrivateKeyCiphertext;
/**
* Get private key from a private key ciphertext using a secret.
* @param {PrivateKeyCiphertext} ciphertext
* @param {string} secret
* @returns {PrivateKey}
*/
  static fromPrivateKeyCiphertext(ciphertext: PrivateKeyCiphertext, secret: string): PrivateKey;
}
/**
* Private Key in ciphertext form
*/
export class PrivateKeyCiphertext {
  free(): void;
/**
* Encrypt a private key using a secret string.
*
* The secret is sensitive and will be needed to decrypt the private key later, so it should be stored securely.
* @param {PrivateKey} private_key
* @param {string} secret
* @returns {PrivateKeyCiphertext}
*/
  static encryptPrivateKey(private_key: PrivateKey, secret: string): PrivateKeyCiphertext;
/**
* Decrypts a private ciphertext using a secret string.
*
* This must be the same secret used to encrypt the private key
* @param {string} secret
* @returns {PrivateKey}
*/
  decryptToPrivateKey(secret: string): PrivateKey;
/**
* Returns the ciphertext string
* @returns {string}
*/
  toString(): string;
/**
* Creates a PrivateKeyCiphertext from a string
* @param {string} ciphertext
* @returns {PrivateKeyCiphertext}
*/
  static fromString(ciphertext: string): PrivateKeyCiphertext;
}
/**
* Encrypted Aleo record
*/
export class RecordCiphertext {
  free(): void;
/**
* Return a record ciphertext from a string.
* @param {string} record
* @returns {RecordCiphertext}
*/
  static fromString(record: string): RecordCiphertext;
/**
* Return the record ciphertext string.
* @returns {string}
*/
  toString(): string;
/**
* Decrypt the record ciphertext into plaintext using the view key.
* @param {ViewKey} view_key
* @returns {RecordPlaintext}
*/
  decrypt(view_key: ViewKey): RecordPlaintext;
/**
* @returns {string}
*/
  get_nonce(): string;
/**
* Returns `true` if the view key can decrypt the record ciphertext.
* @param {ViewKey} view_key
* @returns {boolean}
*/
  isOwner(view_key: ViewKey): boolean;
}
/**
* Aleo record plaintext
*/
export class RecordPlaintext {
  free(): void;
/**
* Return a record plaintext from a string.
* @param {string} record
* @returns {RecordPlaintext}
*/
  static fromString(record: string): RecordPlaintext;
/**
* Returns the record plaintext string
* @returns {string}
*/
  toString(): string;
/**
* Returns the amount of gates in the record
* @returns {bigint}
*/
  gates(): bigint;
/**
* Attempt to get the serial number of a record to determine whether or not is has been spent
* @param {PrivateKey} private_key
* @param {string} program_id
* @param {string} record_name
* @returns {string}
*/
  serialNumberString(private_key: PrivateKey, program_id: string, record_name: string): string;
}
/**
*/
export class Signature {
  free(): void;
/**
* @param {PrivateKey} private_key
* @param {Uint8Array} message
* @returns {Signature}
*/
  static sign(private_key: PrivateKey, message: Uint8Array): Signature;
/**
* @param {Address} address
* @param {Uint8Array} message
* @returns {boolean}
*/
  verify(address: Address, message: Uint8Array): boolean;
/**
* @param {string} signature
* @returns {Signature}
*/
  static from_string(signature: string): Signature;
/**
* @returns {string}
*/
  to_string(): string;
}
/**
*/
export class ViewKey {
  free(): void;
/**
* @param {PrivateKey} private_key
* @returns {ViewKey}
*/
  static from_private_key(private_key: PrivateKey): ViewKey;
/**
* @param {string} view_key
* @returns {ViewKey}
*/
  static from_string(view_key: string): ViewKey;
/**
* @returns {string}
*/
  to_string(): string;
/**
* @returns {Address}
*/
  to_address(): Address;
/**
* @param {string} ciphertext
* @returns {string}
*/
  decrypt(ciphertext: string): string;
/**
* @param {Array<any>} ciphertexts
* @returns {Array<any>}
*/
  filter_owned(ciphertexts: Array<any>): Array<any>;
/**
* @param {Array<any>} ciphertexts
* @returns {Array<any>}
*/
  filter_owned_fast(ciphertexts: Array<any>): Array<any>;
/**
* @returns {string}
*/
  to_scalar(): string;
}

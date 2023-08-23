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
* @param {Uint8Array} message
* @param {Signature} signature
* @returns {boolean}
*/
  verify(message: Uint8Array, signature: Signature): boolean;
/**
* @returns {string}
*/
  to_x_coordinate(): string;
/**
* @param {Uint8Array} bytes
* @returns {Address}
*/
  static from_bytes(bytes: Uint8Array): Address;
/**
* @returns {string}
*/
  to_affine(): string;
/**
* @returns {string}
*/
  to_projective(): string;
/**
* @returns {string}
*/
  to_group(): string;
/**
* @param {string} field1
* @param {string} field2
* @returns {string}
*/
  static add_fields(field1: string, field2: string): string;
/**
* @param {string} field1
* @param {string} field2
* @returns {string}
*/
  static sub_fields(field1: string, field2: string): string;
/**
* @param {string} field
* @returns {string}
*/
  static invert_field(field: string): string;
/**
* @param {string} field
* @returns {string}
*/
  static double_field(field: string): string;
/**
* @param {string} field1
* @param {string} field2
* @returns {string}
*/
  static mul_fields(field1: string, field2: string): string;
/**
* @param {string} field1
* @param {string} field2
* @returns {string}
*/
  static pow_field(field1: string, field2: string): string;
/**
* @param {string} field
* @returns {string}
*/
  static poseidon_hash(field: string): string;
/**
* @param {string} field
* @returns {string}
*/
  static sqrt(field: string): string;
/**
* @param {string} group1
* @param {string} group2
* @returns {string}
*/
  static add_points(group1: string, group2: string): string;
/**
* @param {string} group
* @param {string} scalar
* @returns {string}
*/
  static group_scalar_mul(group: string, scalar: string): string;
/**
* @param {Array<any>} groups
* @param {Array<any>} scalars
* @returns {string}
*/
  static msm(groups: Array<any>, scalars: Array<any>): string;
}
/**
* Webassembly Representation of an Aleo function execution response
*
* This object is returned by the execution of an Aleo function off-chain. It provides methods for
* retrieving the outputs of the function execution.
*/
export class ExecutionResponse {
  free(): void;
/**
* Get the outputs of the executed function
* @returns {Array<any>}
*/
  getOutputs(): Array<any>;
}
/**
* Webassembly Representation of an Aleo function fee execution response
*
* This object is returned by the execution of the `fee` function in credits.aleo. If a fee is
* specified when attempting to create an on-chain program execution transaction, this will be
* required as part of the transaction. However, it can be executed in parallel to execution of
* main program in separate web workers prior to creation of the transaction.
*/
export class FeeExecution {
  free(): void;
/**
* Get the amount of the fee
* @returns {bigint}
*/
  fee(): bigint;
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
* Webassembly Representation of an Aleo program
*
* This object is required to create an Execution or Deployment transaction. It includes several
* convenience methods for enumerating available functions and each functions' inputs in a
* javascript object for usage in creation of web forms for input capture.
*/
export class Program {
  free(): void;
/**
* Create a program from a program string
* @param {string} program
* @returns {Program}
*/
  static fromString(program: string): Program;
/**
* Get a string representation of the program
* @returns {string}
*/
  toString(): string;
/**
* Get javascript array of functions names in the program
* @returns {Array<any>}
*/
  getFunctions(): Array<any>;
/**
* Get a javascript object representation of the function inputs and types. This can be used
* to generate a webform to capture user inputs for an execution of a function.
* @param {string} function_name
* @returns {Array<any>}
*/
  getFunctionInputs(function_name: string): Array<any>;
/**
* Get a javascript object representation of a program record and its types
* @param {string} record_name
* @returns {object}
*/
  getRecordMembers(record_name: string): object;
/**
* Get a javascript object representation of a program struct and its types
* @param {string} struct_name
* @returns {Array<any>}
*/
  getStructMembers(struct_name: string): Array<any>;
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
* Returns `true` if the view key can decrypt the record ciphertext.
* @param {ViewKey} view_key
* @returns {boolean}
*/
  isOwner(view_key: ViewKey): boolean;
/**
* @returns {string}
*/
  get_nonce(): string;
/**
* @param {string} scalar
* @returns {string}
*/
  point_scalar_mul(scalar: string): string;
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
* Returns the amount of microcredits in the record
* @returns {bigint}
*/
  microcredits(): bigint;
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
* Webassembly Representation of an Aleo transaction
*
* This object is created when generating an on-chain function deployment or execution and is the
* object that should be submitted to the Aleo Network in order to deploy or execute a function.
*/
export class Transaction {
  free(): void;
/**
* Create a transaction from a string
* @param {string} transaction
* @returns {Transaction}
*/
  static fromString(transaction: string): Transaction;
/**
* Get the transaction as a string. If you want to submit this transaction to the Aleo Network
* this function will create the string that should be submitted in the `POST` data.
* @returns {string}
*/
  toString(): string;
/**
* Get the id of the transaction. This is the merkle root of the transaction's inclusion proof.
*
* This value can be used to query the status of the transaction on the Aleo Network to see
* if it was successful. If successful, the transaction will be included in a block and this
* value can be used to lookup the transaction data on-chain.
* @returns {string}
*/
  transactionId(): string;
/**
* Get the type of the transaction (will return "deploy" or "execute")
* @returns {string}
*/
  transactionType(): string;
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
* @returns {string}
*/
  to_scalar(): string;
/**
* @param {string} cipher_text
* @returns {string}
*/
  view_key_ciphertext_multiply(cipher_text: string): string;
}

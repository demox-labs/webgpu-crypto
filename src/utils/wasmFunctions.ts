import { loadWasmModule } from "../wasm-loader/wasm-loader";

export const addressToXCoordinate = async (address: string): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoAddress = aleo.Address.from_string(address);
  return aleoAddress.to_x_coordinate();
}

export const viewKeyToScalar = async (viewKey: string): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoViewKey = aleo.ViewKey.from_string(viewKey);
  return aleoViewKey.to_scalar();
}

export const bytesToAddress = async (bytes: Uint8Array): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoAddress = aleo.Address.from_bytes(bytes);
  return aleoAddress.to_string();
}

export const cipherTextToNonce = async (cipherText: string): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoCipherText = aleo.RecordCiphertext.fromString(cipherText);
  return aleoCipherText.get_nonce();
}

export const view_key_ciphertext_multiply = async(cipherText: string, viewKey: string): Promise<string> => {
  const aleo = await loadWasmModule();
  // const aleoCipherText = aleo.RecordCiphertext.fromString(cipherText);
  const aleoViewKey = aleo.ViewKey.from_string(viewKey);
  const result = aleoViewKey.view_key_ciphertext_multiply(cipherText);
  return result.toString();
}

export const addressToAffine = async (address: string): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoAddress = aleo.Address.from_string(address);
  return aleoAddress.to_affine();
}

export const addressToProjective = async (address: string): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoAddress = aleo.Address.from_string(address);
  return aleoAddress.to_projective();
}

export const addressToGroup = async (address: string): Promise<string> => {
  const aleo = await loadWasmModule();
  const aleoAddress = aleo.Address.from_string(address);
  return aleoAddress.to_group();
}

export const addFields = async (field1: string, field2: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.add_fields(field1, field2);
};

export const bulkAddFields = async (inputs1: string[], inputs2: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.add_fields(inputs1[i], inputs2[i]));
  }
  return results;
};

export const mulFields = async (field1: string, field2: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.mul_fields(field1, field2);
};

export const bulkMulFields = async (inputs1: string[], inputs2: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.mul_fields(inputs1[i], inputs2[i]));
  }
  return results;
};

export const subFields = async (field1: string, field2: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.sub_fields(field1, field2);
};

export const bulkSubFields = async (inputs1: string[], inputs2: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.sub_fields(inputs1[i], inputs2[i]));
  }
  return results;
};

export const doubleField = async (field: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.double_field(field);
};

export const bulkDoubleFields = async (inputs: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs.length; i++) {
    results.push(await aleo.Address.double_field(inputs[i]));
  }
  return results;
};

export const affineToProjective = async (group: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.affine_to_projective(group);
};

export const invertField = async (field: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.invert_field(field);
};

export const bulkInvertFields = async (inputs: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs.length; i++) {
    results.push(await aleo.Address.invert_field(inputs[i]));
  }
  return results;
};
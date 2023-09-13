import { loadWasmModule } from "../aleo-wasm-loader/wasm-loader";

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

export const fieldPoseidon = async (field: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.poseidon_hash(field);
}

export const bulkPoseidon = async (inputs: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs.length; i++) {
    results.push(await aleo.Address.poseidon_hash(inputs[i]));
  }
  return results;
}

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

export const powField = async (field: string, exponent: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.pow_field(field, exponent);
};

export const bulkPowFields = async (inputs1: string[], inputs2: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  // console.log(inputs2);
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.pow_field(inputs1[i], inputs2[i]));
  }
  return results;
}

export const sqrtField = async (field: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.sqrt(field);
};

export const bulkSqrtFields = async (inputs1: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    try {
      results.push(await aleo.Address.sqrt(inputs1[i]));
    } catch (e) {
      console.log(inputs1[i], e);
    }
  }
  return results;
};

export const addGroups = async (group1: string, group2: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.add_points(group1, group2);
};

export const bulkAddGroups = async (inputs1: string[], inputs2: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.add_points(inputs1[i], inputs2[i]));
  }
  return results;
};

export const groupScalarMul = async (group: string, scalar: string): Promise<string> => {
  const aleo = await loadWasmModule();
  return aleo.Address.group_scalar_mul(group, scalar);
};

export const bulkGroupScalarMul = async (inputs1: string[], inputs2: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.group_scalar_mul(inputs1[i], inputs2[i]));
  }
  return results;
};

export const bulkPowFields17 = async (inputs1: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(await aleo.Address.pow_field(inputs1[i], '17field'));
  }
  return results;
}

export const bulkIsOwner = async (cipherTexts: string[], viewKey: string): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const results: string[] = [];
  const aleoViewKey = aleo.ViewKey.from_string(viewKey);
  for (let i = 0; i < cipherTexts.length; i++) {
    const aleoCipherText = aleo.RecordCiphertext.fromString(cipherTexts[i]);
    results.push(aleoCipherText.isOwner(aleoViewKey).toString());
  }
  
  return results;
}

export const msm = async (groups: string[], scalars: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  return [aleo.Address.msm(groups, scalars)];
}

export const ntt = async (polynomial_coeffs: string[]): Promise<string[]> => {
  const aleo = await loadWasmModule();
  return aleo.Address.ntt(polynomial_coeffs);
}

export const random_polynomial = async (degree: number): Promise<string[]> => {
  const aleo = await loadWasmModule();
  const pow = BigInt(2 ** degree);
  return aleo.Address.get_random_dense_polynomial(pow);
}
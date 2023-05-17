export const FieldPoseidonWGSL = `
  fn poseidon_round_full(inputs: array<Field, 9>, roundNum: u32) -> array<Field, 9> {
    // Update inputs. NewInputs will be mutated.
    var newInputs: array<Field, 9> = inputs;

    // Add round constants
    for (var i = 0u; i < 9u; i++) {
      var field = newInputs[i];
      
      var sum = field_add(field, aleoRoundConstants[roundNum][i]);
      newInputs[i] = sum;
    }

    for (var i = 0u; i < 9u; i++) {
      newInputs[i] = field_pow_by_17(newInputs[i]);
    }

    // Matrix multiplication, but single threaded lol
    var result: array<Field, 9> = newInputs;
    for (var i = 0u; i < 9u; i++) {
      var accum = U256_ZERO;
      var aleoMdArray = aleoMds[i];
      for (var j = 0u; j < 9u; j++) { 
        var mult = field_multiply(newInputs[j], aleoMdArray[j]);
        accum = field_add(accum, mult);
      }
      result[i] = accum;
    }

    return result;
  };

  fn poseidon_round_half(inputs: array<Field, 9>, roundNum: u32) -> array<Field, 9> {
    // Update inputs. NewInputs will be mutated.
    var newInputs: array<Field, 9> = inputs;

    // Add round constants
    for (var i = 0u; i < 9u; i++) {
      var field = newInputs[i];
      
      var sum = field_add(field, aleoRoundConstants[roundNum][i]);
      newInputs[i] = sum;
    }

    var pow = field_pow_by_17(newInputs[0]);
    newInputs[0] = pow;

    // Matrix multiplication, but single threaded lol
    var result: array<Field, 9> = newInputs;
    for (var i = 0u; i < 9u; i++) {
      var accum = u256(array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0));
      var aleoMdArray = aleoMds[i];
      for (var j = 0u; j < 9u; j++) { 
        var mult = field_multiply(newInputs[j], aleoMdArray[j]);
        accum = field_add(accum, mult);
      }
      result[i] = accum;
    }

    return result;
  }

  fn poseidon_hash(inputs: array<Field, 9>) -> array<Field, 9> {
    var values = inputs;
    var roundNum = 0u;
    for (var i = 0u; i < 4u; i++) { 
      values = poseidon_round_full(values, roundNum);
      roundNum += 1u;
    }

    for (var i = 0u; i < 31u; i++) { 
      values = poseidon_round_half(values, roundNum);
      roundNum += 1u;
    }

    for (var i = 0u; i < 4u; i++) {
      values = poseidon_round_full(values, roundNum);
      roundNum += 1u;
    }

    return values;
  }

  fn aleo_poseidon(recordViewKey: Field) -> Field {
    var firstHashOutput = POSEIDON_FIRST_HASH_OUTPUT;
    var secondElementPlus = field_add(firstHashOutput[1], ENCRYPTION_DOMAIN);
    var thirdElementPlus = field_add(firstHashOutput[2], recordViewKey);
    firstHashOutput[1] = secondElementPlus;
    firstHashOutput[2] = thirdElementPlus;

    var secondHashOutput = poseidon_hash(firstHashOutput);
    return secondHashOutput[1];
  }
`;
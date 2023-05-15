export const FieldPoseidonWGSL = `
  fn poseidon_round(inputs: array<Field, 9>, isFull: bool, roundNum: u32) -> array<Field, 9> {
    // Update inputs. NewInputs will be mutated.
    var newInputs: array<Field, 9> = inputs;
    
    // Add round constants
    for (var i = 0u; i < 9u; i++) { 
      var field = newInputs[i];
      
      for (var j = 0u; j < 9u; j++) {
        var sum = field_add(field, aleoRoundConstants[roundNum][j]);
        newInputs[i] = sum;
      }
    }

    // If a full round, raise each input to the 17th power (aleo's sbox fn)
    if (isFull) { 
      for (var i = 0u; i < 9u; i++) {
        newInputs[i] = field_exponentiation(newInputs[i], u256(array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 17)));
      }
      // newInputs[0] = field_exponentiation(newInputs[0], U256_SEVENTEEN);
      // newInputs[1] = field_exponentiation(newInputs[1], U256_SEVENTEEN);
      // newInputs[2] = field_exponentiation(newInputs[2], U256_SEVENTEEN);
      // newInputs[3] = field_exponentiation(newInputs[3], U256_SEVENTEEN);
      // newInputs[4] = field_exponentiation(newInputs[4], U256_SEVENTEEN);
      // newInputs[5] = field_exponentiation(newInputs[5], U256_SEVENTEEN);
      // newInputs[6] = field_exponentiation(newInputs[6], U256_SEVENTEEN);
      // newInputs[7] = field_exponentiation(newInputs[7], U256_SEVENTEEN);
      // newInputs[8] = field_exponentiation(newInputs[8], U256_SEVENTEEN);
    } else {
      var pow = field_exponentiation(newInputs[0], U256_SEVENTEEN);
      newInputs[0] = pow;
    }

    // Matrix multiplication, but single threaded lol
    for (var i = 0u; i < 9u; i++) {
      var accum = U256_ZERO;
      var aleoMdArray = aleoMds[i];
      for (var j = 0u; j < 9u; j++) { 
        var mult = field_multiply(newInputs[j], aleoMdArray[j]);
        accum = field_add(accum, mult);
      }
      newInputs[i] = accum;
    }

    return newInputs;
  }

  fn poseidon_hash(inputs: array<Field, 9>) -> array<Field, 9> {
    var values = inputs;
    var roundNum = 0u;
    for (var i = 0u; i < 4u; i++) { 
      values = poseidon_round(values, true, roundNum);
      roundNum += 1u;
    }

    for (var i = 0u; i < 31u; i++) { 
      values = poseidon_round(values, false, roundNum);
      roundNum += 1u;
    }

    values = poseidon_round(values, true, roundNum);
    return values;
    values = poseidon_round(values, true, 1u);
    values = poseidon_round(values, true, 2u);
    values = poseidon_round(values, true, 3u);

    var foobar = values;
    for (var i = 0u; i < 4u; i++) {
      values = poseidon_round(foobar, true, roundNum);
      roundNum += 1u;
      return foobar;
    }

    return foobar;
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
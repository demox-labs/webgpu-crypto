export const BN254ParamsWGSL =
`
// 21888242871839275222246405745257275088548364400416034343698204186575808495617
const FIELD_ORDER: Field = Field(
    array<u32, 8>(811880050, 3778125865, 3092268470, 2172737629, 674490440, 2042196113, 1138881939, 4026531841)
);

// 21888242871839275222246405745257275088548364400416034343698204186575808495618
const FIELD_ORDER_PLUS_ONE: Field = Field(
  array<u32, 8>(811880050, 3778125865, 3092268470, 2172737629, 674490440, 2042196113, 1138881939, 4026531842)
);

// 21888242871839275222246405745257275088548364400416034343698204186575808495616
const FIELD_ORDER_MINUS_ONE: Field = Field(
  array<u32, 8>(811880050, 3778125865, 3092268470, 2172737629, 674490440, 2042196113, 1138881939, 4026531840)
);

// S-Tonelli computes different values given a big int n and a prime p. Because our prime is the
// BN254 field modulus, we have precomputed some of the values in advance to optimize for the GPU.

// 19103219067921713944291392827692070036145651957329286315305642004821462161904
const c_initial: Field = Field (
  array<u32, 8>(708577776, 2777316997, 14723051, 2398497468, 1076695326, 1091645140, 2614500206, 1918573040)
);

const s: Field = Field (
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 28)
);

// 81540058820840996586704275553141814055101440848469862132140264610111
const q: Field = Field (
  array<u32, 8>(3, 105178926, 320471707, 2231655272, 404063698, 2201912455, 2610366740, 1042241855)
);

// 40770029410420498293352137776570907027550720424234931066070132305056
const r_initial_exponent: Field = Field (
  array<u32, 8>(1, 2200073111, 160235853, 3263311284, 202031849, 1100956227, 3452667018, 521120928)
);
`;
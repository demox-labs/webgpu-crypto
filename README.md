## About

This repository is result of a joint effort of [Demox Labs](https://www.demoxlabs.xyz/), [Aleo](https://aleo.org/) and [Aztec](https://aztec.network/) to accelerate Zero Knowledge cryptography in the browser using WebGPU.

Right now, most operations are supported on BLS12-377 & BN-254.

Support operations include:
 * Field Math
 * Curve Math
 * Multi-Scalar Multiplications (MSMs)
 * Poseidon Hashes
 * Number Theoretic Transforms (NTTs aka FFTs)


## Quick Start

Ensure you have:

- [Node.js](https://nodejs.org) 16 or later installed
- [Yarn](https://yarnpkg.com) v1 or v2 installed

Then run the following:

### 1) Clone the repository

```bash
git clone https://github.com/demox-labs/webgpu-crypto && cd webgpu-crypto
```

### 2) Install dependencies

```bash
yarn
```

### 3) Development

Run a local server on localhost:4040.

```bash
yarn start
```
Note -- running webgpu functions will only work on [browsers compatible](https://caniuse.com/webgpu) with webgpu.

## Trouble Shooting

Common issues:
* If you are unable to run the webgpu benchmarks, ensure you are using a webgpu-compatible browser.
* If you are not able to load the test case data, be sure you have installed git LFS. You can either reclone the repo after installing git LFS or run `git lfs fetch && git lfs pull`.
* If you run into general npm package errors, make sure you have nodejs v16 or later installed.
* If you are using webgpu functions and getting all 0s as output, you may have hit an out of memory error in the gpu. Reduce your input size or consider breaking your computions into smaller steps.

## Disclaimer

None of this code has been audited for correctness or security. Use at your own risk.

We will additionally be releasing an npm package to make using this code easier.

## Reference

[1] Scalar-multiplication algorithms. [https://cryptojedi.org/peter/data/eccss-20130911b.pdf](https://cryptojedi.org/peter/data/eccss-20130911b.pdf)

[2] wgsl reference [https://www.w3.org/TR/WGSL/](https://www.w3.org/TR/WGSL/)
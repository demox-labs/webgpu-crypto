import { parseAddressToXCoordinate } from "../parsers/AddressParser";
import { TypescriptDecryptor } from "./TypescriptDecryptor";

describe('TypescriptDecryptor', () => {
  describe('isOwner', () => {
    it.each([
      [
        'record1qyqspxy4584rywwq3ax9332x45ehe2vvvwfmh78fgg9dfk240zrpdjg0qqlm43kh4gesyqqzq9s5xqqzqgqta7rqx7xkdkerr26zu0e4kf3q88ztt4s8et9hxzt7rg87a3hnxqkp7yhpanqp9yjda7wnjz9psnlg0zfqjlkmlgc3s2dm2n27ly46p5qkyscqqgpqqgv8cyhc5347cqu2pp3yfenxzngrwt2sxc305vwr4w72pxx9r0strq44zmwthvmdw2zss3nlhppn8ndtpyad8e7kkn7pqe7zy2sk5qq6djykgevaaghv6q9zcfuk53wzd65xjhlufskafw4uknhmxadxzpgn5hap0',
        '1908587036217162972446459217467783184880273156235225594303167470995200969701',
        'aleo1xr8udktvjhhackktfldsygjuf84fpm5k377gw4dcxhswtnyt8urq2q7xtv',
        true
      ],
      [
        'record1qyqspvmgnfdft23553uedstgkn92ujk9taj792c7aqlc3t6ppgcpmwc0qrem3v0fwfxqwqqzq9s5xqqzqgqfhjqn5tkjw3dk70dx3gsfrvevya7xcz9j78xqzeuk2mqarmefvruzx8uakqfzsnmvvap4nmt9sscz6wel2jlnh54wwuf5egazys4ap5qkyscqqgpqp7p04a9ed9np2prd5akrz4tp67erdv6plhmdlknpnnxxgu02atqfe4syqeju5j9eguzremh0t3rkac39t3qye9x8rnk45g0rqzft8sqhspeqzwf8eqg7sdplaw8wd4nvnrwszpa23pyygfue8svlmhyj5zgjlnhah',
        '89674762694835401405354684705026152384484900051666265698758937237777245203',
        'aleo1szk6r8y2nmhwnd5y3u8tlsm20u6n4cwqwzyexe4vvmfvcrfk0cqs3q0lgh',
        true
      ],
      [
        'record1qyqsp2cennua9d4a5uf2fma3s75xje7jtdexglvp2stdatz8rn4afasdqyqsqqqf5rfjq0tqql02gfjpedla89r8y6sw2put3r4k34wwt7mat9cxqgqkzscqqgpqpfgtzgv5f8asctmj85ycvf9fqc4crfs34yhxurw94p3m53kwj4cdr59rrnm7nqkvzc5ru2ef4gele86k5krpwndl3n62qw2hlk3heqgszcjrqqpqyqqpx6sdaq3c3r7n58659u0a4qpnwk0zy57fepmput0sgneuqmgczz3z908e7a92u4ldfme26plh72st02zu2judenvn3fj6fm478m3snaa3pfaxhck9rvavpnhemgze8kkk0f88qger5a6qa3jsl76z88swxs09xs',
        '89674762694835401405354684705026152384484900051666265698758937237777245203',
        'aleo1szk6r8y2nmhwnd5y3u8tlsm20u6n4cwqwzyexe4vvmfvcrfk0cqs3q0lgh',
        true
      ]
    ])('verifies owner address for private owner', (recordCiphertext: string, viewKeyScalar: string, address: string, expectedIsOwner: boolean) => {
      const decryptor = new TypescriptDecryptor();
      const address_x = parseAddressToXCoordinate(address);
      const isOwner = decryptor.isOwner(recordCiphertext, BigInt(viewKeyScalar), address, address_x);
      expect(isOwner).toEqual(expectedIsOwner);
    });
  });
});

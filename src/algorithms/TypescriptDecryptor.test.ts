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

  describe('isOwnerCheck', () => {
    xit.each([
      [
        'aleo1gcq7xlg4cxhynwtyu3ufhdyftqaz2fc40w67mla30r8ydnkqkg9qtgn8sn',
        'AViewKey1oLKTBNg58hqC2vNHwnx71e2P3ytdnEYDo8xQjkibWHHV',
        'record1qprqrcmazhq6ujdevnj83xa539vr5ff8z4amtm0lk9uvu3kwczeq5qqmev3tq9z9pcqqyqtpgvqqyqsqz6rvvxxq9zd0yrgnu7akmxr306ft0r3mlaqut26j3hcwdx0yyuqwlm0wt5k0z2zq9s6x5dwfu052l8mg59a3u6uupsa9xpauddmrsqcpvfpsqqszqqza4zsy6prts3yjeqw85f830zsksdxedhcx7n9duk705e2hy2ns4mt9xq08r38ce09kwn0fvktpjh5sj5klgfxly08r5e4ytemzzdcx6nt7edwh6g9hy6ttqz2fthmulmkkvde5d9erqzq3pmjlrhynnuzshce5qc'
      ],
      [
        'aleo1gcq7xlg4cxhynwtyu3ufhdyftqaz2fc40w67mla30r8ydnkqkg9qtgn8sn',
        'AViewKey1oLKTBNg58hqC2vNHwnx71e2P3ytdnEYDo8xQjkibWHHV',
        'record1qprqrcmazhq6ujdevnj83xa539vr5ff8z4amtm0lk9uvu3kwczeq5qgpqr2y02v3d2el807pc3ehr5y4vujd7wfcvs9nwx9phy3ua0qtf8ts6qspv9psqqszqrstazp6wyvf3nnp6q92h480m2yxp46rywghflallf3545tqntuqhtf90mv3nmsu9h8m0l6wxs0xkwh5g7ap4nsgk75am3rnhwu5w3grq93yxqqzqgq02fh0ehqz9l8zsj6as9jscwythmg80u79528mj3jyyjzcfkjcvrn76sq7qpt72kxh7w5442gm8vzpqt7mxhxducfq4s27wu3250z6zryc5mqw4j4zryg0yg3lwwphhce20a28qfe8jtvj22qfxl3hsgtqw9zea4j'
      ],
      [
        'aleo1qzxu7vw3dej44xsrgc6tak2xnfnv7m8w769eal3pc7xppvff4ypshc830u',
        'AViewKey1nkZnjy2oaPSpUMxs5VGYtY7wrY5z4KVqPUoX7EapiUuy',
        'record1qqqgmne369hx2k56qdrrf0keg6dxdnmvammgh8h7y8rccy939x5sxq8f9r3zdr20p5qqyqtpgvqqyqsqudweak0eq85a8qfg36fvs3pplau3cusqs05yhhndtur9vplu3uqyxmyr8e4qkkrheh753yaqphvy9w7ny8qhy62epy9uulqhjrhsxpqpvfpsqqszqzukwjh8dpfdp0vyj4pf262ce47yewm3cvc8afqfttttnvcv4zsqvxumx9cplj2ftspt9h7pnzfy04all90grf4mzh3qf4kuuznu60gzs2suhynrcgstzn54lgw78lcg2msk3fpuaj57g7884hza4u08fsqqzhkznk'
      ]
    ])('verifies owner address for public owner', async (address: string, viewKey: string, cipherText: string) => {
      const decryptor = new TypescriptDecryptor();
      const isOwner = await decryptor.isOwnerCheck(cipherText, viewKey, address);
      expect(isOwner).toBe(true);
    });
  });
});

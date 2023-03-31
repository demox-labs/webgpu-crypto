import { TypescriptDecryptor } from "./TypescriptDecryptor";

describe('TypescriptDecryptor', () => {
  describe('isOwnerCheck', () => {
    it.each([
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

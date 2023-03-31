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

    it.each([
      [
        'aleo16x9f0keatnecurtj4qy9sr4cxnw32ejtlskcs0zhtcxl6mp7lgrqnp9m0k',
        'AViewKey1qFFRerFtWWTf9YSWeqxNukG3T17ckAspCr6cX3SDQFaT',
        'record1qyqsqyyuvyq4neqwlj7ur0wa3qa3e92q2rzk600l8vh22n8ejrmgjvcdqptj7rvtltds5qqzq9s5xqqzqgq2645lpnvd4duhf0knjmra4na4m4yewquxpxkcsxz6v80r4tkp7z6253px0dw8qx0xtp5su6znguwj4g9dg89zt09we55pdczk75adp5qkyscqqgpqq689qdgqjrqcazkfjkt9au78vw04956j9awvhcj4jgeczy6dpsc2h0973ehk7832c99x634etq7qwnlhh9f3z0e9df2vamc4aeu7lgx9gd8pskmh80aym05lm3grjnqkwrppd7fjta4cdsaktm9kdjhtgpgtx29p3'
      ],
      [
        'aleo16x9f0keatnecurtj4qy9sr4cxnw32ejtlskcs0zhtcxl6mp7lgrqnp9m0k',
        'AViewKey1qFFRerFtWWTf9YSWeqxNukG3T17ckAspCr6cX3SDQFaT',
        'record1qyqsqhptghxsc80e44q77q9tcxfkcj0zhp4d5gv6x5xhlyrxdnzptcsvqyqsqqkvcpw37uv6ng6fs74vv3ecjgy6klzkxjz4ltcw5sdlyluhfgsfqgqkzscqqgpqq8h4hajssvjttvwfuxeqnzsd4j23ky0xnx2uhqkdx39wy4xqq2g2mksp0mt6wnzlw209en9y0rlww63mv0fc0e0yg3ytw5q3tlg8ss9qzcjrqqpqyqrh5dqx6z9m6f0s6hppzqy7j6n5ump5ehc79uycfkyy7ft28y5qpwwgsmvrspdnl78qnq2s3g09scyvk438g2m42ejskgp5gnty0g3suysnnmfr32fsr7d0nu6qm6mwjfrgrtr9xdx76gky34rsfqa9pqcde9t6yy'
      ],
      [
        'aleo1e6604lgsdp965j5r59j883n6agejd0jc0jdlyuhgnz0dxsuzduyskmfqrt',
        'AViewKey1soKFfARyjYZDZThqSAxhMpJQJEV8psHwuEGPXfiHMjuL',
        'record1qyqsq2arg3fe3zl2n80ckpetqcgwp5w0tpj7papqq75d740jlje2t3stqqupwddl4lfqqqqzq9s5xqqzqgq9syjyfvgnr2n89cgpdhe4m0lqf9e2t4s5vyr0hchvs2dv58rjwzy8ndnk8q5s84sgyyzypjtpd7vwzwxpy4a5vtnsrpkrs679cms0qyqkyscqqgpqpmvuqjp9g7sgg0zkdat4pjqttq39mfzphenz7h6rl8x2q3kv9ksyscsg2epej8ffgwe22nz4qaz7j3s92avtktrl8hrkdeuhsdmpksq4s66u9hnppht4fn4359qd3m50kcslv4uhzeeeyxzkyymvse6d5zsnqptsa'
      ]
    ])('verifies owner address for private owner', async (address: string, viewKey: string, cipherText: string) => {
      const decryptor = new TypescriptDecryptor();
      const isOwner = await decryptor.isOwnerCheck(cipherText, viewKey, address);
      expect(isOwner).toBe(true);
    });
  });
});

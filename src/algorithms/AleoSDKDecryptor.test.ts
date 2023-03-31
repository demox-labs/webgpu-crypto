import { AleoSDKDecryptor } from "./AleoSDKDecryptor";

describe('AleoSDKDecryptor', () => {
  describe('isOwner', () => {
    it('returns true when the view key is the owner of the cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsp64yyuptc3rzy67wx0pyqz3lkv4jpnl02jlp7vyhvl8nxdl6p7syqyqsqu30vwqa484agjlk42dft9xqlrvzxplhtct3muvcega2zryer0cgqzql8cjdugmcwchypqr3862f8nvddg8hcr3dgzrxcxlrhxrhcvvsgahapl6';
      const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      const result = await decryptor.isOwner(cipherText, viewKey);
  
      expect(result).toBe(true);
    });

    it('returns false when the view key is not the owner of the cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsqzqt5q5dhxs9g4v49wfgkfkacfgfysp0c6ud5w8vupzhzg8f9cqqqyqspa3jatj4f3xr9fh0xvjxp7kmn0n5pvzqnj7keu4gsal25sccywqqqzn9epqa6m6fm342zm05ekzz6k5t02z7vxe7hzehu9cpt49qk4vsjjq0yy0';
      const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      const result = await decryptor.isOwner(cipherText, viewKey);
  
      expect(result).toBe(false);
    });
  });
  
  describe('bulkIsOwner', () => {
    it('returns the owned ciphertexts of the view key', async () => {
      const ownedCiphertext = 'record1qyqsqqpvp730luh2dy8d9axpxravzuj8hdj9yxrs5r6jckqen4zxveg0qplra7rendesgqqzq9s5xqqzqgqgh3m299574xrquu05jztsalaymcwefzqhl6p6ep824362vpn9jpf8znfcyq5nhg6caxmz48lu8zc8dqfw5kyvqfw22ja3d0wp570hpqqkyscqqgpqp3wa6xmnl42hua0swue4rw0q5lhj6z3xxk4pfqgccawtmhjna3s0h8vnnrvhhxu8yfkpy37tw9wcyefttfm8m0p74f2xtc2ft45qy585uana3mgkk37nvp2zccqr3rjz7046g3rqspgdkn2njfx0z3tyzrgutvmap';
      const notOwnedCiphertext = 'record1qyqsp6pdsdz4ddy7pgyg4nnng7qkeqthm4727vtanpa8xlx5l6vef5cfqp78mx62dw9q7qqzq9s5xqqzqgqgg7xzj28mmpff3kkuuv94cv5733t09rrpqk9ga36lrnsq9ack5yn5ca5zkpvcjy8er2gjtd097nd40gedn3qgxqwk4xjvds00ytxwq5qkyscqqgpqp6d9qxer3fv2ehrzjhzr5w7zlp5a0jrkhw9gfasq6hpthrjpsls36ju80mc2lwmww398rhxn0x49k3vpukv4g56k60rjn49lsrhuggqtrmy74qwpz05wgl5jfug9ppl2728t76svey3x34wmmv2v7sg8jqsdeegr6';
      const ciphertexts = [ownedCiphertext, notOwnedCiphertext];
      const viewKey = 'AViewKey1dgDh2cndbZR2BVBmeiQ4ccS3Zt1fRd1qbvUFs4rjZ1Xu';
      const decryptor = new AleoSDKDecryptor();
      const result = await decryptor.bulkIsOwner(ciphertexts, viewKey);
  
      expect(result.length).toBe(1);
      expect(result[0]).toBe(ownedCiphertext);
    });
  });

  describe('bulkIsOwnerSlow', () => {
    it('returns the owned ciphertexts of the view key', async () => {
      const ownedCiphertext = 'record1qyqsqqpvp730luh2dy8d9axpxravzuj8hdj9yxrs5r6jckqen4zxveg0qplra7rendesgqqzq9s5xqqzqgqgh3m299574xrquu05jztsalaymcwefzqhl6p6ep824362vpn9jpf8znfcyq5nhg6caxmz48lu8zc8dqfw5kyvqfw22ja3d0wp570hpqqkyscqqgpqp3wa6xmnl42hua0swue4rw0q5lhj6z3xxk4pfqgccawtmhjna3s0h8vnnrvhhxu8yfkpy37tw9wcyefttfm8m0p74f2xtc2ft45qy585uana3mgkk37nvp2zccqr3rjz7046g3rqspgdkn2njfx0z3tyzrgutvmap';
      const notOwnedCiphertext = 'record1qyqsp6pdsdz4ddy7pgyg4nnng7qkeqthm4727vtanpa8xlx5l6vef5cfqp78mx62dw9q7qqzq9s5xqqzqgqgg7xzj28mmpff3kkuuv94cv5733t09rrpqk9ga36lrnsq9ack5yn5ca5zkpvcjy8er2gjtd097nd40gedn3qgxqwk4xjvds00ytxwq5qkyscqqgpqp6d9qxer3fv2ehrzjhzr5w7zlp5a0jrkhw9gfasq6hpthrjpsls36ju80mc2lwmww398rhxn0x49k3vpukv4g56k60rjn49lsrhuggqtrmy74qwpz05wgl5jfug9ppl2728t76svey3x34wmmv2v7sg8jqsdeegr6';
      const ciphertexts = [ownedCiphertext, notOwnedCiphertext];
      const viewKey = 'AViewKey1dgDh2cndbZR2BVBmeiQ4ccS3Zt1fRd1qbvUFs4rjZ1Xu';
      const decryptor = new AleoSDKDecryptor();
      const result = await decryptor.bulkIsOwnerSlow(ciphertexts, viewKey);
  
      expect(result.length).toBe(1);
      expect(result[0]).toBe(ownedCiphertext);
    });
  });

  describe('decrypt', () => {
    it('decrypts a single cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsp64yyuptc3rzy67wx0pyqz3lkv4jpnl02jlp7vyhvl8nxdl6p7syqyqsqu30vwqa484agjlk42dft9xqlrvzxplhtct3muvcega2zryer0cgqzql8cjdugmcwchypqr3862f8nvddg8hcr3dgzrxcxlrhxrhcvvsgahapl6';
      const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';
      const plainText = await decryptor.decrypt(cipherText, viewKey);
      // eslint-disable-next-line no-multi-str
      const expectedPlainText = '{\
        owner: aleo1dc5t7s238dt4t34nxdfc2a63xay09677eh8g9pdwdsygcw8vhq8szsn3ts.private,\
        gates: 9000000u64.private,\
        _nonce: 1854771635755848770649667346515770638820892794797847448446864043681977136001group.public\
      }';
  
      expect(stripAllWhitespace(plainText)).toBe(stripAllWhitespace(expectedPlainText));
    });
  });
});
  

function stripAllWhitespace(input: string): string {
  return input.replace(/\s+/g, '');
}
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
  
  describe('decrypt', () => {
    it('decrypts a single cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsp64yyuptc3rzy67wx0pyqz3lkv4jpnl02jlp7vyhvl8nxdl6p7syqyqsqu30vwqa484agjlk42dft9xqlrvzxplhtct3muvcega2zryer0cgqzql8cjdugmcwchypqr3862f8nvddg8hcr3dgzrxcxlrhxrhcvvsgahapl6';
      const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';
      const plainText = await decryptor.decrypt(cipherText, viewKey);
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
import { AleoSDKDecryptor } from "./AleoSDKDecryptor";

describe('AleoSDKDecryptor', () => {
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

function stripAllWhitespace(input: string): string {
  return input.replace(/\s+/g, '');
}
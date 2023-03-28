import { bech32m } from 'bech32';
import { TypescriptDecryptor } from "./TypescriptDecryptor";
import { eddsa } from 'elliptic';

describe('TypescriptDecryptor', () => {
  describe('parseAddressToBytes', () => {
    it('returns the bytes of an address', () => {
      // The provided Aleo address
      const address = 'aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr';
      const expectedBytes = new Uint8Array([
        238,199,65,152,221,117,99,56,78,5,74,6,16,118,157,150,11,147,161,249,144,209,140,218,131,231,233,52,23,158,103,16
      ]);
      const addressBytes = new TypescriptDecryptor().parseAddressToBytes(address);

      expect(addressBytes).toStrictEqual(expectedBytes);
    });
  });

  describe('parseBytesToAddress', () => {
    it('returns the address of bytes', () => {
      const expectedAddress = 'aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr';
      const bytes = new Uint8Array([
        238,199,65,152,221,117,99,56,78,5,74,6,16,118,157,150,11,147,161,249,144,209,140,218,131,231,233,52,23,158,103,16
      ]);

      const address = new TypescriptDecryptor().parseBytesToAddress(bytes);

      expect(address).toBe(expectedAddress);
    });
  });

  describe('convertAddressToGroupElement', () => {
    it('returns the group element of an address', () => {
      const address = 'aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr';
      const expectedX = '36489900580591837657964178184954727622146422113965490012106179648885933586866';
      const expectedY = '7420081926578463891039713487630974594704916067902548112580460668881211607022';
      const groupElement = new TypescriptDecryptor().convertAddressToGroupElement(address);
      expect(groupElement.getX().toString()).toBe(expectedX);
      expect(groupElement.getY().toString()).toBe(expectedY);

      const convertedAddress = new TypescriptDecryptor().convertGroupElementToAddress(groupElement);
      console.log(convertedAddress);
      // const decryptor = new TypescriptDecryptor();
      // const byteArray = Array.from(decryptor.parseAddressToBytes(address));
      // console.log(byteArray);
    
      // // Decode the address data from u5 to u8, and into an account address.
      // const twistedEdwards = new eddsa('ed25519');
      // // Convert the decoded address bytes to a Twisted Edwards group element
      // const groupElement = twistedEdwards.decodePoint((byteArray as unknown as eddsa.Bytes));
      // const bytes = twistedEdwards.en
    });
  });

  describe('convertGroupElementToAddress', () => {
    it('returns the address of a group element', () => {
      const address = 'aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr';
      const groupElement = new TypescriptDecryptor().convertAddressToGroupElement(address);

      const convertedAddress = new TypescriptDecryptor().convertGroupElementToAddress(groupElement);

      expect(convertedAddress).toBe(address);
    });
  });

  describe('isOwner', () => {
    it('returns true when the view key is the owner of the cipher text', async () => {
      // const decryptor = new TypescriptDecryptor();
      // const cipherText = 'record1qyqsp64yyuptc3rzy67wx0pyqz3lkv4jpnl02jlp7vyhvl8nxdl6p7syqyqsqu30vwqa484agjlk42dft9xqlrvzxplhtct3muvcega2zryer0cgqzql8cjdugmcwchypqr3862f8nvddg8hcr3dgzrxcxlrhxrhcvvsgahapl6';
      // const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      // const result = await decryptor.isOwner(cipherText, viewKey);
  
      // expect(result).toBe(true);
    });

    it('returns false when the view key is not the owner of the cipher text', async () => {
      // const decryptor = new TypescriptDecryptor();
      // const cipherText = 'record1qyqsqzqt5q5dhxs9g4v49wfgkfkacfgfysp0c6ud5w8vupzhzg8f9cqqqyqspa3jatj4f3xr9fh0xvjxp7kmn0n5pvzqnj7keu4gsal25sccywqqqzn9epqa6m6fm342zm05ekzz6k5t02z7vxe7hzehu9cpt49qk4vsjjq0yy0';
      // const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      // const result = await decryptor.isOwner(cipherText, viewKey);
  
      // expect(result).toBe(false);
    });
  });
});

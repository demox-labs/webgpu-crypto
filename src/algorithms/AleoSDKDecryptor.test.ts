import { AleoSDKDecryptor } from "./AleoSDKDecryptor";

describe('AleoSDKDecryptor', () => {
  describe('isOwner', () => {
    it('returns true when the view key is the owner of the cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsqpe2szk2wwwq56akkwx586hkndl3r8vzdwve32lm7elvphh37rsyqyxx66trwfhkxun9v35hguerqqpqzqrtjzeu6vah9x2me2exkgege824sd8x2379scspmrmtvczs0d93qttl7y92ga0k0rsexu409hu3vlehe3yxjhmey3frh2z5pxm5cmxsv4un97q';
      const viewKey = 'AViewKey1ccEt8A2Ryva5rxnKcAbn7wgTaTsb79tzkKHFpeKsm9NX';

      const result = await decryptor.isOwner(cipherText, viewKey);
  
      expect(result).toBe(true);
    });

    it('returns false when the view key is not the owner of the cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsqpe2szk2wwwq56akkwx586hkndl3r8vzdwve32lm7elvphh37rsyqyxx66trwfhkxun9v35hguerqqpqzqrtjzeu6vah9x2me2exkgege824sd8x2379scspmrmtvczs0d93qttl7y92ga0k0rsexu409hu3vlehe3yxjhmey3frh2z5pxm5cmxsv4un97q';
      const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      const result = await decryptor.isOwner(cipherText, viewKey);
  
      expect(result).toBe(false);
    });
  });
  
  describe('bulkIsOwner', () => {
    it('returns the owned ciphertexts of the view key', async () => {
      const ownedCiphertext = 'record1qz3zzf7zg7qm760cxjhrac4kays0850unycdme7m3xx8893ejs5qcqspv9psqqszqp746mnf8qpf6d7ngeezra8qtnnde30sxfu4sz89prqvjtc0gz7qe4ew05e7yszm2qmcpvjytxnfqvr6hqcusf076qnrrp6uz37a3mcgq93yxqqzqgqp42wp8essxfgr6xv4d3xj79zdnkzh8sugavkfe95cyv5q8d62wp2r9gaey97vylzwqvs9pu664eu9kprlgenenk9x0rl78eq2pl3mpxhc299qq28akm4mue0ag2al3net0tzs4zwfsygjj8qf3vhdpuyszc66u6k';
      const notOwnedCiphertext = 'record1qyqsptk87pd4dt5gp8a82egnwc6g0a5kxww5nutnajw37zz3g34pgzssqgqkzscqqgpqqqar0jrxwkgpa6j4aj6pz9msfag2px0fl8m7725el2jh2znz0fcdc0qgedxkz2dv22qk249apg87l4vhf5kve8lyrtcqmcagjwx985fqzcjrqqpqyq9ngee3eu30f2g7p8rfp2uujn70xfurjdv2jatsdla5hparedc9q8xzfjgsx80rpw05gple5aarnzj3lpe00a2hd9j30x6d6ggesg3prqhd24wyeeyz67lkr6gfn79g0vvwypwtwqem2ystschy9qxv5esj3q96dv';
      const ciphertexts = [ownedCiphertext, notOwnedCiphertext];
      const viewKey = 'AViewKey1d5k93DGiSHBXnZzEYTCSSnSzA9NkrXSTZEhT54ALqFcD';
      const decryptor = new AleoSDKDecryptor();
      const result = await decryptor.bulkIsOwner(ciphertexts, viewKey);
  
      expect(result.length).toBe(1);
      expect(result[0]).toBe(ownedCiphertext);
    });
  });

  describe('decrypt', () => {
    it('decrypts a single cipher text', async () => {
      const decryptor = new AleoSDKDecryptor();
      const cipherText = 'record1qyqsqpe2szk2wwwq56akkwx586hkndl3r8vzdwve32lm7elvphh37rsyqyxx66trwfhkxun9v35hguerqqpqzqrtjzeu6vah9x2me2exkgege824sd8x2379scspmrmtvczs0d93qttl7y92ga0k0rsexu409hu3vlehe3yxjhmey3frh2z5pxm5cmxsv4un97q';
      const viewKey = 'AViewKey1ccEt8A2Ryva5rxnKcAbn7wgTaTsb79tzkKHFpeKsm9NX';
      const plainText = await decryptor.decrypt(cipherText, viewKey);
      // eslint-disable-next-line no-multi-str
      const expectedPlainText = `
      {
        owner: aleo1j7qxyunfldj2lp8hsvy7mw5k8zaqgjfyr72x2gh3x4ewgae8v5gscf5jh3.private,
        microcredits: 1500000000000000u64.private,
        _nonce: 3077450429259593211617823051143573281856129402760267155982965992208217472983group.public
      }
      `;
  
      expect(stripAllWhitespace(plainText)).toBe(stripAllWhitespace(expectedPlainText));
    });
  });
});
  

function stripAllWhitespace(input: string): string {
  return input.replace(/\s+/g, '');
}
import { addressToXCoordinate, bytesToAddress, viewKeyToScalar } from "./helper";

describe('helper', () => {
  describe('addressToXCoordinate', () => {
    it.each([
      ["aleo19ww3ekwpey2hu7wl5qx42nmajr8lrre49y34axtkpfen3ttpvygs3kdxmw", "7861376730610257387365356374468253089179341461915214956037840476249878469931field"],
      ["aleo135gwscehwgkecnrh3nlj3eefh6xq2p8pxzh4xdhmpevn24k90ypsd4kce2", "1572089008791902793871872918413366858350187239173770875335286338153704067213field"],
      ["aleo1uwr7xnpraqxp3n0dssy4t5lxpfhthg9z55rh82ey5sryxr3luqyqvzqas3", "4014711725694245909088977175391072928052841749563878781134887696252562278371field"],
    ])('returns the x coordinate of an address', async (address: string, expectedX: string) => {
      const xCoordinate = await addressToXCoordinate(address);

      expect(xCoordinate.toString()).toBe(expectedX);
    });
  });

  describe('viewKeyToBigInt', () => {
    it.each([
      ['AViewKey1kYoQTZaw3pLCftkg7hJK4CWueoXBtNsAvLfCzfKdcDs9', '2105472318797518019008282836782879193473746637990348041120483391303970643063scalar'],
      ['AViewKey1nm4nZ9iv5dTRBgkat2eCcntngVfTa22ff2AxZvqxy8W6', '1710714648966265844014439100598120743323569799256680801665439323778779363224scalar'],
      ['AViewKey1rpdJhYRsW7UxBMt2Fu2t9M6hEB47Faj327HSqEd8wFnw', '309247455142658734268774920389137489007712325409707171154814802599447695573scalar']
    ])('returns the big int of a view key', async (viewKey: string, expectedBigInt: string) => {
      const bigint = await viewKeyToScalar(viewKey);

      expect(bigint.toString()).toBe(expectedBigInt);
    });
  });

  describe('bytesToAddress', () => {
    it.each([
      ['aleo1v7mr7ax3vj95m6nxrvg3qexff9s2gz05j7mq8aruwaa9mvr8zcpqwkl05m', [103, 182, 63, 116, 209, 100, 139, 77, 234, 102, 27, 17, 16, 100, 201, 73, 96, 164, 9, 244, 151, 182, 3, 244, 124, 119, 122, 93, 176, 103, 22, 2]],
      ['aleo1wd5dl2chdj4egtejx37ykzwgnpzcg8ydfwkpfuvgw958flkmn5ps0mcqsr', [115, 104, 223, 171, 23, 108, 171, 148, 47, 50, 52, 124, 75, 9, 200, 152, 69, 132, 28, 141, 75, 172, 20, 241, 136, 113, 104, 116, 254, 219, 157, 3]],
      ['aleo19dplwfpcjwtheszd9eghfw0uhl2zhdj5hc3jcve6zjl8kvhuws8s6fwp6d', [43, 67, 247, 36, 56, 147, 151, 124, 192, 77, 46, 81, 116, 185, 252, 191, 212, 43, 182, 84, 190, 35, 44, 51, 58, 20, 190, 123, 50, 252, 116, 15]]
    ])('returns the address of a byte array', async (expectedAddress: string, bytes: number[]) => {
      const byteArray = new Uint8Array(bytes);
      const address = await bytesToAddress(byteArray);

      expect(address).toBe(expectedAddress);
    });
  });
});
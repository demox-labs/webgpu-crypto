import { curve, eddsa } from "elliptic";
import { TypescriptDecryptor } from "./TypescriptDecryptor";
import BN from 'bn.js';

describe('TypescriptDecryptor', () => {
  describe('parseAddressToBytes', () => {
    it.each([
      ['aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr', [238,199,65,152,221,117,99,56,78,5,74,6,16,118,157,150,11,147,161,249,144,209,140,218,131,231,233,52,23,158,103,16]],
      ["aleo1vwjupczk0rrpxe7qdawczrj4dcke8nfh90v4enm8x2txcky20uzq7d2wew", [99, 165, 192, 224, 86, 120, 198, 19, 103, 192, 111, 93, 129, 14, 85, 110, 45, 147, 205, 55, 43, 217, 92, 207, 103, 50, 150, 108, 88, 138, 127, 4]],
      ["aleo1tzegx854azlqf6ecr50f3slp9ezd0l80av2evufl8cc59ft2zuqs2fva8m", [88, 178, 131, 30, 149, 232, 190, 4, 235, 56, 29, 30, 152, 195, 225, 46, 68, 215, 252, 239, 235, 21, 150, 113, 63, 62, 49, 66, 165, 106, 23, 1]]
    ])('returns the bytes of an address', (address: string, u8_bytes: number[]) => {
      // The provided Aleo address
      const expectedBytes = new Uint8Array(u8_bytes);
      const addressBytes = new TypescriptDecryptor().parseAddressToBytes(address);

      expect(addressBytes).toStrictEqual(expectedBytes);
    });
  });

  describe('parseBytesToAddress', () => {
    it.each([
      ["aleo1jjslzr5jfnzr57z8acj7q5h6l24s48h5ma4vtnh6ct2pdvvvdszsdtkd7d", [148, 161, 241, 14, 146, 76, 196, 58, 120, 71, 238, 37, 224, 82, 250, 250, 171, 10, 158, 244, 223, 106, 197, 206, 250, 194, 212, 22, 177, 140, 108, 5]],
      ['aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr', [238,199,65,152,221,117,99,56,78,5,74,6,16,118,157,150,11,147,161,249,144,209,140,218,131,231,233,52,23,158,103,16]],
      ["aleo1amfrfdxf7squc6x9drup9eth2tnvzas0t6e69arzqrawx0rkxyyqcpdu34", [238, 210, 52, 180, 201, 244, 1, 204, 104, 197, 104, 248, 18, 229, 119, 82, 230, 193, 118, 15, 94, 179, 162, 244, 98, 0, 250, 227, 60, 118, 49, 8]]
    ])('returns the address of bytes', (expectedAddress: string, u8_bytes: number[]) => {
      const bytes = new Uint8Array(u8_bytes);

      const address = new TypescriptDecryptor().parseBytesToAddress(bytes);

      expect(address).toBe(expectedAddress);
    });
  });

  describe('convertBytesToFieldElement', () => {
    it.each([
      ["1700440664509915629156384240174020946422026149620106558234406576902064953438", [94, 216, 157, 217, 173, 200, 141, 132, 106, 186, 119, 118, 245, 151, 96, 72, 111, 99, 141, 156, 188, 141, 89, 155, 180, 171, 127, 183, 81, 106, 194, 3]],
      ["5883990797189452420561585983504051149470733938537857687533897386409181800591", [143, 104, 31, 85, 78, 29, 168, 226, 78, 95, 6, 211, 249, 24, 39, 49, 113, 144, 28, 96, 58, 73, 105, 123, 24, 192, 35, 142, 132, 56, 2, 13]],
      ["2657621072155672402427744557655309729328002490163816725285270146089092865370", [90, 93, 75, 11, 124, 239, 208, 80, 95, 227, 7, 17, 60, 248, 188, 46, 151, 114, 129, 28, 124, 227, 191, 244, 179, 133, 54, 69, 4, 41, 224, 5]]
    ])('returns the field element of bytes', (expected: string, byteArray: number[]) => {
      const bytes = new Uint8Array(byteArray);
      const expectedFieldElement = new BN(expected);
      console.log(expectedFieldElement);

      const fieldElement = new TypescriptDecryptor().convertBytesToFieldElement(bytes);

      expect(fieldElement.toString()).toBe(expectedFieldElement.toString());
    });
  });

  describe('convertXCoordinateToGroupElement', () => {
    it('returns the group element of an x coordinate', () => {

    });
  });

  describe('convertAddressToGroupElement', () => {
    it.each([
      // this one converts correctly, but isn't the same as the rest, which were taken directly from the aleo rust code
      // ['aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr', '36489900580591837657964178184954727622146422113965490012106179648885933586866', '7420081926578463891039713487630974594704916067902548112580460668881211607022'],
      ["aleo180rmftfwd00ulau8sxewggqekl5fmt6x78qsxw2mp6ky7lwh9crqngjlnz", "2796639310327748181972752445744508063519183040156292323025309617124682286907", "3801574293047120560537150275967779217524393942673614924193995053713799422782"],
      ["aleo1v07dayg8x3rt2ja8d77jfr2sc0cy6mvtymxrzvljvnm2rcr7yqfqp3hj9z", "8199046056696092045078324291393824985954297024782211557898961966814633852003", "7483315349924856019195884341413919804116278178252246881364554614363420654514"]
    ])('returns the group element of an address', (address: string, expectedX: string, expectedY: string) => {
      const groupElement = new TypescriptDecryptor().convertAddressToGroupElement(address);
      expect(groupElement.getX().toString()).toBe(expectedX);
      expect(groupElement.getY().toString()).toBe(expectedY);

      const convertedAddress = new TypescriptDecryptor().convertGroupElementToAddress(groupElement);
      console.log(convertedAddress);
    });
  });

  describe('convertGroupElementToAddress', () => {
    it.each([
      ["aleo180rmftfwd00ulau8sxewggqekl5fmt6x78qsxw2mp6ky7lwh9crqngjlnz", "2796639310327748181972752445744508063519183040156292323025309617124682286907", "3801574293047120560537150275967779217524393942673614924193995053713799422782"],
      ["aleo1v07dayg8x3rt2ja8d77jfr2sc0cy6mvtymxrzvljvnm2rcr7yqfqp3hj9z", "8199046056696092045078324291393824985954297024782211557898961966814633852003", "7483315349924856019195884341413919804116278178252246881364554614363420654514"]
    ])('returns the address of a group element', (address: string, x: string, y: string) => {
      const twistedEdwards = new eddsa('ed25519');
      const point = twistedEdwards.curve.point(new BN(x), new BN(y));
      const groupElement = new TypescriptDecryptor().convertAddressToGroupElement(address);
      console.log('test' + point);
      expect(point.getX().toString()).toBe(groupElement.getX().toString());
      expect(point.getY().toString()).toBe(groupElement.getY().toString());
    });
  });

  describe('getXCoordinateFromAddress', () => {
    xit.each([
      ["aleo19ww3ekwpey2hu7wl5qx42nmajr8lrre49y34axtkpfen3ttpvygs3kdxmw", "7861376730610257387365356374468253089179341461915214956037840476249878469931"],
      ["aleo135gwscehwgkecnrh3nlj3eefh6xq2p8pxzh4xdhmpevn24k90ypsd4kce2", "1572089008791902793871872918413366858350187239173770875335286338153704067213"],
      ["aleo1uwr7xnpraqxp3n0dssy4t5lxpfhthg9z55rh82ey5sryxr3luqyqvzqas3", "4014711725694245909088977175391072928052841749563878781134887696252562278371"],
      ['aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr', '8384163349953520065140198398291114165166653773871822000166372971829688278532']
    ])('returns the x coordinate of an address', (address: string, expectedX: string) => {
      const xCoordinate = new TypescriptDecryptor().getXCoordinateFromAddress(address);

      expect(xCoordinate.toString()).toBe(expectedX);
    });
  });

  describe('getAddressFromXCoordinate', () => {
    it('returns the address of an x coordinate', () => {
      const expectedAddress = 'aleo1amr5rxxaw43nsns9fgrpqa5ajc9e8g0ejrgcek5rul5ng9u7vugq63jtfr';
      const xCoordinate = '36489900580591837657964178184954727622146422113965490012106179648885933586866';
      const xCoordinateBN = new BN(xCoordinate);
      const address = new TypescriptDecryptor().getAddressFromXCoordinate(xCoordinateBN);

      expect(address).toBe(expectedAddress);
    });
  });

// 4008090371508691508
// 2144905518123484806
// 14637465661366469432
// 665394219478499013

  describe('isOwnerCheck', () => {
    xit('returns true if owner', () => {
      // viewkey = "AViewKey1dk3VCpG8zyMRisULLj9eRdnoJVX35zRWRnCxG8pmCmpL"
      const address = "aleo1q3pf9trucs93umvnwehdplrf3m9cauz5caxggfw73ndl4rqheggs6jam0p";
      const ciphertext = "record1qqzy9y4v0nzqk8ndjdmxa58udx8vhrhs2nr5epp9m6xdh75vzl9pzq8e4u3ew763q5qqyqtpgvqqyqsqe5cw7rxpp5q324mh65cyulw439ldvlc6x5pmpea6y8lmz65wlsxt50aux9yumulhfdz0fr9rlt92dlnax7c7pq8st6tmv24szvdkyzqpvfpsqqszqr7xlpcqcye9kz4zd6kq562fq3rx7m8l4tgga4nlwepy87jc0kvssrz56ufvhgcpctpwzcxvczmltfm4j2ktfse95t9f756scer8necqah9zq46n6yn0z929nyuxy3z63wxkvtdg8uxgh9lc0jg49ppttuqsatqda6";
      const isOwner =  new TypescriptDecryptor().isOwnerCheck(address, ciphertext);
      // const dataView = new DataView(bytes.buffer);
      // const owner = dataView.getUint8(0);
      // console.log(owner);
      // const textDecoder = new TextDecoder();
      // console.log(textDecoder.decode(bytes));

      expect(isOwner).toBe(true);
    });
  });

  describe('isOwner', () => {
    xit('returns true when the view key is the owner of the cipher text', async () => {
      // const decryptor = new TypescriptDecryptor();
      // const cipherText = 'record1qyqsp64yyuptc3rzy67wx0pyqz3lkv4jpnl02jlp7vyhvl8nxdl6p7syqyqsqu30vwqa484agjlk42dft9xqlrvzxplhtct3muvcega2zryer0cgqzql8cjdugmcwchypqr3862f8nvddg8hcr3dgzrxcxlrhxrhcvvsgahapl6';
      // const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      // const result = await decryptor.isOwner(cipherText, viewKey);
  
      // expect(result).toBe(true);
    });

    xit('returns false when the view key is not the owner of the cipher text', async () => {
      // const decryptor = new TypescriptDecryptor();
      // const cipherText = 'record1qyqsqzqt5q5dhxs9g4v49wfgkfkacfgfysp0c6ud5w8vupzhzg8f9cqqqyqspa3jatj4f3xr9fh0xvjxp7kmn0n5pvzqnj7keu4gsal25sccywqqqzn9epqa6m6fm342zm05ekzz6k5t02z7vxe7hzehu9cpt49qk4vsjjq0yy0';
      // const viewKey = 'AViewKey1ojV2FEoeJpRHusKeU4E6HvGAhQDhFueaQvF6oBJTrCYB';

      // const result = await decryptor.isOwner(cipherText, viewKey);
  
      // expect(result).toBe(false);
    });
  });
});

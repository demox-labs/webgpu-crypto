import { addFields, addressToAffine, addressToXCoordinate, bytesToAddress, cipherTextToNonce, viewKeyToScalar } from "./helper";

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
      ['AViewKey1rpdJhYRsW7UxBMt2Fu2t9M6hEB47Faj327HSqEd8wFnw', '309247455142658734268774920389137489007712325409707171154814802599447695573scalar'],
      ['AViewKey1dgDh2cndbZR2BVBmeiQ4ccS3Zt1fRd1qbvUFs4rjZ1Xu', '290071700847650793736018922990556210270687847828366881912029897283051372561scalar']
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

  describe('ciperTextNonce', () => {
    it.each([
      [
        'record1qyqsqznpsugytlzjlmwa4ph9f620e44m0d5lvxteczyn26g2ewe5ymqvqpmuhezn8jcq5qqzq9s5xqqzqgqrpcrdrdmzl3elxuq559fpn8c8qkvteegx4h5n7hhrfsfy4utswr4kmzed72qfgtw372u7nwj7s0lmwy4zvgg3fwdc3qldds9cx8saqqqkyscqqgpqqd8gvs4rg35hf77u3yeyjjyhwswvmw0844962w0q0ph4claswzsfpnrnm380ce7k2lsm2altphvx5mnfx9hcpt7y3rl8504x2nmj8uy25l4txqu0zf4tlp7x7zadjt2xlu46ac9kd07hn4x7ngev88ma2rqqvdmr8',
        '5805798880562779867421891619304004909223021394739424149671824560040641789610group'
      ],
      [
        'record1qyqsp5d37exam4q9py09ftt7gne2xft57gcwwl75kz2vedj8huvq2fsxqyqsq7xnvkr20pj09l6rwvjd3tt7xmpej2k62aqf84vxnay8hls7sggfqgqkzscqqgpqpwxhqnvweshdzcja22hvg4utclhdm7sjmqg5zm30u8lrulcsmzg0uev5rd6tc2mrnxkcxxwnrvmgghnzsqfl4n2kewvtkd66c7t95s8qzcjrqqpqyq9rfh0gflwf563nmkrx6pq6huh79hvpft3rm2amgdu4teu9cfzupmarg56p73nd3l09mqqzu0h9jj6kpageeej5775htpvug927we3sa6z76wclst836272234ydwekf6kefxv3350nnz5gufr8re28mycgdd0l4v',
        '3879094293319221702222284459898244046604190069373278658101168595158716079848group'
      ],
      [
        'record1qyqsqvtkx825anv3ehlnnvr6gapw4rryr67ladsnlqye6zrm0hvgn5s2qpuftv6hkw9quqqzq9s5xqqzqgqql5dptt006z9j8rwdy6fv2u2trn849nhgcpcfzhngq07lged3jywdr4g77fataxzr03gs86ujjpfe5as4fxsdudwnp9gr8slcpk04puqkyscqqgpqph2llwm55nlmfdezuuqe86jrt2ckk47lln2vmu5nza7fv6ac4lsyncnxdctye00dhyyl7jsxkshq0zkum6zzcmlqmnsv3s6l8vn2e5ps9pvf9w7nntz0f5nu6vljjd0fd92aklsfqa4jtthdwd83kxkgjys6vqlpa',
        '8384881220057642545728502405300265352890458140372558862955255602587854537986group'
      ]
    ])('returns the nonce of a cipher text', async (ciphertext: string, expectedNonce: string) => {
      const nonce = await cipherTextToNonce(ciphertext);

      expect(nonce).toBe(expectedNonce);
    });
  });

  describe('addressToAffine', () => {
    xit.each([
      [
        'aleo1eel72pm9h3pnrvqljxufuwrjl2xm72kuey9yesdx9zhfp9k7fuqsy6e74u',
        '593430013618361100943179780212461601461421878415007236912071184111391571918group'
      ],
      [
        'aleo1saytxmv9e95zsxd6k2fckynlqya5qrn2ae96ykutalep3rjl55zsm6gmhe',
        '2553753505447570153918405030947763499600472491273697564768530900260129818759group'
      ]
    ])('returns the affine of an address', async (address: string, expectedAffine: string) => {
      const affine = await addressToAffine(address);

      expect(affine).toEqual(expectedAffine);
    });
  });

  describe('addFields', () => {
    it.each([
      ['1field', '2field', '3field'],
      ['8444461749428370424248824938781546531375899335154063827935233455917409239040field', '2field', '1field'],
      ['1684996666696914987166688442938726917102321526408785780068975640575field', '1684996666696914987166688442938726917102321526408785780068975640575field', '3369993333393829974333376885877453834204643052817571560137951281150field']
    ])('adds two fields', async (input1: string, input2: string, expected: string) => {
      const result = await addFields(input1, input2);

      expect(result).toBe(expected);
    });
  });
});
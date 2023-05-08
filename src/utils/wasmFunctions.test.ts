import { addFields, addressToAffine, addressToXCoordinate, affineToProjective, bytesToAddress, cipherTextToNonce, doubleField, viewKeyToScalar } from "./wasmFunctions";

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
        'record1qyqsptdcxdt0vs85n2stnk2g3ata3hyjfe40rpxddkz5jh9tg59q7jgyqgqkzscqqgpqp7tefuhme8vdcnf35zz8l8fcs2gqcy2clp6467wu2wnn64wecusqrqynp8nzk47s743ynk9zxknwkzpqf9lfjgytvx4cpzuue2yg8yxqzcjrqqpqyqqqtpmts645p007qlxsmcu6rdwksj4jqdcjcyrelwsyvcfx0ukspzd30g3yvdcsht2z97gc2q89s44un4v0zun7kv2dvnwex870psrqn4hqp0nx6m5p5u308l5rw8xkjd58m2v39v5h5cyuy7jdlyg03uswhsyhet',
        '6761668960549883031850161493073197274870812380296685252039350092427359412438group'
      ],
      [
        'record1qyqspgzm85vhf88zz8vxrcsmcpawdv8qnr8h4kt7x8cce4gm6wg7nlgpqgqkzscqqgpqp573mz0cgtu9ss0f9wpa6e2hthwulz2jfe3u9g9za8wgej53szcdwff6wcz4m73t2y72y37lnreysnvpxrsvlfqaayxcfwhwdlz6puzqzcjrqqpqyqx98j0akraxg4kn4w9k4kp42njpagjt6tg4n5rut5g9fnkxrhkyq0ttttxvkpcg6k97z3qtn8zw5d78urkme6ah9v7mpdn6luazh8esl3aky0symph86cg8lrvzj78raav7pwr2mz427qgxx0lr39x6xycg5qk6mj',
        '3653199957988608842910835227580927673713257093686825567904116271644865181383group'
      ]
    ])('returns the nonce of a cipher text', async (ciphertext: string, expectedNonce: string) => {
      const nonce = await cipherTextToNonce(ciphertext);

      expect(nonce).toBe(expectedNonce);
    });
  });

  describe('addressToAffine', () => {
    it.each([
      [
        'aleo1eel72pm9h3pnrvqljxufuwrjl2xm72kuey9yesdx9zhfp9k7fuqsy6e74u',
        'Affine(x=593430013618361100943179780212461601461421878415007236912071184111391571918, y=7456516280070304814969484579338471748404346668478774495604066268427653299871)'
      ],
      [
        'aleo1saytxmv9e95zsxd6k2fckynlqya5qrn2ae96ykutalep3rjl55zsm6gmhe',
        'Affine(x=2553753505447570153918405030947763499600472491273697564768530900260129818759, y=145333338678725956547711771634725781486825626801088262993087180424439333749)'
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
  
  describe('doubleField', () => {
    it.each([
      ['1field', '2field'],
      ['8444461749428370424248824938781546531375899335154063827935233455917409239040field', '8444461749428370424248824938781546531375899335154063827935233455917409239039field'],
      ['1684996666696914987166688442938726917102321526408785780068975640575field', '3369993333393829974333376885877453834204643052817571560137951281150field']
    ])('doubles the field', async (input: string, expected: string) => {
      const result = await doubleField(input);

      expect(result).toBe(expected);
    });
  });
});

import { convertXCoordinateToAddress, parseAddressToXCoordinate, parseViewKeyToScalar } from "./AddressParser";

describe('AddressParser', () => {
  describe('parseAddressToXCoordinate', () => {
    it.each([
      [
        'aleo1xr8udktvjhhackktfldsygjuf84fpm5k377gw4dcxhswtnyt8urq2q7xtv',
        '2826153323360709902210507492352501050408684853149149403539658328382212853552'
      ],
      [
        'aleo1szk6r8y2nmhwnd5y3u8tlsm20u6n4cwqwzyexe4vvmfvcrfk0cqs3q0lgh',
        '675308645097637656805864707926756940717984767614837689901657352478681836928'
      ],
      [
        'aleo1nn2htg0tcf2j4jxmdqlt8x7ln23wav938r3glernsqt83u3c5czq2mmd3p',
        '2102941041835522765063869490308094100677831793826356135439686213042972251548'
      ],
      [
        'aleo1xr8udktvjhhackktfldsygjuf84fpm5k377gw4dcxhswtnyt8urq2q7xtv',
        '2826153323360709902210507492352501050408684853149149403539658328382212853552'
      ],
      [
        'aleo14rwswfzqwmtym372kd2amu7jzw6xmkz38gwdg9j6thv9g544kvgqhxu2s2',
        '7554522637667228564357761306560014769896981682593547110129454045518044323240'
      ]
    ])('should return the x coordinate for an address', (address: string, expectedXCoordinate: string) => {
      const xCoordinate = parseAddressToXCoordinate(address);
      expect(xCoordinate.toString()).toEqual(expectedXCoordinate);
    });
  });

  describe('parseViewKeyToXCoordinate', () => {
    it.each([
      [
        'AViewKey1dS9uE4XrARX3m5QUDWSrqmUwxY3PFKVdMvPwzbtbYrUh',
        '1047782004112991658538528321810337177976429471185056028001320450422875039246'
      ],
      [
        'AViewKey1sbprcE2wG2nh1kYbDLU42FFKmGnxxKUq8oNsMaAU9ByS',
        '752209293482294422588181595597784470577861263737725847909891016010783237344'
      ]
    ])('should return the x coordinate for an viewKey', (viewKey: string, expectedXCoordinate: string) => {
      const xCoordinate = parseViewKeyToScalar(viewKey);
      expect(xCoordinate.toString()).toEqual(expectedXCoordinate);
    });
  });

  describe('convertXCoordinateToAddress', () => {
    it.each([
      [
        'aleo1xr8udktvjhhackktfldsygjuf84fpm5k377gw4dcxhswtnyt8urq2q7xtv',
        '2826153323360709902210507492352501050408684853149149403539658328382212853552'
      ],
      [
        'aleo1szk6r8y2nmhwnd5y3u8tlsm20u6n4cwqwzyexe4vvmfvcrfk0cqs3q0lgh',
        '675308645097637656805864707926756940717984767614837689901657352478681836928'
      ],
      [
        'aleo1nn2htg0tcf2j4jxmdqlt8x7ln23wav938r3glernsqt83u3c5czq2mmd3p',
        '2102941041835522765063869490308094100677831793826356135439686213042972251548'
      ],
      [
        'aleo1xr8udktvjhhackktfldsygjuf84fpm5k377gw4dcxhswtnyt8urq2q7xtv',
        '2826153323360709902210507492352501050408684853149149403539658328382212853552'
      ]
    ])('should return the x coordinate for an address', (expectedAddress: string, XCoordinate: string) => {
      const address = convertXCoordinateToAddress(XCoordinate);
      expect(address).toEqual(expectedAddress);
    });
  });
});
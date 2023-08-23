import { convertCiphertextToDataView, getNonce, isOwnerPublic } from "./RecordParser";

describe('RecordParser', () => {
  describe('convertCiphertextToDataView', () => {
    it('should convert a string to a DataView', () => {
      const ciphertext = 'record1qp90y0z0glrncvwadu7hk5na0utg9sc33lj2a7hh3l7wdnph7gtsgq9lm6e2c6yxpgqqyqtpgvqqyqsqv8fwzmg2ha6pm0drmu29jeu96mjnlyupf5v206pqdyjx2e5c7y8z8cwx90k0f2huqw3dfg7qc7rumh40x4p9mrrmc9ja50h5l6y9xrspvfpsqqszqzczsqnx404dy4r0fl4skj5q70zhav6q6366s2nh8y5934mtcvgspm6mussehflx2yrukk6nypdldksenkcwlp8xqtsjxqscmytdlcgvt4yfpvsd6sz2z94uxl9mfn8ympak7fj4z7umfmwlt955es7tqqfq629spq';

      const dataView = convertCiphertextToDataView(ciphertext);

      expect(dataView.byteLength).toBe(217);
    });
  });

  describe('isOwnerPublic', () => {
    it('should return true for a public owned record', () => {
      const ciphertext = 'record1qp90y0z0glrncvwadu7hk5na0utg9sc33lj2a7hh3l7wdnph7gtsgq9lm6e2c6yxpgqqyqtpgvqqyqsqv8fwzmg2ha6pm0drmu29jeu96mjnlyupf5v206pqdyjx2e5c7y8z8cwx90k0f2huqw3dfg7qc7rumh40x4p9mrrmc9ja50h5l6y9xrspvfpsqqszqzczsqnx404dy4r0fl4skj5q70zhav6q6366s2nh8y5934mtcvgspm6mussehflx2yrukk6nypdldksenkcwlp8xqtsjxqscmytdlcgvt4yfpvsd6sz2z94uxl9mfn8ympak7fj4z7umfmwlt955es7tqqfq629spq';
      const dataView = convertCiphertextToDataView(ciphertext);

      const publicOwner = isOwnerPublic(dataView);

      expect(publicOwner).toBe(true);
    });

    it('should return false for a private owned record', () => {
      const ciphertext = 'record1qyqsplgtkd7mulyahq0ghzfkre898uzglr0t8s2mmxl4c4n8q8c5e5q8qptkz0tv3mwqxqqzq9s5xqqzqgqrvz5z8ywh56nw084z94m0thm5v2kcdlwwnsg0dy5fnj8xgedmuzl5stummk6m6u28hky5x24k4ypfjtmp5rdax4gw4dnaw5kgf20dpgqkyscqqgpqqqhqjf5r3fexvd083xvx07csxcj47dhxz25thrkrwk7ucxfuhqc2s3ze2sw3e5nwvx229f9qnmzz55umc247u68pudqv44cwu6lzwqrlc4p7pkmhkkkaa6zrj469cz9qynu0lklejulfu3grry7wpht0szga6s39c';
      const dataView = convertCiphertextToDataView(ciphertext);

      const publicOwner = isOwnerPublic(dataView);

      expect(publicOwner).toBe(false);
    });
  });

  describe('getNonce', () => {
    it('should return the nonce for a record', () => {
      const ciphertext = 'record1qrcgv7yd68ryet69ec50shjcl54rqa7ghsxzs22k7yetxsgfq7rsqqp5u4gaqaplq5qqyqtpgvqqyqsqzafa6agrqh97flqc0vkj4hn92jwy8jfqd799ygphg77n2cldvvp0s0hdf4fym0zedvhzs2cup540ydslksfngkzv7qeuhe7j5x6cvqqpvfpsqqszqpvucnr8asgwfp2vpg2upncvumjz07ltvg9r0kslulgwpne0w9kqnpj469qdj77ztzv5frw640f76qs2und5fqlgp3qsc43xkdjfyzcfpln00ldkrdmrljajfvheq80ncc7jtuxkvvet2zjx2958l4pz0yxq6v054n';
      const dataView = convertCiphertextToDataView(ciphertext);
      const expectedNonce = '5641783066139440241502253189471532734416076078221191010077573525863906403855';

      const nonce = getNonce(dataView);

      expect(nonce.toString()).toBe(expectedNonce);
    });
  });
});
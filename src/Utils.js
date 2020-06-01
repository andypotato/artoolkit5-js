import axios from 'axios';

export default class Utils {

  static async fetchRemoteData(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return new Uint8Array(response.data);
    }
    catch(error) {
      throw error;
    }
  }

  static string2Uint8Data(string) {
    let data = new Uint8Array(string.length);
    for(let i = 0; i < data.length; i++) {
      data[i] = string.charCodeAt(i) & 0xff;
    }
    return data;
  }

  static uint8Data2String(uint8Data) {
    return String.fromCharCode.apply(String, uint8Data);
  }

  static parseMultiFile(bytes) {
    // Parse a multi-marker file to an array of file-paths
    const str = Utils.uint8Data2String(bytes);

    const lines = str.split('\n');

    const files = [];

    let state = 0; // 0 - read,
    let markers = 0;

    lines.forEach(function (line) {
      line = line.trim();
      if (!line || line.startsWith('#')) return; // FIXME: Should probably be `if (line.indexOf('#') === 0) { return; }`

      switch (state) {
        case 0:
          markers = +line;
          state = 1;
          return;
        case 1: // filename or barcode
          if (!line.match(/^\d+$/)) {
            files.push(line);
          }
        case 2: // width
        case 3: // matrices
        case 4:
          state++;
          return;
        case 5:
          state = 1;
          return;
      }
    });

    return files;
  }
}

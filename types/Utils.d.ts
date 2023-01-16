export default class Utils {
    /**
     * Function to fetch data as Uint8Array.
     * @param {string} url
     * @returns
     */
    static fetchRemoteData(url: string): Promise<Uint8Array>;
    /**
     * Function to retrieve Uint8Array data from a string.
     * @param {string} string
     * @returns {Uint8Array}
     */
    static string2Uint8Data(string: string): Uint8Array;
    /**
     * Coinvert Uint8Array to a String object.
     * @param {Uint8Array} uint8Data
     * @returns {string}
     */
    static uint8Data2String(uint8Data: Uint8Array): string;
    /**
     * Function used by the Multi Marker loader.
     * @param {Uint8Array} bytes
     * @returns
     */
    static parseMultiFile(bytes: Uint8Array): any[];
}
//# sourceMappingURL=Utils.d.ts.map
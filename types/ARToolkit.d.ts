export default class ARToolkit {
    static get UNKNOWN_MARKER(): number;
    static get PATTERN_MARKER(): number;
    static get BARCODE_MARKER(): number;
    static get NFT_MARKER(): number;
    markerCount: number;
    multiMarkerCount: number;
    cameraCount: number;
    version: string;
    /**
     * Init the ARToolKit space with all the Emscripten instanced methods.
     * It creates also a global artoolkit variable.
     * @returns {ARToolkit}
     */
    init(): ARToolkit;
    instance: any;
    _decorate(): void;
    /**
     * Load the camera parameter file. You need to provide a valid url.
     * @param {string} urlOrData
     * @returns
     */
    loadCamera(urlOrData: string): Promise<any>;
    /**
     * Add a Marker to ARToolkit instance. Used by the ARController class.
     * It is preferred to use loadMarker instead with a new ARcontroller instance.
     * @param {number} arId
     * @param {string} urlOrData
     * @returns {number}
     */
    addMarker(arId: number, urlOrData: string): number;
    /**
     * Add a multi marker config file. Used by the ARController class.
     * It is preferred to use loadMultiMarker instead with a new ARcontroller instance.
     * @param {number} arId
     * @param {string} url
     * @returns {Array}
     */
    addMultiMarker(arId: number, url: string): any[];
    /**
     * Add a NFT marker file. You need to provide the url of the marker without the extension.
     * Used by the ARController class.
     * It is preferred to use loadNFTMarker instead with a new ARcontroller instance.
     * @param {number} arId
     * @param {string} url
     * @returns {number}
     */
    addNFTMarker(arId: number, url: string): number;
    _storeDataFile(data: any, target: any): void;
}
//# sourceMappingURL=ARToolkit.d.ts.map
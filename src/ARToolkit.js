import ModuleLoader from './ModuleLoader';
import Utils from './Utils';

const UNKNOWN_MARKER = -1;
const PATTERN_MARKER = 0;
const BARCODE_MARKER = 1;
const NFT_MARKER = 2;

export default class ARToolkit {
  
  static get UNKNOWN_MARKER() { return UNKNOWN_MARKER; }
  static get PATTERN_MARKER() { return PATTERN_MARKER; }
  static get BARCODE_MARKER() { return BARCODE_MARKER; }
  static get NFT_MARKER()     { return NFT_MARKER; }

  /**
   * Deafult constructor.
   */
  constructor() {

    // reference to WASM module
    this.instance;

    this.markerCount = 0;
    this.multiMarkerCount = 0;
    this.cameraCount = 0;
    this.version = '0.2.0'
    console.info('ARToolkit ', this.version)
  }
  //----------------------------------------------------------------------------

  // initialization
  /**
   * Init the ARToolKit space with all the Emscripten instanced methods. 
   * It creates also a global artoolkit variable.
   * @returns {ARToolkit}
   */
  async init() {

    const runtime = await ModuleLoader.init();
    this.instance = runtime.instance;
    this._decorate();

    // we're committing a cardinal sin here by exporting the instance into
    // the global namespace. all blame goes to the person who created that CPP
    // wrapper ARToolKitJS.cpp and introduced a global "artoolkit" variable.
    let scope = (typeof window !== 'undefined') ? window : global;
    scope['artoolkit'] = this;

    return this;
  }

  _decorate() {

    // add delegate methods
    [
      'setup', 'teardown',
      'setupAR2',
      'setLogLevel', 'getLogLevel',
      'setDebugMode', 'getDebugMode',
      'getProcessingImage',
      'setMarkerInfoDir', 'setMarkerInfoVertex',
      'getTransMatSquare', 'getTransMatSquareCont',
      'getTransMatMultiSquare', 'getTransMatMultiSquareRobust',
      'getMultiMarkerNum', 'getMultiMarkerCount',
      'detectMarker', 'getMarkerNum',
      'detectNFTMarker',
      'getNFTMarker', 'getNFTData', 'getMarker',
      'getMultiEachMarker',
      'setProjectionNearPlane', 'getProjectionNearPlane',
      'setProjectionFarPlane', 'getProjectionFarPlane',
      'setThresholdMode', 'getThresholdMode',
      'setThreshold', 'getThreshold',
      'setPatternDetectionMode', 'getPatternDetectionMode',
      'setMatrixCodeType', 'getMatrixCodeType',
      'setLabelingMode', 'getLabelingMode',
      'setPattRatio', 'getPattRatio',
      'setImageProcMode', 'getImageProcMode',
    ].forEach(method => {
      this[method] = this.instance[method];
    });

    // expose constants
    for(let co in this.instance) {
      if(co.match(/^AR/)) {
        this[co] = this.instance[co];
      }
    }
  }
  //----------------------------------------------------------------------------

  // public accessors
  /**
   * Load the camera parameter file. You need to provide a valid url.
   * @param {string} urlOrData 
   * @returns 
   */
  async loadCamera(urlOrData) {

    const target = '/camera_param_' + this.cameraCount++;

    let data;

    if(urlOrData instanceof Uint8Array) {
      // assume preloaded camera params
      data = urlOrData;
    } else {
      // fetch data via HTTP
      try { data = await Utils.fetchRemoteData(urlOrData); }
      catch(error) { throw error; }
    }

    this._storeDataFile(data, target);

    // return the internal marker ID
    return this.instance._loadCamera(target);
  }

  /**
   * Add a Marker to ARToolkit instance. Used by the ARController class. 
   * It is preferred to use loadMarker instead with a new ARcontroller instance.
   * @param {number} arId 
   * @param {string} urlOrData 
   * @returns {number} 
   */
  async addMarker(arId, urlOrData) {
    
    const target = '/marker_' + this.markerCount++;

    let data;

    if(urlOrData.indexOf("\n") !== -1) {
      // assume text from a .patt file
      data = Utils.string2Uint8Data(urlOrData);
    } else {
      // fetch data via HTTP
      try { data = await Utils.fetchRemoteData(urlOrData); }
      catch(error) { throw error; }
    }

    this._storeDataFile(data, target);

    // return the internal marker ID
    return this.instance._addMarker(arId, target);
  }

  /**
   * Add a multi marker config file. Used by the ARController class. 
   * It is preferred to use loadMultiMarker instead with a new ARcontroller instance.
   * @param {number} arId 
   * @param {string} url 
   * @returns {Array}
   */
  async addMultiMarker(arId, url) {

    const target = '/multi_marker_' + this.multiMarkerCount++;

    const data = await Utils.fetchRemoteData(url);
    const files = Utils.parseMultiFile(data);

    const storeMarker = async function (file) {
      const markerUrl = (new URL(file, url)).toString();
      const data = await Utils.fetchRemoteData(markerUrl);
      this._storeDataFile(data, file);
    };

    const promises = files.map(storeMarker, this);
    await Promise.all(promises);

    const markerId = this.instance._addMultiMarker(arId, target);
    const markerNum = this.instance.getMultiMarkerNum(arId, markerId);

    return [markerId, markerNum];
  }

  /**
   * Add a NFT marker file. You need to provide the url of the marker without the extension. 
   * Used by the ARController class. 
   * It is preferred to use loadNFTMarker instead with a new ARcontroller instance.
   * @param {number} arId 
   * @param {string} url 
   * @returns {number}
   */
  async addNFTMarker(arId, url) {
    // url doesn't need to be a valid url. Extensions to make it valid will be added here
    const targetPrefix = '/markerNFT_' + this.markerCount++;
    const extensions = ['fset', 'iset', 'fset3'];

    const storeMarker = async function (ext) {
      const fullUrl = url + '.' + ext;
      const target = targetPrefix + '.' + ext;
      const data = await Utils.fetchRemoteData(fullUrl);
      this._storeDataFile(data, target);
    };

    const promises = extensions.map(storeMarker, this);
    await Promise.all(promises);

    // return the internal marker ID
    return this.instance._addNFTMarker(arId, targetPrefix);
  }
  //----------------------------------------------------------------------------

  // implementation

  _storeDataFile(data, target) {
    // FS is provided by emscripten
    // Note: valid data must be in binary format encoded as Uint8Array
    this.instance.FS.writeFile(target, data, {
      encoding: 'binary'
    });
  }
  //----------------------------------------------------------------------------
}
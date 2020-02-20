import ModuleLoader from './ModuleLoader';
import axios from 'axios';


const UNKNOWN_MARKER = -1;
const PATTERN_MARKER = 0;
const BARCODE_MARKER = 1;
const NFT_MARKER = 2;

export default class ARToolkit {
  
  static get UNKNOWN_MARKER() { return UNKNOWN_MARKER; }
  static get PATTERN_MARKER() { return PATTERN_MARKER; }
  static get BARCODE_MARKER() { return BARCODE_MARKER; }
  static get NFT_MARKER()     { return NFT_MARKER; }

  // construction
  constructor() {

    // reference to WASM runtime
    this.instance;

    this.markerCount = 0;
    this.multiMarkerCount = 0;
    this.cameraCount = 0;
  }
  //----------------------------------------------------------------------------

  // initialization
  async init() {
    const runtime = await ModuleLoader.init();
    this.instance = runtime.instance;
    this._decorate();
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
      'getNFTMarker', 'getMarker',
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
  loadCamera(urlOrData) {

    // Note: Not supporting STRING or OBJECT type camera parameters (yet)
    const target = '/camera_param_' + this.cameraCount++;

    return new Promise((resolve, reject) => {

      new Promise((resolve, reject) => {
        if(urlOrData instanceof Uint8Array) {
          resolve(urlOrData);
        } else {
          this._fetchRemoteData(urlOrData, true)
          .then(data => resolve(data))
          .catch(error => reject(error));
        }
      })
      .then(data => {
        this._storeDataFile(data, target);
        resolve(this.instance._loadCamera(target));
      })
      .catch(error => {
        reject(error);
      });

    });

  }

  addMarker() {

  }

  addMultiMarker() {

  }

  addNFTMarker() {

  }
  //----------------------------------------------------------------------------

  // implementation

  _fetchRemoteData(url, asBinary=false) {
    return new Promise((resolve, reject) => {
      const requestOptions = asBinary ?
        { responseType: 'arraybuffer' } : {};
      axios.get(url, requestOptions)
        .then(response => {
          const data = asBinary ? new Uint8Array(response.data) : response.data;
          resolve(data);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

  _storeDataFile(data, target) {
    // FS is provided by emscripten
    // Note: strings will always be written as UTF-8
    // Note2: binary data must be encoded as Uint8Array
    if(data instanceof Uint8Array) {
      this.instance.FS.writeFile(target, data, {
        encoding: 'binary'
      });
    } else {
      this.instance.FS.writeFile(target, data);
    }
  }
  //----------------------------------------------------------------------------
}

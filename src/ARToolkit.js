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
  loadCamera(url) {

    // Note: Not supporting STRING or OBJECT type camera parameters (yet)
    const target = '/camera_param_' + this.cameraCount++;

    return new Promise((resolve, reject) => {
      this._fetchIntoFile(url, target, true)
        .then(data => {
          const cameraId = this.instance._loadCamera(target);
          resolve(cameraId);
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

  // Examples:
  // _fetchIntoFile('/data/hiro.patt', '/data/marker_0');
  // _fetchIntoFile('/data/camera_para.dat', '/camera_0', true);
  _fetchIntoFile(url, target, asBinary=false) {
    return new Promise((resolve, reject) => {
      let requestOptions = {};
      if(asBinary) {
        requestOptions['responseType'] = 'arraybuffer';
      }
      axios.get(url, requestOptions)
        .then(response => {
          // FS is provided by emscripten
          // Note: strings will always be written as UTF-8
          if(asBinary) {
            this.instance.FS.writeFile(target, new Uint8Array(response.data), {
              encoding: 'binary'
            });
          } else {
            this.instance.FS.writeFile(target, response.data);
          }
          resolve(response.data);
        })
        .catch(error => {
          reject(error);
        })
    });
  }
  //----------------------------------------------------------------------------
}

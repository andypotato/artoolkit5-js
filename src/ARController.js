import ARToolkit from './ARToolkit';

export default class ARController {

  constructor(width, height, cameraParam, options) {

    // read settings
    this.options = {...{
      canvas: null,
      orientation: 'landscape'
    }, ...options};

    // no point in initializing a member as "undefined"
    // replaced it with -1 
    this.id = -1;

    this.width = width;
    this.height = height;

    // holds an image in case the instance was initialized with an image
    this.image;

    // default camera orientation
    this.orientation = this.options.orientation;

    // this is a replacement for ARCameraParam
    this.cameraParam = cameraParam;
    this.cameraId = -1;
    this.cameraLoaded = false;

    // toolkit instance
    this.artoolkit;

    // to register observers as event listeners
    this.listeners = {};

    this.defaultMarkerWidth = 1;

    this.patternMarkers = {};
    this.barcodeMarkers = {};
    this.nftMarkers = {};

    this.transform_mat = new Float32Array(16);
    this.transformGL_RH = new Float64Array(16);

    this.videoWidth = width;
    this.videoHeight = height;
    this.videoSize = this.videoWidth * this.videoHeight;

    this.framepointer = null;
    this.framesize = null;
    this.dataHeap = null;
    this.videoLuma = null;
    this.camera_mat = null;
    this.marker_transform_mat = null;
    this.videoLumaPointer = null;

    if(this.options.canvas) {
      // in case you use Node.js, create a canvas with node-canvas
      this.canvas = this.options.canvas;
    } else {
      // try creating a canvas from document
      if(typeof document === 'undefined') {
        throw 'No canvas available';
      }
      this.canvas = document.createElement('canvas');
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');

    // this is to workaround the introduction of "self" variable
    this.nftMarkerFound = false;
    this.nftMarkerFoundTime = false;
    this.nftMarkerCount = 0;

    this._bwpointer = false;
  }

  dispose() {

    // dispose of the camera
    // this replaces ARCameraParam.dispose()
    // Note: "deleteCamera" was removed
    // as this method never existed on ARToolkit in the first place
    this.cameraId = -1;
    this.cameraParam = '';
    this.cameraLoaded = false;

    if(this.id > -1) {
      this.artoolkit.teardown(this.id);
    }

    // Note: only <video> has an srcObject - images don't
    if(this.image && this.image.srcObject) {
      // @TODO: enable
      //ARController._teardownVideo(this.image);
    }

    // @TODO: seriously?
    for(let t in this) {
      this[t] = null;
    }
  };


  // static initializers
  //----------------------------------------------------------------------------

  static async initWithDimensions(width, height, cameraParam, options) {

    // directly init with given width / height
    const controller = new ARController(width, height, cameraParam, options);
    return await controller._initialize();
  }

  static async initWithImage(image, cameraParam, options) {

    // get width / height from image / video
    const width = image.videoWidth || image.width;
    const height = image.videoHeight || image.height;

    const controller = await ARController.initWithDimensions(width, height, cameraParam, options);
    controller.image = image;
    return controller;
  }
  

  // marker detection
  //----------------------------------------------------------------------------

  /**
   * Detects markers in the given image. The process method dispatches marker detection events during its run.
   * The marker detection process proceeds by first dispatching a markerNum event that tells you how many
   * markers were found in the image. Next, a getMarker event is dispatched for each found marker square.
   * Then, a getNFTMarker event is dispatched for each found NFT marker.
   * Finally, getMultiMarker is dispatched for every found multimarker, followed by getMultiMarkerSub events
   * dispatched for each of the markers in the multimarker.
   * 
   *   arController.addEventListener('markerNum', function(ev) {
   *     console.log("Detected " + ev.data + " markers.")
   *   });
   * 
   *   arController.addEventListener('getMarker', function(ev) {
   *     console.log("Detected marker with ids:", ev.data.marker.id, ev.data.marker.idPatt, ev.data.marker.idMatrix);
   *     console.log("Marker data", ev.data.marker);
   *     console.log("Marker transform matrix:", [].join.call(ev.data.matrix, ', '));
   *   });
   * 
   *   arController.addEventListener('getNFTMarker', function(ev) {
   *     // do stuff
   *   });
   * 
   *   arController.addEventListener('getMultiMarker', function(ev) {
   *     console.log("Detected multimarker with id:", ev.data.multiMarkerId);
   *   });
   * 
   *   arController.addEventListener('getMultiMarkerSub', function(ev) {
   *     console.log("Submarker for " + ev.data.multiMarkerId, ev.data.markerIndex, ev.data.marker);
   *   });
   * 
   *   arController.process(image);
   * 
   * If no image is given, defaults to this.image.
   * If the debugSetup has been called, draws debug markers on the debug canvas.
   * @param {ImageElement | VideoElement} image The image to process [optional].
   */
  process(image) {

    let result = this.detectMarker(image);
    if(result != 0) {
      console.error('[ARController]', 'detectMarker error:', result);
    }

    // get the total marker number
    let markerNum = this.getMarkerNum();
    let k, o;

    // get markers

    // - pattern markers
    for(k in this.patternMarkers) {
      o = this.patternMarkers[k];
      o.inPrevious = o.inCurrent;
      o.inCurrent = false;
    }

    // - barcode markers
    for(k in this.barcodeMarkers) {
      o = this.barcodeMarkers[k];
      o.inPrevious = o.inCurrent;
      o.inCurrent = false;
    }

    // - NFT markers
    for(k in this.nftMarkers) {
      o = this.nftMarkers[k];
      o.inPrevious = o.inCurrent;
      o.inCurrent = false;
    }

    // detect fiducial (aka squared) markers
    for(let i = 0; i < markerNum; i++) {

      let markerInfo = this.getMarker(i);

      let markerType = ARToolkit.UNKNOWN_MARKER;
      let visible = this.trackPatternMarkerId(-1);

      if(markerInfo.idPatt > -1 && (markerInfo.id === markerInfo.idPatt || markerInfo.idMatrix === -1)) {

        visible = this.trackPatternMarkerId(markerInfo.idPatt);
        markerType = ARToolkit.PATTERN_MARKER;

        if(markerInfo.dir !== markerInfo.dirPatt) {
          this.setMarkerInfoDir(i, markerInfo.dirPatt);
        }
      }
      else if(markerInfo.idMatrix > -1) {

        visible = this.trackBarcodeMarkerId(markerInfo.idMatrix);
        markerType = ARToolkit.BARCODE_MARKER;

        if(markerInfo.dir !== markerInfo.dirMatrix) {
          this.setMarkerInfoDir(i, markerInfo.dirMatrix);
        }
      }

      if(markerType !== ARToolkit.UNKNOWN_MARKER && visible.inPrevious) {
        this.getTransMatSquareCont(i, visible.markerWidth, visible.matrix, visible.matrix);
      } else {
        this.getTransMatSquare(i, visible.markerWidth, visible.matrix);
      }

      visible.inCurrent = true;
      this.transMatToGLMat(visible.matrix, this.transform_mat);
      this.transformGL_RH = this.arglCameraViewRHf(this.transform_mat);
      this.dispatchEvent({
        name: 'getMarker',
        target: this,
        data: {
          index: i,
          type: markerType,
          marker: markerInfo,
          matrix: this.transform_mat,
          matrixGL_RH: this.transformGL_RH
        }
      });
    }

    // detect NFT markers
    let nftMarkerCount = this.nftMarkerCount;
    this.detectNFTMarker();

    // in ms
    let MARKER_LOST_TIME = 200;

    for(let i = 0; i < nftMarkerCount; i++) {

      let nftMarkerInfo = this.getNFTMarker(i);
      let markerType = ARToolkit.NFT_MARKER;

      if(nftMarkerInfo.found) {

        this.nftMarkerFound = i;
        this.nftMarkerFoundTime = Date.now();

        let visible = this.trackNFTMarkerId(i);
        visible.matrix.set(nftMarkerInfo.pose);
        visible.inCurrent = true;
        this.transMatToGLMat(visible.matrix, this.transform_mat);
        this.transformGL_RH = this.arglCameraViewRHf(this.transform_mat);
        this.dispatchEvent({
          name: 'getNFTMarker',
          target: this,
          data: {
            index: i,
            type: markerType,
            marker: nftMarkerInfo,
            matrix: this.transform_mat,
            matrixGL_RH: this.transformGL_RH
          }
        });
      }
      else if(self.nftMarkerFound === i) {

        // for now this marker found/lost events handling is for one marker at a time
        if((Date.now() - this.nftMarkerFoundTime) > MARKER_LOST_TIME) {
          this.nftMarkerFound = false;
          this.dispatchEvent({
            name: 'lostNFTMarker',
            target: this,
            data: {
              index: i,
              type: markerType,
              marker: nftMarkerInfo,
              matrix: this.transform_mat,
              matrixGL_RH: this.transformGL_RH
            }
          });
        };
      }
    }

    // detect multiple markers
    let multiMarkerCount = this.getMultiMarkerCount();
    for(let i = 0; i < multiMarkerCount; i++) {

      let subMarkerCount = this.getMultiMarkerPatternCount(i);
      let visible = false;

      this.artoolkit.getTransMatMultiSquareRobust(this.id, i);
      this.transMatToGLMat(this.marker_transform_mat, this.transform_mat);
      this.transformGL_RH = this.arglCameraViewRHf(this.transform_mat);

      for(let j = 0; j < subMarkerCount; j++) {
        var multiEachMarkerInfo = this.getMultiEachMarker(i, j);
        if(multiEachMarkerInfo.visible >= 0) {
          visible = true;
          this.dispatchEvent({
            name: 'getMultiMarker',
            target: this,
            data: {
              multiMarkerId: i,
              matrix: this.transform_mat,
              matrixGL_RH: this.transformGL_RH
            }
          });
          break;
        }
      }

      if(visible) {
        for(let j = 0; j < subMarkerCount; j++) {
          var multiEachMarkerInfo = this.getMultiEachMarker(i, j);
          this.transMatToGLMat(this.marker_transform_mat, this.transform_mat);
          this.transformGL_RH = this.arglCameraViewRHf(this.transform_mat);
          this.dispatchEvent({
            name: 'getMultiMarkerSub',
            target: this,
            data: {
              multiMarkerId: i,
              markerIndex: j,
              marker: multiEachMarkerInfo,
              matrix: this.transform_mat,
              matrixGL_RH: this.transformGL_RH
            }
          });
        }
      }
    }

    if(this._bwpointer) {
      this.debugDraw();
    }
  }

  /**
   * Detects the NFT markers in the process() function,
   * with the given tracked id.
   */
  detectNFTMarker() {
    this.artoolkit.detectNFTMarker(this.id);
  }

  /**
   * Adds the given pattern marker ID to the index of tracked IDs.
   * Sets the markerWidth for the pattern marker to markerWidth.
   * Used by process() to implement continuous tracking,
   * keeping track of the marker's transformation matrix
   * and customizable marker widths.
   * @param {number} id ID of the pattern marker to track.
   * @param {number} [markerWidth] The width of the marker to track.
   * @return {Object} The marker tracking object.
  */
  trackPatternMarkerId(id, markerWidth) {

    let obj = this.patternMarkers[id];
    if(!obj) {
      this.patternMarkers[id] = obj = {
        inPrevious: false,
        inCurrent: false,
        matrix: new Float64Array(12),
        matrixGL_RH: new Float64Array(12),
        markerWidth: markerWidth || this.defaultMarkerWidth
      };
    }
    if(markerWidth) {
      obj.markerWidth = markerWidth;
    }
    return obj;
  };

  /**
   * Adds the given barcode marker ID to the index of tracked IDs.
   * Sets the markerWidth for the pattern marker to markerWidth.
   * Used by process() to implement continuous tracking,
   * keeping track of the marker's transformation matrix
   * and customizable marker widths.
   * @param {number} id ID of the barcode marker to track.
   * @param {number} [markerWidth] The width of the marker to track.
   * @return {Object} The marker tracking object.
   */
  trackBarcodeMarkerId(id, markerWidth) {

    let obj = this.barcodeMarkers[id];
    if(!obj) {
      this.barcodeMarkers[id] = obj = {
        inPrevious: false,
        inCurrent: false,
        matrix: new Float64Array(12),
        matrixGL_RH: new Float64Array(12),
        markerWidth: markerWidth || this.defaultMarkerWidth
      };
    }
    if(markerWidth) {
      obj.markerWidth = markerWidth;
    }
    return obj;
  };

  /**
   * Adds the given NFT marker ID to the index of tracked IDs.
   * Sets the markerWidth for the pattern marker to markerWidth.
   * Used by process() to implement continuous tracking,
   * keeping track of the marker's transformation matrix
   * and customizable marker widths.
   * @param {number} id ID of the NFT marker to track.
   * @param {number} markerWidth The width of the marker to track.
   * @return {Object} The marker tracking object.
   */
  trackNFTMarkerId(id, markerWidth) {

    let obj = this.nftMarkers[id];
    if(!obj) {
      this.nftMarkers[id] = obj = {
        inPrevious: false,
        inCurrent: false,
        matrix: new Float64Array(12),
        matrixGL_RH: new Float64Array(12),
        markerWidth: markerWidth || this.defaultMarkerWidth
      };
    }
    if(markerWidth) {
      obj.markerWidth = markerWidth;
    }
    return obj;
  };

  /**
   * Returns the number of multimarkers registered on this ARController.
   * @return {number} Number of multimarkers registered.
   */
  getMultiMarkerCount() {
    return this.artoolkit.getMultiMarkerCount(this.id);
  };

  /**
   * Returns the number of markers in the multimarker registered for the given multiMarkerId.
   * @param {number} multiMarkerId The id number of the multimarker to access. Given by loadMultiMarker.
   * @return {number} Number of markers in the multimarker. Negative value indicates failure to find the multimarker.
   */
  getMultiMarkerPatternCount(multiMarkerId) {
    return this.artoolkit.getMultiMarkerNum(this.id, multiMarkerId);
  };


  // event handling
  //----------------------------------------------------------------------------

  /**
   * Add an event listener on this ARController for the named event, calling the callback function
   * whenever that event is dispatched.
   * Possible events are:
   * - getMarker - dispatched whenever process() finds a square marker
   * - getMultiMarker - dispatched whenever process() finds a visible registered multimarker
   * - getMultiMarkerSub - dispatched by process() for each marker in a visible multimarker
   * - load - dispatched when the ARController is ready to use (useful if passing in a camera URL in the constructor)
   * @param {string} name Name of the event to listen to.
   * @param {function} callback Callback function to call when an event with the given name is dispatched.
   */
  addEventListener(name, callback) {
    if(!this.listeners[name]) {
      this.listeners[name] = [];
    }
    this.listeners[name].push(callback);
  };

  /**
   * Remove an event listener from the named event.
   * @param {string} name Name of the event to stop listening to.
   * @param {function} callback Callback function to remove from the listeners of the named event.
   */
  removeEventListener(name, callback) {
    if(this.listeners[name]) {
      let index = this.listeners[name].indexOf(callback);
      if(index > -1) {
        this.listeners[name].splice(index, 1);
      }
    }
  };

  /**
   * Dispatches the given event to all registered listeners on event.name.
   * @param {Object} event Event to dispatch.
   */
  dispatchEvent(event) {
//console.log('Dispatched event');
//console.log(event);
    let listeners = this.listeners[event.name];
    if(listeners) {
      for(let i = 0; i < listeners.length; i++) {
        listeners[i].call(this, event);
      }
    }
  };


  // debug stuff
  //----------------------------------------------------------------------------

	/**
	 * Sets up a debug canvas for the AR detection.
   * Draws a red marker on top of each detected square in the image.
	 * The debug canvas is added to document.body.
	 */
  debugSetup() {

    if(typeof document === 'undefined') {
      console.log('debugSetup() currently only supports Browser environments');
      return;
    }

    document.body.appendChild(this.canvas);

    this.setDebugMode(true);
    this._bwpointer = this.getProcessingImage();
  };

	/**
	 * Draw the black and white image and debug markers to the ARController canvas.
	 * See setDebugMode.
   * @return 0 (void)
	 */
  debugDraw() {

    let debugBuffer = new Uint8ClampedArray(
      this.artoolkit.instance.HEAPU8.buffer,
      this._bwpointer, this.framesize);

    let imageData = new ImageData(
      new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4),
      this.canvas.width, this.canvas.height);

    for(let i = 0, j = 0; i < debugBuffer.length; i++ , j += 4) {
      let v = debugBuffer[i];
      imageData.data[j + 0] = v;
      imageData.data[j + 1] = v;
      imageData.data[j + 2] = v;
      imageData.data[j + 3] = 255;
    }
    this.ctx.putImageData(imageData, 0, 0)

    let markerNum = this.getMarkerNum();
    for(let i = 0; i < markerNum; i++) {
      this.drawDebugMarker(this.getMarker(i));
    }

/*
    if(this.transform_mat && this.transformGL_RH) {
      console.log("GL 4x4 Matrix: " + this.transform_mat);
      console.log("GL_RH 4x4 Mat: " + this.transformGL_RH);
    }
*/
  };

  /**
   * Draw a square black border around the detect marker with
   * red circle in the center. Used for debugging porpouse in debugSetup.
   * @return {number} 0 (void)
   */
  drawDebugMarker(marker) {

    let vertex = marker.vertex;
    let pos = marker.pos;
    let ctx = this.ctx;

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'red';

    ctx.beginPath()
    ctx.moveTo(vertex[0][0], vertex[0][1])
    ctx.lineTo(vertex[1][0], vertex[1][1])
    ctx.stroke();

    ctx.beginPath()
    ctx.moveTo(vertex[2][0], vertex[2][1])
    ctx.lineTo(vertex[3][0], vertex[3][1])
    ctx.stroke()

    ctx.strokeStyle = 'green';

    ctx.beginPath()
    ctx.lineTo(vertex[1][0], vertex[1][1])
    ctx.lineTo(vertex[2][0], vertex[2][1])
    ctx.stroke();

    ctx.beginPath()
    ctx.moveTo(vertex[3][0], vertex[3][1])
    ctx.lineTo(vertex[0][0], vertex[0][1])
    ctx.stroke();

    ctx.beginPath()
    ctx.arc(pos[0], pos[1], 8, 0, Math.PI * 2)
    ctx.fillStyle = 'red'
    ctx.fill()
  };


  // marker loaders
  //----------------------------------------------------------------------------

  /**
   * Loads a pattern marker from the given URL or data string
   * @param {string} urlOrData - The URL or data of the marker pattern file to load.
   */
  async loadMarker(urlOrData) {
    return await this.artoolkit.addMarker(this.id, urlOrData);
  };

  /**
   * Loads a multimarker from the given URL and calls the onSuccess callback with the UID of the marker.
   * @param {string} urlOrData - The URL of the multimarker pattern file to load.
   */
  async loadMultiMarker(urlOrData) {
    return await this.artoolkit.addMultiMarker(this.id, urlOrData);
  };

  /**
   * Loads an NFT marker from the given URL or data string
   * @param {string} urlOrData - The URL prefix or data of the NFT markers to load.
  */
  async loadNFTMarker(urlOrData) {
    let markerId = await this.artoolkit.addNFTMarker(this.id, urlOrData);
    this.nftMarkerCount = markerId + 1;
    return markerId;
  };


  // math stuff
  //----------------------------------------------------------------------------

  /**
   * Populates the provided float array with the current transformation for the specified marker. After
   * a call to detectMarker, all marker information will be current. Marker transformations can then be
   * checked.
   * @param {number} markerUID  The unique identifier (UID) of the marker to query
   * @param {number} markerWidth  The width of the marker
   * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
   * @return  {Float64Array} The dst array.
   */
  getTransMatSquare(markerUID, markerWidth, dst) {
    this.artoolkit.getTransMatSquare(this.id, markerUID, markerWidth);
    dst.set(this.marker_transform_mat);
    return dst;
  };

  /**
   * Populates the provided float array with the current transformation for the specified marker, using
   * previousMarkerTransform as the previously detected transformation. After
   * a call to detectMarker, all marker information will be current. Marker transformations can then be
   * checked.
   * @param {number} markerUID  The unique identifier (UID) of the marker to query
   * @param {number} markerWidth  The width of the marker
   * @param {Float64Array} previousMarkerTransform  The float array to use as the previous 3x4 marker transformation matrix
   * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
   * @return  {Float64Array} The dst array.
   */
  getTransMatSquareCont(markerUID, markerWidth, previousMarkerTransform, dst) {
    this.marker_transform_mat.set(previousMarkerTransform);
    this.artoolkit.getTransMatSquareCont(this.id, markerUID, markerWidth);
    dst.set(this.marker_transform_mat);
    return dst;
  };

  /**
   * Populates the provided float array with the current transformation for the specified multimarker. After
   * a call to detectMarker, all marker information will be current. Marker transformations can then be
   * checked.
   * @param {number} markerUID  The unique identifier (UID) of the marker to query
   * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
   * @return  {Float64Array} The dst array.
   */
  getTransMatMultiSquare(markerUID, dst) {
    this.artoolkit.getTransMatMultiSquare(this.id, markerUID);
    dst.set(this.marker_transform_mat);
    return dst;
  };

  /**
   * Populates the provided float array with the current robust transformation for the specified multimarker. After
   * a call to detectMarker, all marker information will be current. Marker transformations can then be
   * checked.
   * @param {number} markerUID  The unique identifier (UID) of the marker to query
   * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
   * @return  {Float64Array} The dst array.
   */
  getTransMatMultiSquareRobust(markerUID, dst) {
    this.artoolkit.getTransMatMultiSquare(this.id, markerUID);
    dst.set(this.marker_transform_mat);
    return dst;
  };

  /**
   * Converts the given 3x4 marker transformation matrix in the 12-element transMat array
   * into a 4x4 WebGL matrix and writes the result into the 16-element glMat array.
   * If scale parameter is given, scales the transform of the glMat by the scale parameter.
   * m {Float64Array} transMat The 3x4 marker transformation matrix.
   * @param {Float64Array} glMat The 4x4 GL transformation matrix.
   * @param {number} scale The scale for the transform.
   */
  transMatToGLMat(transMat, glMat, scale) {

    if(glMat == undefined) {
      glMat = new Float64Array(16);
    }

    glMat[0 + 0 * 4] = transMat[0]; // R1C1
    glMat[0 + 1 * 4] = transMat[1]; // R1C2
    glMat[0 + 2 * 4] = transMat[2];
    glMat[0 + 3 * 4] = transMat[3];
    glMat[1 + 0 * 4] = transMat[4]; // R2
    glMat[1 + 1 * 4] = transMat[5];
    glMat[1 + 2 * 4] = transMat[6];
    glMat[1 + 3 * 4] = transMat[7];
    glMat[2 + 0 * 4] = transMat[8]; // R3
    glMat[2 + 1 * 4] = transMat[9];
    glMat[2 + 2 * 4] = transMat[10];
    glMat[2 + 3 * 4] = transMat[11];
    glMat[3 + 0 * 4] = 0.0;
    glMat[3 + 1 * 4] = 0.0;
    glMat[3 + 2 * 4] = 0.0;
    glMat[3 + 3 * 4] = 1.0;

    if(scale != undefined && scale !== 0.0) {
      glMat[12] *= scale;
      glMat[13] *= scale;
      glMat[14] *= scale;
    }
    return glMat;
  };

  /**
   * Converts the given 4x4 openGL matrix in the 16-element transMat array
   * into a 4x4 OpenGL Right-Hand-View matrix and writes the result into the 16-element glMat array.
   * If scale parameter is given, scales the transform of the glMat by the scale parameter.
   * @param {Float64Array} glMatrix The 4x4 marker transformation matrix.
   * @param {Float64Array} [glRhMatrix] The 4x4 GL right hand transformation matrix.
   * @param {number} [scale] The scale for the transform.
   */
  arglCameraViewRHf(glMatrix, glRhMatrix, scale) {

    let m_modelview;
    if(glRhMatrix == undefined)
      m_modelview = new Float64Array(16);
    else
      m_modelview = glRhMatrix;

    // x
    m_modelview[0] = glMatrix[0];
    m_modelview[4] = glMatrix[4];
    m_modelview[8] = glMatrix[8];
    m_modelview[12] = glMatrix[12];
    // y
    m_modelview[1] = -glMatrix[1];
    m_modelview[5] = -glMatrix[5];
    m_modelview[9] = -glMatrix[9];
    m_modelview[13] = -glMatrix[13];
    // z
    m_modelview[2] = -glMatrix[2];
    m_modelview[6] = -glMatrix[6];
    m_modelview[10] = -glMatrix[10];
    m_modelview[14] = -glMatrix[14];

    // 0 0 0 1
    m_modelview[3] = 0;
    m_modelview[7] = 0;
    m_modelview[11] = 0;
    m_modelview[15] = 1;

    if(scale != undefined && scale !== 0.0) {
      m_modelview[12] *= scale;
      m_modelview[13] *= scale;
      m_modelview[14] *= scale;
    }

    glRhMatrix = m_modelview;

    return glRhMatrix;
  }


  // marker detection routines
  //----------------------------------------------------------------------------

  /**
   * This is the core ARToolKit marker detection function. It calls through to a set of
   * internal functions to perform the key marker detection steps of binarization and
   * labelling, contour extraction, and template matching and/or matrix code extraction.
   * Typically, the resulting set of detected markers is retrieved by calling arGetMarkerNum
   * to get the number of markers detected and arGetMarker to get an array of ARMarkerInfo
   * structures with information on each detected marker, followed by a step in which
   * detected markers are possibly examined for some measure of goodness of match (e.g. by
   * examining the match confidence value) and pose extraction.
   * @param {image} Image to be processed to detect markers.
   * @return {number} 0 if the function proceeded without error, or a value less than 0 in case of error.
   * A result of 0 does not however, imply any markers were detected.
   */
  detectMarker(image) {
    if(this._copyImageToHeap(image)) {
      return this.artoolkit.detectMarker(this.id);
    }
    return -99;
  };

  /**
   * Get the number of markers detected in a video frame.
   * @return {number} The number of detected markers in the most recent image passed to arDetectMarker.
   * Note that this is actually a count, not an index. A better name for this function would be
   * arGetDetectedMarkerCount, but the current name lives on for historical reasons.
   */
  getMarkerNum () {
    return this.artoolkit.getMarkerNum(this.id);
  };

  /**
   * Get the marker info struct for the given marker index in detected markers.
   * Call this.detectMarker first, then use this.getMarkerNum to get the detected marker count.
   * The returned object is the global artoolkit.markerInfo object and will be overwritten
   * by subsequent calls. If you need to hang on to it, create a copy using this.cloneMarkerInfo();
   * Returns undefined if no marker was found.
   * A markerIndex of -1 is used to access the global custom marker.
   * The fields of the markerInfo struct are:
   * @field      area Area in pixels of the largest connected region, comprising the marker border and regions connected to it. Note that this is
   *             not the same as the actual onscreen area inside the marker border.
   * @field      id If pattern detection mode is either pattern mode OR matrix but not both, will be marker ID (>= 0) if marker is valid, or -1 if invalid.
   * @field      idPatt If pattern detection mode includes a pattern mode, will be marker ID (>= 0) if marker is valid, or -1 if invalid.
   * @field      idMatrix If pattern detection mode includes a matrix mode, will be marker ID (>= 0) if marker is valid, or -1 if invalid.
   * @field      dir If pattern detection mode is either pattern mode OR matrix but not both, and id != -1, will be marker direction (range 0 to 3, inclusive).
   * @field      dirPatt If pattern detection mode includes a pattern mode, and id != -1, will be marker direction (range 0 to 3, inclusive).
   * @field      dirMatrix If pattern detection mode includes a matrix mode, and id != -1, will be marker direction (range 0 to 3, inclusive).
   * @field      cf If pattern detection mode is either pattern mode OR matrix but not both, will be marker matching confidence (range 0.0 to 1.0 inclusive) if marker is valid, or -1.0 if marker is invalid.
   * @field      cfPatt If pattern detection mode includes a pattern mode, will be marker matching confidence (range 0.0 to 1.0 inclusive) if marker is valid, or -1.0 if marker is invalid.
   * @field      cfMatrix If pattern detection mode includes a matrix mode, will be marker matching confidence (range 0.0 to 1.0 inclusive) if marker is valid, or -1.0 if marker is invalid.
   * @field      pos 2D position (in camera image coordinates, origin at top-left) of the centre of the marker.
   * @field      line Line equations for the 4 sides of the marker.
   * @field      vertex 2D positions (in camera image coordinates, origin at top-left) of the corners of the marker. vertex[(4 - dir)%4][] is the top-left corner of the marker. Other vertices proceed clockwise from this. These are idealised coordinates (i.e. the onscreen position aligns correctly with the undistorted camera image.)
   * @param {number} markerIndex The index of the marker to query.
   * @returns {Object} The markerInfo struct.
   */
  getMarker(markerIndex) {
    if(0 === this.artoolkit.getMarker(this.id, markerIndex)) {
      return this.artoolkit.markerInfo;
    }
  };

  /**
   * Get the NFT marker info struct for the given NFT marker index in detected markers.
   * The returned object is the global artoolkit.NFTMarkerInfo object and will be overwritten
   * by subsequent calls.
   * Returns undefined if no marker was found.
   * A markerIndex of -1 is used to access the global custom marker.
   * @param {number} markerIndex The index of the NFT marker to query.
   * @returns {Object} The NFTmarkerInfo struct.
   */
  getNFTMarker(markerIndex) {
    if(0 === this.artoolkit.getNFTMarker(this.id, markerIndex)) {
      return this.artoolkit.NFTMarkerInfo;
    }
  };

  /**
   * Set marker vertices to the given vertexData[4][2] array.
   * Sets the marker pos to the center of the vertices.
   * Useful for building custom markers for getTransMatSquare.
   * A markerIndex of -1 is used to access the global custom marker.
   * @param {number} markerIndex The index of the marker to edit.
   * @param {*} vertexData
   */
  setMarkerInfoVertex(markerIndex, vertexData) {
    for(let i = 0; i < vertexData.length; i++) {
      this.marker_transform_mat[i * 2 + 0] = vertexData[i][0];
      this.marker_transform_mat[i * 2 + 1] = vertexData[i][1];
    }
    return this.artoolkit.setMarkerInfoVertex(this.id, markerIndex);
  };

  /**
   * Makes a deep copy of the given marker info.
   * @param {Object} markerInfo The marker info object to copy.
   * @return {Object} The new copy of the marker info.
   */
  cloneMarkerInfo(markerInfo) {
    return JSON.parse(JSON.stringify(markerInfo));
  };

  /**
   * Get the marker info struct for the given marker index in detected markers.
   * Call this.detectMarker first, then use this.getMarkerNum to get the detected marker count.
   * The returned object is the global artoolkit.markerInfo object and will be overwritten
   * by subsequent calls. If you need to hang on to it, create a copy using this.cloneMarkerInfo();
   * Returns undefined if no marker was found.
   * @field {number} pattId The index of the marker.
   * @field {number} pattType The type of the marker. Either AR_MULTI_PATTERN_TYPE_TEMPLATE or AR_MULTI_PATTERN_TYPE_MATRIX.
   * @field {number} visible 0 or larger if the marker is visible
   * @field {number} width The width of the marker.
   * @param {number} multiMarkerId The multimarker to query.
   * @param {number} markerIndex The index of the marker to query.
   * @returns {Object} The markerInfo struct.
   */
  getMultiEachMarker(multiMarkerId, markerIndex) {
    if(0 === this.artoolkit.getMultiEachMarker(this.id, multiMarkerId, markerIndex)) {
      return this.artoolkit.multiEachMarkerInfo;
    }
  };

  /**
   * Returns the 16-element WebGL transformation matrix used by ARController.process to
   * pass marker WebGL matrices to event listeners.
   * Unique to each ARController.
   * @return {Float64Array} The 16-element WebGL transformation matrix used by the ARController.
   */
  getTransformationMatrix() {
    return this.transform_mat;
  };

  /**
   * Returns the projection matrix computed from camera parameters for the ARController.
   * @return {Float64Array} The 16-element WebGL camera matrix for the ARController camera parameters.
   */
  getCameraMatrix() {
    return this.camera_mat;
  };

  /**
   * Returns the shared ARToolKit 3x4 marker transformation matrix, used for passing and receiving
   * marker transforms to/from the Emscripten side.
   * @return {Float64Array} The 12-element 3x4 row-major marker transformation matrix used by ARToolKit.
   */
  getMarkerTransformationMatrix() {
    return this.marker_transform_mat;
  };


  // Setter / Getter Proxies
  //----------------------------------------------------------------------------

  /**
   * Enables or disables debug mode in the tracker. When enabled, a black and white debug
   * image is generated during marker detection. The debug image is useful for visualising
   * the binarization process and choosing a threshold value.
   * @param {boolean} mode true to enable debug mode, false to disable debug mode
   * @see getDebugMode()
   */
  setDebugMode(mode) {
    return this.artoolkit.setDebugMode(this.id, mode);
  };

  /**
   * Returns whether debug mode is currently enabled.
   * @return {boolean} true when debug mode is enabled, false when debug mode is disabled
   * @see  setDebugMode()
   */
  getDebugMode() {
    return this.artoolkit.getDebugMode(this.id);
  };

  /**
   * Returns the Emscripten HEAP offset to the debug processing image used by ARToolKit.
   * @return {number} HEAP offset to the debug processing image.
   */
  getProcessingImage() {
    return this.artoolkit.getProcessingImage(this.id);
  };

  /**
   * Sets the logging level to use by ARToolKit.
   * @param {number} mode type for the log level.
   */
  setLogLevel(mode) {
    return this.artoolkit.setLogLevel(mode);
  };

  /**
   * Gets the logging level used by ARToolKit.
   * @return {number} return the log level in use.
   */
  getLogLevel() {
    return this.artoolkit.getLogLevel();
  };

  /**
   * Sets the dir (direction) of the marker. Direction that tells about the rotation
   * about the marker (possible values are 0, 1, 2 or 3).
   * This parameter makes it possible to tell about the line order of the detected marker
   * (so which line is the first one) and so find the first vertex.
   * This is important to compute the transformation matrix in arGetTransMat().
   * @param {number} markerIndex the index of the marker
   * @param {number} dir direction of the marker (possible values are 0, 1, 2 or 3).
   * @return {number} 0 (void)
   */
  setMarkerInfoDir(markerIndex, dir) {
    return this.artoolkit.setMarkerInfoDir(this.id, markerIndex, dir);
  };

  /**
   * Sets the value of the near plane of the camera.
   * @param {number} value the value of the near plane
   * @return {number} 0 (void)
   */
  setProjectionNearPlane(value) {
    return this.artoolkit.setProjectionNearPlane(this.id, value);
  };

  /**
   * Gets the value of the near plane of the camera with the give id.
   * @return {number} the value of the near plane.
   */
  getProjectionNearPlane() {
    return this.artoolkit.getProjectionNearPlane(this.id);
  };

  /**
   * Sets the value of the far plane of the camera.
   * @param {number} value the value of the far plane
   * @return {number} 0 (void)
   */
  setProjectionFarPlane(value) {
    return this.artoolkit.setProjectionFarPlane(this.id, value);
  };

  /**
   * Gets the value of the far plane of the camera with the give id.
   * @return {number} the value of the far plane.
   */
  getProjectionFarPlane() {
    return this.artoolkit.getProjectionFarPlane(this.id);
  };

  /**
   * Set the labeling threshold mode (auto/manual).
   * @param {number} mode An integer specifying the mode. One of:
   * AR_LABELING_THRESH_MODE_MANUAL,
   * AR_LABELING_THRESH_MODE_AUTO_MEDIAN,
   * AR_LABELING_THRESH_MODE_AUTO_OTSU,
   * AR_LABELING_THRESH_MODE_AUTO_ADAPTIVE,
   * AR_LABELING_THRESH_MODE_AUTO_BRACKETING
   */
  setThresholdMode(mode) {
    return this.artoolkit.setThresholdMode(this.id, mode);
  };

  /**
   * Gets the current threshold mode used for image binarization.
   * @return {number} The current threshold mode
   * @see getVideoThresholdMode()
   */
  getThresholdMode() {
    return this.artoolkit.getThresholdMode(this.id);
  };

  /**
   * Set the labeling threshold.
   * This function forces sets the threshold value.
   * The default value is AR_DEFAULT_LABELING_THRESH which is 100.
   * The current threshold mode is not affected by this call.
   * Typically, this function is used when labeling threshold mode
   * is AR_LABELING_THRESH_MODE_MANUAL.
   * The threshold value is not relevant if threshold mode is
   * AR_LABELING_THRESH_MODE_AUTO_ADAPTIVE.
   * Background: The labeling threshold is the value which
   * the AR library uses to differentiate between black and white
   * portions of an ARToolKit marker. Since the actual brightness,
   * contrast, and gamma of incoming images can vary signficantly
   * between different cameras and lighting conditions, this
   * value typically needs to be adjusted dynamically to a
   * suitable midpoint between the observed values for black
   * and white portions of the markers in the image.
   * @param {number} threshold An integer in the range [0,255] (inclusive).
   */
  setThreshold(threshold) {
    return this.artoolkit.setThreshold(this.id, threshold);
  };

  /**
   * Get the current labeling threshold.
   * This function queries the current labeling threshold. For,
   * AR_LABELING_THRESH_MODE_AUTO_MEDIAN, AR_LABELING_THRESH_MODE_AUTO_OTSU,
   * and AR_LABELING_THRESH_MODE_AUTO_BRACKETING
   * the threshold value is only valid until the next auto-update.
   * The current threshold mode is not affected by this call.
   * The threshold value is not relevant if threshold mode is
   * AR_LABELING_THRESH_MODE_AUTO_ADAPTIVE.
   * @return {number} The current threshold value.
   */
  getThreshold() {
    return this.artoolkit.getThreshold(this.id);
  };

  /**
   * Set the pattern detection mode
   * The pattern detection determines the method by which ARToolKit
   * matches detected squares in the video image to marker templates
   * and/or IDs. ARToolKit v4.x can match against pictorial "template" markers,
   * whose pattern files are created with the mk_patt utility, in either colour
   * or mono, and additionally can match against 2D-barcode-type "matrix"
   * markers, which have an embedded marker ID. Two different two-pass modes
   * are also available, in which a matrix-detection pass is made first,
   * followed by a template-matching pass.
   * @param {number} mode
   * Options for this field are:
   * AR_TEMPLATE_MATCHING_COLOR
   * AR_TEMPLATE_MATCHING_MONO
   * AR_MATRIX_CODE_DETECTION
   * AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX
   * AR_TEMPLATE_MATCHING_MONO_AND_MATRIX
   * The default mode is AR_TEMPLATE_MATCHING_COLOR.
   */
  setPatternDetectionMode(mode) {
    return this.artoolkit.setPatternDetectionMode(this.id, mode);
  };

  /**
   * Returns the current pattern detection mode.
   * @return {number} The current pattern detection mode.
   */
  getPatternDetectionMode() {
    return this.artoolkit.getPatternDetectionMode(this.id);
  };

  /**
   * Set the size and ECC algorithm to be used for matrix code (2D barcode) marker detection.
   * When matrix-code (2D barcode) marker detection is enabled (see arSetPatternDetectionMode)
   * then the size of the barcode pattern and the type of error checking and correction (ECC)
   * with which the markers were produced can be set via this function.
   * This setting is global to a given ARHandle; It is not possible to have two different matrix
   * code types in use at once.
   * @param type The type of matrix code (2D barcode) in use. Options include:
   * AR_MATRIX_CODE_3x3
   * AR_MATRIX_CODE_3x3_HAMMING63
   * AR_MATRIX_CODE_3x3_PARITY65
   * AR_MATRIX_CODE_4x4
   * AR_MATRIX_CODE_4x4_BCH_13_9_3
   * AR_MATRIX_CODE_4x4_BCH_13_5_5
   * The default mode is AR_MATRIX_CODE_3x3.
   */
  setMatrixCodeType(type) {
    return this.artoolkit.setMatrixCodeType(this.id, type);
  };

  /**
   * Returns the current matrix code (2D barcode) marker detection type.
   * @return {number} The current matrix code type.
   */
  getMatrixCodeType() {
    return this.artoolkit.getMatrixCodeType(this.id);
  };

  /**
   * Select between detection of black markers and white markers.
   * ARToolKit's labelling algorithm can work with both black-bordered
   * markers on a white background (AR_LABELING_BLACK_REGION) or
   * white-bordered markers on a black background (AR_LABELING_WHITE_REGION).
   * This function allows you to specify the type of markers to look for.
   * Note that this does not affect the pattern-detection algorith
   * which works on the interior of the marker.
   * @param {number} mode
   * Options for this field are:
   * AR_LABELING_WHITE_REGION
   * AR_LABELING_BLACK_REGION
   * The default mode is AR_LABELING_BLACK_REGION.
   */
  setLabelingMode(mode) {
    return this.artoolkit.setLabelingMode(this.id, mode);
  };

  /**
   * Enquire whether detection is looking for black markers or white markers.
   * See discussion for setLabelingMode.
   * @result {number} The current labeling mode.
   */
  getLabelingMode() {
    return this.artoolkit.getLabelingMode(this.id);
  };

  /**
   * Set the width/height of the marker pattern space, as a proportion of marker width/height.
   * @param {number} pattRatio The the width/height of the marker pattern space, as a proportion of marker
   * width/height. To set the default, pass AR_PATT_RATIO.
   * If compatibility with ARToolKit verions 1.0 through 4.4 is required, this value
   * must be 0.5.
   */
   setPattRatio(pattRatio) {
    return this.artoolkit.setPattRatio(this.id, pattRatio);
  };

  /**
   * Returns the current ratio of the marker pattern to the total marker size.
   * @return {number} The current pattern ratio.
   */
  getPattRatio() {
    return this.artoolkit.getPattRatio(this.id);
  };

  /**
   * Set the image processing mode.
   * When the image processing mode is AR_IMAGE_PROC_FRAME_IMAGE,
   * ARToolKit processes all pixels in each incoming image
   * to locate markers. When the mode is AR_IMAGE_PROC_FIELD_IMAGE,
   * ARToolKit processes pixels in only every second pixel row and
   * column. This is useful both for handling images from interlaced
   * video sources (where alternate lines are assembled from alternate
   * fields and thus have one field time-difference, resulting in a
   * "comb" effect) such as Digital Video cameras.
   * The effective reduction by 75% in the pixels processed also
   * has utility in accelerating tracking by effectively reducing
   * the image size to one quarter size, at the cost of pose accuraccy.
   * @param {number} mode
   * Options for this field are:
   * AR_IMAGE_PROC_FRAME_IMAGE
   * AR_IMAGE_PROC_FIELD_IMAGE
   * The default mode is AR_IMAGE_PROC_FRAME_IMAGE.
   */
  setImageProcMode(mode) {
    return this.artoolkit.setImageProcMode(this.id, mode);
  };

  /**
   * Get the image processing mode.
   * See arSetImageProcMode() for a complete description.
   * @return {number} The current image processing mode.
   */
  getImageProcMode() {
    return this.artoolkit.getImageProcMode(this.id);
  };


  // private accessors
  //----------------------------------------------------------------------------

  /**
   * This function init the ArController with the necessary parmeters and variables.
   * Don't call directly this but instead instantiate a new ArController.
   * @return {ARController} The initialized ARController instance
   */
  async _initialize() {

    // initialize the toolkit
    this.artoolkit = await new ARToolkit().init();
    console.log('[ARController]', 'ARToolkit initialized');

    // load the camera
    this.cameraId = await this.artoolkit.loadCamera(this.cameraParam);
    console.log('[ARController]', 'Camera params loaded with ID', this.cameraId);

    // setup
    this.id = this.artoolkit.setup(this.width, this.height, this.cameraId);
    console.log('[ARController]', 'Got ID from setup', this.id);

    this._initNFT();

    let params = artoolkit.frameMalloc;
    this.framepointer = params.framepointer;
    this.framesize = params.framesize;
    this.videoLumaPointer = params.videoLumaPointer;

    this.dataHeap = new Uint8Array(this.artoolkit.instance.HEAPU8.buffer, this.framepointer, this.framesize);
    this.videoLuma = new Uint8Array(this.artoolkit.instance.HEAPU8.buffer, this.videoLumaPointer, this.framesize / 4);

    this.camera_mat = new Float64Array(this.artoolkit.instance.HEAPU8.buffer, params.camera, 16);
    this.marker_transform_mat = new Float64Array(this.artoolkit.instance.HEAPU8.buffer, params.transform, 12);

    this.setProjectionNearPlane(0.1)
    this.setProjectionFarPlane(1000);

    setTimeout(() => {
      this.dispatchEvent({
        name: 'load',
        target: this
      });
    }, 1);

    return this;
  }

  /**
   * Init the necessary kpm handle for NFT and the settings for the CPU.
   * @return {number} 0 (void)
   */
  _initNFT() {
    this.artoolkit.setupAR2(this.id);
  };


  /**
   * Copy the Image data to the HEAP for the debugSetup function.
   * @return {number} 0 (void)
   */
  _copyImageToHeap(sourceImage) {

    if(!sourceImage) {
    // default to preloaded image
      sourceImage = this.image;
    }

    // this is of type Uint8ClampedArray:
    // The Uint8ClampedArray typed array represents an array of 8-bit unsigned
    // integers clamped to 0-255
    // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray
    let data;

    if(sourceImage.data) {

      // directly use source image
      data = sourceImage.data;

    } else {

      this.ctx.save();

      if(this.orientation === 'portrait') {
        this.ctx.translate(this.canvas.width, 0);
        this.ctx.rotate(Math.PI / 2);
        this.ctx.drawImage(sourceImage, 0, 0, this.canvas.height, this.canvas.width); // draw video
      } else {
        this.ctx.drawImage(sourceImage, 0, 0, this.canvas.width, this.canvas.height); // draw video
      }

      this.ctx.restore();

      let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      data = imageData.data;
    }

    // Here we have access to the unmodified video image. We now need to add the videoLuma chanel to be able to serve the underlying ARTK API
    if(this.videoLuma) {

      let q = 0;

      // Create luma from video data assuming Pixelformat AR_PIXEL_FORMAT_RGBA
      // see (ARToolKitJS.cpp L: 43)
      for(let p = 0; p < this.videoSize; p++) {
        let r = data[q + 0], g = data[q + 1], b = data[q + 2];
        // @see https://stackoverflow.com/a/596241/5843642
        this.videoLuma[p] = (r + r + r + b + g + g + g + g) >> 3;
        q += 4;
      }
    }

    if(this.dataHeap) {
      this.dataHeap.set(data);
      return true;
    }

    return false;
  };

}
import ARToolkit from './ARToolkit';

export default class ARController {

  constructor(width, height, cameraParam) {

    // @TODO: no point in initializing a member as "undefined"
    // probably replace it with -1 
    this.id = undefined;

    this.width = width;
    this.height = height;

    // holds an image in case the instance was initialized with an image
    this.image;

    // default camera orientation
    this.orientation = 'landscape';

    // this is a replacement for ARCameraParam
    this.cameraParam = cameraParam;
    this.cameraId = -1;
    this.cameraLoaded = false;

    // toolkit instance
    this.artoolkit;

    // to register observers as event listeners
    this.listeners = {};

    this.nftMarkerCount = 0;

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

/*
// @TODO: enable?
    if(typeof document !== 'undefined') {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
    }
*/
  }

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
  //-----

  // initializers
  static async initWithDimensions(width, height, cameraParam) {

    // directly init with given width / height
    const controller = new ARController(width, height, cameraParam);
    return await controller._initialize();
  }

  static async initWithImage(image, cameraParam) {

    // get width / height from image / video
    const width = image.videoWidth || image.width;
    const height = image.videoHeight || image.height;

    const controller = new ARController(width, height, cameraParam);
    controller.image = image;
    return await controller._initialize();
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

    if(this.image && this.image.srcObject) {
      // @TODO: enable
      //ARController._teardownVideo(this.image);
    }

    // @TODO: seriously?
    for(let t in this) {
      this[t] = null;
    }
  };
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
    let listeners = this.listeners[event.name];
    if(listeners) {
      for(let i = 0; i < listeners.length; i++) {
        listeners[i].call(this, event);
      }
    }
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
   * @see	setDebugMode()
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
   * Init the necessary kpm handle for NFT and the settings for the CPU.
   * @return {number} 0 (void)
  */
  _initNFT() {
    this.artoolkit.setupAR2(this.id);
  };

}
export default class ARController {
    /**
     * Static initializer, the preferred way to init the whole app.
     * You must provide width and height of the video, and the url of the camera parameter file.
     * @param {number} width
     * @param {number} height
     * @param {string} cameraParam
     * @param {object} [options]
     * @returns {Promise<ARController>}
     */
    static initWithDimensions(width: number, height: number, cameraParam: string, options?: object): Promise<ARController>;
    /**
     * Static initializer with an image element.
     * You must provide an image element, and the url of the camera parameter file.
     * @param {HTMLImageElement} image
     * @param {string} cameraParam
     * @param {object} [options]
     * @returns {Promise<ARController>}
     */
    static initWithImage(image: HTMLImageElement, cameraParam: string, options?: object): Promise<ARController>;
    /**
     * The ARController constructor. Init a new instance of the class with
     * width, height of the Image/Video, the url of Camera parameter file, and other options.
     * @param {number} width of the Image/Video source.
     * @param {number} height of the Image/Video source.
     * @param {string} cameraParam url.
     * @param {object} [options]
     */
    constructor(width: number, height: number, cameraParam: string, options?: object);
    /**
    * @private
    */
    private options;
    /**
     * @private
     */
    private id;
    /**
     * @private
     */
    private width;
    /**
     * @private
     */
    private height;
    /**
     * @private
     */
    private orientation;
    /**
     * @private
     */
    private cameraParam;
    /**
     * @private
     */
    private cameraId;
    /**
     * @private
     */
    private cameraLoaded;
    /**
     * @private
     */
    private listeners;
    /**
     * @private
     */
    private defaultMarkerWidth;
    /**
     * @private
     */
    private patternMarkers;
    /**
     * @private
     */
    private barcodeMarkers;
    /**
     * @private
     */
    private nftMarkers;
    /**
     * @private
     */
    private transform_mat;
    /**
    * @private
    */
    private transformGL_RH;
    /**
     * @private
     */
    private videoWidth;
    /**
     * @private
     */
    private videoHeight;
    /**
     * @private
     */
    private videoSize;
    /**
     * @private
     */
    private framepointer;
    /**
     * @private
     */
    private framesize;
    /**
     * @private
     */
    private dataHeap;
    /**
     * @private
     */
    private videoLuma;
    /**
     * @private
     */
    private camera_mat;
    /**
     * @private
     */
    private marker_transform_mat;
    /**
     * @private
     */
    private videoLumaPointer;
    /**
     * @private
     */
    private canvas;
    /**
     * @private
     */
    private ctx;
    /**
     * @private
     */
    private nftMarkerFound;
    /**
     * @private
     */
    private nftMarkerFoundTime;
    /**
     * @private
     */
    private nftMarkerCount;
    /**
     * @private
     */
    private _bwpointer;
    /**
     * Dispose the instance of the class, with all associated objects.
     * @returns {void}
     */
    dispose(): void;
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
     * @param {HTMLImageElement | HTMLVideoElement} image The image to process [optional].
     * @returns {void}
     */
    process(image: HTMLImageElement | HTMLVideoElement): void;
    /**
     * Detects the NFT markers in the process() function,
     * with the given tracked id.
     * @returns {number}
     */
    detectNFTMarker(): number;
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
    trackPatternMarkerId(id: number, markerWidth?: number): any;
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
    trackBarcodeMarkerId(id: number, markerWidth?: number): any;
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
    trackNFTMarkerId(id: number, markerWidth: number): any;
    /**
     * Returns the number of multimarkers registered on this ARController.
     * @return {number} Number of multimarkers registered.
     */
    getMultiMarkerCount(): number;
    /**
     * Returns the number of markers in the multimarker registered for the given multiMarkerId.
     * @param {number} multiMarkerId The id number of the multimarker to access. Given by loadMultiMarker.
     * @return {number} Number of markers in the multimarker. Negative value indicates failure to find the multimarker.
     */
    getMultiMarkerPatternCount(multiMarkerId: number): number;
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
     * @returns {void}
     */
    addEventListener(name: string, callback: Function): void;
    /**
     * Remove an event listener from the named event.
     * @param {string} name Name of the event to stop listening to.
     * @param {function} callback Callback function to remove from the listeners of the named event.
     * @returns {void}
     */
    removeEventListener(name: string, callback: Function): void;
    /**
     * Dispatches the given event to all registered listeners on event.name.
     * @param {any} event Event to dispatch.
     * @returns {void}
     */
    dispatchEvent(event: any): void;
    /**
     * Sets up a debug canvas for the AR detection.
     * Draws a red marker on top of each detected square in the image.
     * The debug canvas is added to document.body.
     * @returns {void}
     */
    debugSetup(): void;
    /**
     * Draw the black and white image and debug markers to the ARController canvas.
     * See setDebugMode.
     * @return {void}
     */
    debugDraw(): void;
    /**
     * Draw a square black border around the detect marker with
     * red circle in the center. Used for debugging porpouse in debugSetup.
     * @return {void} (void)
     */
    drawDebugMarker(marker: any): void;
    /**
     * Loads a pattern marker from the given URL or data string
     * @param {string} urlOrData - The URL or data of the marker pattern file to load.
     * @return {Promise<number>}
     */
    loadMarker(urlOrData: string): Promise<number>;
    /**
     * Loads a multimarker from the given URL and calls the onSuccess callback with the UID of the marker.
     * @param {string} urlOrData - The URL of the multimarker pattern file to load.
     * @returns {Promise<any[]>}
     */
    loadMultiMarker(urlOrData: string): Promise<any[]>;
    /**
     * Loads an NFT marker from the given URL or data string
     * @param {string} urlOrData - The URL prefix or data of the NFT markers to load.
     * @returns {Promise<number>}
    */
    loadNFTMarker(urlOrData: string): Promise<number>;
    /**
     * Populates the provided float array with the current transformation for the specified marker. After
     * a call to detectMarker, all marker information will be current. Marker transformations can then be
     * checked.
     * @param {number} markerUID  The unique identifier (UID) of the marker to query
     * @param {number} markerWidth  The width of the marker
     * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
     * @return  {Float64Array} The dst array.
     */
    getTransMatSquare(markerUID: number, markerWidth: number, dst: Float64Array): Float64Array;
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
    getTransMatSquareCont(markerUID: number, markerWidth: number, previousMarkerTransform: Float64Array, dst: Float64Array): Float64Array;
    /**
     * Populates the provided float array with the current transformation for the specified multimarker. After
     * a call to detectMarker, all marker information will be current. Marker transformations can then be
     * checked.
     * @param {number} markerUID  The unique identifier (UID) of the marker to query
     * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
     * @return  {Float64Array} The dst array.
     */
    getTransMatMultiSquare(markerUID: number, dst: Float64Array): Float64Array;
    /**
     * Populates the provided float array with the current robust transformation for the specified multimarker. After
     * a call to detectMarker, all marker information will be current. Marker transformations can then be
     * checked.
     * @param {number} markerUID  The unique identifier (UID) of the marker to query
     * @param {Float64Array} dst  The float array to populate with the 3x4 marker transformation matrix
     * @return  {Float64Array} The dst array.
     */
    getTransMatMultiSquareRobust(markerUID: number, dst: Float64Array): Float64Array;
    /**
     * Converts the given 3x4 marker transformation matrix in the 12-element transMat array
     * into a 4x4 WebGL matrix and writes the result into the 16-element glMat array.
     * If scale parameter is given, scales the transform of the glMat by the scale parameter.
     * m {Float64Array} transMat The 3x4 marker transformation matrix.
     * @param {Float64Array} glMat The 4x4 GL transformation matrix.
     * @param {number} scale The scale for the transform.
     * @returns {Float64Array} glMat The 4x4 GL transformation matrix.
     */
    transMatToGLMat(transMat: any, glMat: Float64Array, scale: number): Float64Array;
    /**
     * Converts the given 4x4 openGL matrix in the 16-element transMat array
     * into a 4x4 OpenGL Right-Hand-View matrix and writes the result into the 16-element glMat array.
     * If scale parameter is given, scales the transform of the glMat by the scale parameter.
     * @param {Float64Array} glMatrix The 4x4 marker transformation matrix.
     * @param {Float64Array} [glRhMatrix] The 4x4 GL right hand transformation matrix.
     * @param {number} [scale] The scale for the transform.
     * @returns {Float64Array} glRhMatrix The 4x4 GL right hand transformation matrix.
     */
    arglCameraViewRHf(glMatrix: Float64Array, glRhMatrix?: Float64Array, scale?: number): Float64Array;
    /**
     * This is the core ARToolKit marker detection function. It calls through to a set of
     * internal functions to perform the key marker detection steps of binarization and
     * labelling, contour extraction, and template matching and/or matrix code extraction.
     * Typically, the resulting set of detected markers is retrieved by calling arGetMarkerNum
     * to get the number of markers detected and arGetMarker to get an array of ARMarkerInfo
     * structures with information on each detected marker, followed by a step in which
     * detected markers are possibly examined for some measure of goodness of match (e.g. by
     * examining the match confidence value) and pose extraction.
     * @param {HTMLImageElement | HTMLVideoElement} image to be processed to detect markers.
     * @return {number} 0 if the function proceeded without error, or a value less than 0 in case of error.
     * A result of 0 does not however, imply any markers were detected.
     */
    detectMarker(image: HTMLImageElement | HTMLVideoElement): number;
    /**
     * Get the number of markers detected in a video frame.
     * @return {number} The number of detected markers in the most recent image passed to arDetectMarker.
     * Note that this is actually a count, not an index. A better name for this function would be
     * arGetDetectedMarkerCount, but the current name lives on for historical reasons.
     */
    getMarkerNum(): number;
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
     * @returns {object} The markerInfo struct.
     */
    getMarker(markerIndex: number): object;
    /**
     * Get the NFT marker info struct for the given NFT marker index in detected markers.
     * The returned object is the global artoolkit.NFTMarkerInfo object and will be overwritten
     * by subsequent calls.
     * Returns undefined if no marker was found.
     * A markerIndex of -1 is used to access the global custom marker.
     * @param {number} markerIndex The index of the NFT marker to query.
     * @returns {object} The NFTmarkerInfo struct.
     */
    getNFTMarker(markerIndex: number): object;
    /**
     * Useful function to get NFT data of the loaded marker (width, height and dpi).
     * @param {number} id the internal id
     * @param {number} index the index of the NFT marker
     * @returns {object} width, height and dpi of the NFT marker
     */
    getNFTData(id: number, index: number): object;
    /**
     * Set marker vertices to the given vertexData[4][2] array.
     * Sets the marker pos to the center of the vertices.
     * Useful for building custom markers for getTransMatSquare.
     * A markerIndex of -1 is used to access the global custom marker.
     * @param {number} markerIndex The index of the marker to edit.
     * @param {any[]} vertexData
     * @returns {number}
     */
    setMarkerInfoVertex(markerIndex: number, vertexData: any[]): number;
    /**
     * Makes a deep copy of the given marker info.
     * @param {object} markerInfo The marker info object to copy.
     * @return {object} The new copy of the marker info.
     */
    cloneMarkerInfo(markerInfo: object): object;
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
     * @returns {object} The markerInfo struct.
     */
    getMultiEachMarker(multiMarkerId: number, markerIndex: number): object;
    /**
     * Returns the 16-element WebGL transformation matrix used by ARController.process to
     * pass marker WebGL matrices to event listeners.
     * Unique to each ARController.
     * @return {Float64Array} The 16-element WebGL transformation matrix used by the ARController.
     */
    getTransformationMatrix(): Float64Array;
    /**
     * Returns the projection matrix computed from camera parameters for the ARController.
     * @return {Float64Array} The 16-element WebGL camera matrix for the ARController camera parameters.
     */
    getCameraMatrix(): Float64Array;
    /**
     * Returns the shared ARToolKit 3x4 marker transformation matrix, used for passing and receiving
     * marker transforms to/from the Emscripten side.
     * @return {Float64Array} The 12-element 3x4 row-major marker transformation matrix used by ARToolKit.
     */
    getMarkerTransformationMatrix(): Float64Array;
    /**
     * Enables or disables debug mode in the tracker. When enabled, a black and white debug
     * image is generated during marker detection. The debug image is useful for visualising
     * the binarization process and choosing a threshold value.
     * @param {boolean} mode true to enable debug mode, false to disable debug mode
     * @see getDebugMode()
     * @returns {number}
     */
    setDebugMode(mode: boolean): number;
    /**
     * Returns whether debug mode is currently enabled.
     * @return {boolean} true when debug mode is enabled, false when debug mode is disabled
     * @see  setDebugMode()
     */
    getDebugMode(): boolean;
    /**
     * Returns the Emscripten HEAP offset to the debug processing image used by ARToolKit.
     * @return {number} HEAP offset to the debug processing image.
     */
    getProcessingImage(): number;
    /**
     * Sets the logging level to use by ARToolKit.
     * @param {number} mode type for the log level.
     * @returns {number}
     */
    setLogLevel(mode: number): number;
    /**
     * Gets the logging level used by ARToolKit.
     * @return {number} return the log level in use.
     */
    getLogLevel(): number;
    /**
     * Sets the dir (direction) of the marker. Direction that tells about the rotation
     * about the marker (possible values are 0, 1, 2 or 3).
     * This parameter makes it possible to tell about the line order of the detected marker
     * (so which line is the first one) and so find the first vertex.
     * This is important to compute the transformation matrix in arGetTransMat().
     * @param {number} markerIndex the index of the marker
     * @param {number} dir direction of the marker (possible values are 0, 1, 2 or 3).
     * @return {number}
     */
    setMarkerInfoDir(markerIndex: number, dir: number): number;
    /**
     * Sets the value of the near plane of the camera.
     * @param {number} value the value of the near plane
     * @return {number}
     */
    setProjectionNearPlane(value: number): number;
    /**
     * Gets the value of the near plane of the camera with the give id.
     * @return {number} the value of the near plane.
     */
    getProjectionNearPlane(): number;
    /**
     * Sets the value of the far plane of the camera.
     * @param {number} value the value of the far plane
     * @return {number}
     */
    setProjectionFarPlane(value: number): number;
    /**
     * Gets the value of the far plane of the camera with the give id.
     * @return {number} the value of the far plane.
     */
    getProjectionFarPlane(): number;
    /**
     * Set the labeling threshold mode (auto/manual).
     * @param {number} mode An integer specifying the mode. One of:
     * AR_LABELING_THRESH_MODE_MANUAL,
     * AR_LABELING_THRESH_MODE_AUTO_MEDIAN,
     * AR_LABELING_THRESH_MODE_AUTO_OTSU,
     * AR_LABELING_THRESH_MODE_AUTO_ADAPTIVE,
     * AR_LABELING_THRESH_MODE_AUTO_BRACKETING
     * @returns {number}
     */
    setThresholdMode(mode: number): number;
    /**
     * Gets the current threshold mode used for image binarization.
     * @return {number} The current threshold mode
     * @see getVideoThresholdMode()
     */
    getThresholdMode(): number;
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
     * @returns {number}
     */
    setThreshold(threshold: number): number;
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
    getThreshold(): number;
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
     * @returns {number}
     * Options for this field are:
     * AR_TEMPLATE_MATCHING_COLOR
     * AR_TEMPLATE_MATCHING_MONO
     * AR_MATRIX_CODE_DETECTION
     * AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX
     * AR_TEMPLATE_MATCHING_MONO_AND_MATRIX
     * The default mode is AR_TEMPLATE_MATCHING_COLOR.
     */
    setPatternDetectionMode(mode: number): number;
    /**
     * Returns the current pattern detection mode.
     * @return {number} The current pattern detection mode.
     */
    getPatternDetectionMode(): number;
    /**
     * Set the size and ECC algorithm to be used for matrix code (2D barcode) marker detection.
     * When matrix-code (2D barcode) marker detection is enabled (see arSetPatternDetectionMode)
     * then the size of the barcode pattern and the type of error checking and correction (ECC)
     * with which the markers were produced can be set via this function.
     * This setting is global to a given ARHandle; It is not possible to have two different matrix
     * code types in use at once.
     * @param {any} type The type of matrix code (2D barcode) in use. Options include:
     * AR_MATRIX_CODE_3x3
     * AR_MATRIX_CODE_3x3_HAMMING63
     * AR_MATRIX_CODE_3x3_PARITY65
     * AR_MATRIX_CODE_4x4
     * AR_MATRIX_CODE_4x4_BCH_13_9_3
     * AR_MATRIX_CODE_4x4_BCH_13_5_5
     * AR_MATRIX_CODE_5x5_BCH_22_12_5
     * AR_MATRIX_CODE_5x5_BCH_22_7_7
     * AR_MATRIX_CODE_5x5
     * AR_MATRIX_CODE_6x6
     * The default mode is AR_MATRIX_CODE_3x3.
     * @returns {number}
     */
    setMatrixCodeType(type: any): number;
    /**
     * Returns the current matrix code (2D barcode) marker detection type.
     * @return {number} The current matrix code type.
     */
    getMatrixCodeType(): number;
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
     * @returns {number}
     */
    setLabelingMode(mode: number): number;
    /**
     * Enquire whether detection is looking for black markers or white markers.
     * See discussion for setLabelingMode.
     * @return {number} The current labeling mode.
     */
    getLabelingMode(): number;
    /**
     * Set the width/height of the marker pattern space, as a proportion of marker width/height.
     * @param {number} pattRatio The the width/height of the marker pattern space, as a proportion of marker
     * width/height. To set the default, pass AR_PATT_RATIO.
     * If compatibility with ARToolKit verions 1.0 through 4.4 is required, this value
     * must be 0.5.
     * @returns {number}
     */
    setPattRatio(pattRatio: number): number;
    /**
     * Returns the current ratio of the marker pattern to the total marker size.
     * @return {number} The current pattern ratio.
     */
    getPattRatio(): number;
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
     * @returns {number}
     */
    setImageProcMode(mode: number): number;
    /**
     * Get the image processing mode.
     * See arSetImageProcMode() for a complete description.
     * @return {number} The current image processing mode.
     */
    getImageProcMode(): number;
    /**
     * This function init the ArController with the necessary parmeters and variables.
     * Don't call directly this but instead instantiate a new ArController.
     * @return {ARController} The initialized ARController instance
     * @private
     */
    private _initialize;
    artoolkit: ARToolkit;
    /**
     * Init the necessary kpm handle for NFT and the settings for the CPU.
     * @return {number}
     * @private
     */
    private _initNFT;
    /**
     * Copy the Image data to the HEAP for the debugSetup function.
     * @return {number}
     * @private
     */
    private _copyImageToHeap;
}
import ARToolkit from "./ARToolkit";
//# sourceMappingURL=ARController.d.ts.map

# artoolkit5-js

ES6 module port of [artoolkit5](https://github.com/artoolkitx/artoolkit5). Based on the (now defunct) original [Emscripten to JavaScript port](github.com/artoolkit/jsartoolkit5) and [improved](https://github.com/kalwalt/jsartoolkit5) by [Walter Perdan](https://github.com/kalwalt).

This build is uses WASM for best possible performance and is designed to be (more or less) a drop-in replacement for the previous jsartoolkit5. Some parts of the previous API have been refactored to implement an async interface instead of the previous callback based interface.

## Installation

Install the module via NPM:
```
npm install artoolkit5-js
```
The module is built in UMD format and can be used in different environments:

### Browser
```
<script src="/path/to/ARToolkit.js"></script>
```

### Node.js
```
const ARToolkit = require('artoolkit5-js');
```

### ES6 Import
```
import ARToolkit from 'artoolkit5-js';
```

## Usage

### 1) Create controller instance

First you need to create an instance of `ARController`:

```
ARController.initWithDimensions(640, 480, '/data/camera_para.dat').then(controller => { ... });
```
This will create an ARController instance expecting source images of dimensions 640x480. The second parameter is a camera definition file which describes the characteristics of your image / video input device. If you don't know which file to use just use the default [camera_para.dat](https://github.com/andypotato/artoolkit5-js/blob/master/data/camera_para.dat) included with this repository.

There is an alternative initializer `initWithImage` available as convenience method which accepts an `HTMLImageElement` or `HTMLVideoElement` instead of width / height. However this obviously only works in Browser (or MonkeyPatched) environments.

### 2) Add markers you want to track

Next you need to load the marker files to track with your controller. In this example the pattern file for the "Hiro" marker is loaded:

```
controller.artoolkit.addMarker(controller.id, '/data/hiro.patt').then(hiroMarkerId => { ... });
```

### 3) Start tracking

```
// track with 60 FPS
const FPS = 60;

setInterval(() => {

  const result = controller.detectMarker();
  if(result !== 0) {
    // ARToolkit returning a value !== 0 means an error occured
    console.log('Error detecting markers');
    return;
  }

  // get the total number of detected markers in frame
  const markerNum = controller.getMarkerNum();
  let hiroFound = false;

  // check if one of the detected markers is the "Hiro" marker
  for(let i = 0; i < markerNum; i++) {
    const markerInfo = controller.getMarker(i);
    if(markerInfo.idPatt == hiroMarkerId) {
      // store the marker ID from the detection result
      hiroFound = i;
      break;
    }
  }

  if(hiroFound !== false) {
	console.log("You have found the HIRO marker");
  }

}, 1000 / FPS);
```

## Other ARToolkit API methods

You can access all public ARToolkit methods and class constants like this:
```
  // for the full API documentation see
  // https://github.com/artoolkit/artoolkit5
  artoolkit.detectMarker( ... );

  console.log(artoolkit.AR_LOG_LEVEL_DEBUG);
```

## Current limitations
Due to time constraints this build does not implement NFT and multimarker support (yet). Adding support for both should be trivial though as all the groundwork has already been laid out. I will implement it once time allows but PRs are of course welcome!

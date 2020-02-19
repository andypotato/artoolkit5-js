# artoolkit5-js

ES6 module port of [artoolkit5](https://github.com/artoolkitx/artoolkit5). Based on the (now defunct) original [Emscripten to JavaScript port](github.com/artoolkit/jsartoolkit5) and [improved](https://github.com/kalwalt/jsartoolkit5) by [Walter Perdan](https://github.com/kalwalt).

This build is uses WASM for best possible performance.

## Usage

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

After successfully importing the module you need to initialize it using the
`init()` method:

```
const artoolkit = new ARToolkit();
artoolkit.init()
.then(_ => {
  return artoolkit.loadCamera('/data/camera_para.dat');
})
.then(cameraId => {
  console.log('Got camera ID', cameraId);
})
.catch(err => {
  console.log('Something went wrong', err);
});
```

You can access all public ARToolkit methods and class constants like this:
```
  // for the full API documentation see
  // https://github.com/artoolkitx/artoolkit5
  artoolkit.detectMarker( ... );

  console.log(artoolkit.AR_LOG_LEVEL_DEBUG);
```


  


# artoolkit5-js

ES6 module port of [artoolkit5](https://github.com/artoolkitx/artoolkit5). Based on the original [Emscripten to JavaScript port](https://github.com/mikocml/jsartoolkit5) created by [@miko](https://github.com/mikocml) and [improved](https://github.com/kalwalt/jsartoolkit5) by [Walter Perdan](https://github.com/kalwalt).

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

After successfully importing the module in your environment you can create an instance of the runtime using the `init` method:
```
ARToolkit.init().then(runtime => {
  // runtime.instance is now a reference to the artoolkitx library
  // for documentation and usage examples see
  // see https://github.com/artoolkitx/artoolkit5
  console.log(runtime.instance);
});
```

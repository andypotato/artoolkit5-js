import Module from './artoolkit5/artoolkit.debug.js';

export default class ARToolkit {

  // construction
  constructor() {

    // reference the library
    this.instance;
  }
  //----------------------------------------------------------------------------

  // module initialization
  init() {

    let $clazz = this;

    return new Promise(resolve => {
      Module({
        onRuntimeInitialized() {
          $clazz.instance = this;
          resolve();
        }
      });
    });
  }
  //----------------------------------------------------------------------------
}
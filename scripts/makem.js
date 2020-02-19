/*
 * Simple script for running emcc on ARToolKit
 * @author zz85 github.com/zz85
 * @author ThorstenBux github.com/ThorstenBux
 */

var exec = require('child_process').exec,
    path = require('path'),
    fs = require('fs'),
    os = require('os'),
    child;

const platform = os.platform();

// enable NFT functionality
var HAVE_NFT = 1;

var EMSCRIPTEN_ROOT = process.env.EMSCRIPTEN;
var ARTOOLKIT5_ROOT = process.env.ARTOOLKIT5_ROOT || path.resolve(__dirname, "../lib/artoolkit5");

if(!EMSCRIPTEN_ROOT) {
  console.log("\nWarning: EMSCRIPTEN environment variable not found.")
  console.log("If you get a \"command not found\" error,\ndo `source <path to emsdk>/emsdk_env.sh` and try again.");
}

var EMCC = EMSCRIPTEN_ROOT ? path.resolve(EMSCRIPTEN_ROOT, 'emcc') : 'emcc';
var OPTIMIZE_FLAGS = ' -Oz '; // -Oz for smallest size
var MEM = 256 * 1024 * 1024; // 64MB

var SOURCE_PATH = path.resolve(__dirname, '../lib/') + '/';
var OUTPUT_PATH = path.resolve(__dirname, '../src/artoolkit5/') + '/';

var BUILD_DEBUG_FILE = 'artoolkit.debug.js';
var BUILD_MIN_FILE = 'artoolkit.min.js';
var BUILD_WASM_FILE = 'artoolkit_wasm.js';

if(!fs.existsSync(path.resolve(ARTOOLKIT5_ROOT, 'include/AR/config.h'))) {
  console.log("Renaming and moving config.h.in to config.h");
  fs.copyFileSync(
    path.resolve(ARTOOLKIT5_ROOT, 'include/AR/config.h.in'),
    path.resolve(ARTOOLKIT5_ROOT, 'include/AR/config.h')
  );
  console.log("Done!");
}

var MAIN_SOURCES = [
  'ARToolKitJS.cpp',
  'trackingMod.c',
  'trackingMod2d.c'
].map(function(src) {
  return path.resolve(SOURCE_PATH, src);
}).join(' ');

let ar_sources;

if(platform === 'win32') {

  var glob = require("glob");

  function match(pattern) {
    var r = glob.sync('lib/artoolkit5/lib/SRC/' + pattern);
    return r;
  }

  function matchAll(patterns, prefix="") {
    let r = [];
    for(let pattern of patterns) {
      r.push(...(match(prefix + pattern)));
    }
    return r;
  }

  ar_sources = matchAll([
    'AR/arLabelingSub/*.c',
    'AR/*.c',
    'ARICP/*.c',
    'ARMulti/*.c',
    'Video/video.c',
    'ARUtil/log.c',
    'ARUtil/file_utils.c',
  ]);

} else {

  ar_sources = [
    'AR/arLabelingSub/*.c',
    'AR/*.c',
    'ARICP/*.c',
    'ARMulti/*.c',
    'Video/video.c',
    'ARUtil/log.c',
    'ARUtil/file_utils.c',
  ].map(function(src) {
    return path.resolve(__dirname, ARTOOLKIT5_ROOT + '/lib/SRC/', src);
  });
}

var ar2_sources = [
  'handle.c',
  'imageSet.c',
  'jpeg.c',
  'marker.c',
  'featureMap.c',
  'featureSet.c',
  'selectTemplate.c',
  'surface.c',
  'tracking.c',
  'tracking2d.c',
  'matching.c',
  'matching2.c',
  'template.c',
  'searchPoint.c',
  'coord.c',
  'util.c',
].map(function(src) {
  return path.resolve(__dirname, ARTOOLKIT5_ROOT + '/lib/SRC/AR2/', src);
});

var kpm_sources = [
  'kpmHandle.cpp',
  'kpmRefDataSet.cpp',
  'kpmMatching.cpp',
  'kpmResult.cpp',
  'kpmUtil.cpp',
  'kpmFopen.c',
  'FreakMatcher/detectors/DoG_scale_invariant_detector.cpp',
  'FreakMatcher/detectors/gaussian_scale_space_pyramid.cpp',
  'FreakMatcher/detectors/gradients.cpp',
  'FreakMatcher/detectors/harris.cpp',
  'FreakMatcher/detectors/orientation_assignment.cpp',
  'FreakMatcher/detectors/pyramid.cpp',
  'FreakMatcher/facade/visual_database_facade.cpp',
  'FreakMatcher/matchers/hough_similarity_voting.cpp',
  'FreakMatcher/matchers/freak.cpp',
  'FreakMatcher/framework/date_time.cpp',
  'FreakMatcher/framework/image.cpp',
  'FreakMatcher/framework/logger.cpp',
  'FreakMatcher/framework/timers.cpp',
].map(function(src) {
  return path.resolve(__dirname, ARTOOLKIT5_ROOT + '/lib/SRC/KPM/', src);
});

if(HAVE_NFT) {
  ar_sources = ar_sources
  .concat(ar2_sources)
  .concat(kpm_sources);
}

var DEFINES = ' ';
if(HAVE_NFT) {
  DEFINES += ' -D HAVE_NFT ';
}

var FLAGS = '' + OPTIMIZE_FLAGS;
FLAGS += ' -Wno-warn-absolute-paths ';
FLAGS += ' -s TOTAL_MEMORY=' + MEM + ' ';
FLAGS += ' -s USE_ZLIB=1';
FLAGS += ' -s USE_LIBJPEG';
// @see https://github.com/emscripten-core/emscripten/issues/6061
FLAGS += ' -s "EXTRA_EXPORTED_RUNTIME_METHODS=[\'FS\']"';
FLAGS += ' --memory-init-file 0 '; // for memless file

var WASM_FLAGS = ' -s BINARYEN_TRAP_MODE=clamp -s SINGLE_FILE=1 ';

FLAGS += ' --bind ';

var MODULARIZE_FLAGS = ' -s EXPORT_ES6=1 -s USE_ES6_IMPORT_META=0 -s MODULARIZE=1 ';

/* DEBUG FLAGS */
var DEBUG_FLAGS = ' -g ';
DEBUG_FLAGS += ' -s ASSERTIONS=1 '
DEBUG_FLAGS += ' --profiling '
DEBUG_FLAGS += ' -s ALLOW_MEMORY_GROWTH=1';
DEBUG_FLAGS += ' -s DEMANGLE_SUPPORT=1 ';

var INCLUDES = [
  path.resolve(__dirname, ARTOOLKIT5_ROOT + '/include'),
  OUTPUT_PATH,
  SOURCE_PATH,
  path.resolve(__dirname, ARTOOLKIT5_ROOT + '/lib/SRC/KPM/FreakMatcher'),
].map(function(s) { return '-I' + s }).join(' ');

function format(str) {
  for(let f = 1; f < arguments.length; f++) {
    str = str.replace(/{\w*}/, arguments[f]);
  }
  return str;
}

function clean_builds() {

  try {
    var stats = fs.statSync(OUTPUT_PATH);
  } catch (e) {
    fs.mkdirSync(OUTPUT_PATH);
  }

  try {
    var files = fs.readdirSync(OUTPUT_PATH);
    if(files.length > 0) {
      for(let i = 0; i < files.length; i++) {
        let filePath = OUTPUT_PATH + '/' + files[i];
        if(fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
  catch(e) {
    return console.log(e);
  }
}

var compile_arlib = format(EMCC + ' ' + INCLUDES + ' '
    + ar_sources.join(' ')
    + FLAGS + ' ' + DEFINES + ' -o {OUTPUT_PATH}libar.bc ',
    OUTPUT_PATH);

var ALL_BC = " {OUTPUT_PATH}libar.bc ";

var compile_js_debug = format(EMCC + ' ' + INCLUDES + ' '
    + ALL_BC + MAIN_SOURCES
    + FLAGS + ' -s WASM=0' + ' '  + DEBUG_FLAGS + DEFINES + MODULARIZE_FLAGS + ' -o {OUTPUT_PATH}{BUILD_FILE} ',
    OUTPUT_PATH, OUTPUT_PATH, BUILD_DEBUG_FILE);

var compile_js_min = format(EMCC + ' ' + INCLUDES + ' '
    + ALL_BC + MAIN_SOURCES
    + FLAGS + ' -s WASM=0' + ' ' + DEFINES + MODULARIZE_FLAGS + ' -o {OUTPUT_PATH}{BUILD_FILE} ',
    OUTPUT_PATH, OUTPUT_PATH, BUILD_MIN_FILE);

var compile_wasm = format(EMCC + ' ' + INCLUDES + ' '
    + ALL_BC + MAIN_SOURCES
    + FLAGS + WASM_FLAGS + DEFINES + MODULARIZE_FLAGS + ' -o {OUTPUT_PATH}{BUILD_FILE} ',
    OUTPUT_PATH, OUTPUT_PATH, BUILD_WASM_FILE);

/*
 * Run commands
 */

function onExec(error, stdout, stderr) {
  if (stdout) console.log('stdout: ' + stdout);
  if (stderr) console.log('stderr: ' + stderr);
  if (error !== null) {
    console.log('exec error: ' + error.code);
    process.exit(error.code);
  } else {
    runJob();
  }
}

function runJob() {

  if(!jobs.length) {
    console.log('Jobs completed');
    return;
  }
  var cmd = jobs.shift();

  if(typeof cmd === 'function') {
    cmd();
    runJob();
    return;
  }

  console.log('\nRunning command: ' + cmd + '\n');
  exec(cmd, onExec);
}

var jobs = [];
function addJob(job) {
  jobs.push(job);
}

addJob(clean_builds);
addJob(compile_arlib);
addJob(compile_js_debug);
addJob(compile_js_min);
addJob(compile_wasm);

runJob();

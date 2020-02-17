const path = require('path');

module.exports = {
  entry: './src/ARToolkit.js',
  output: {
    path: path.resolve('dist'),
    filename: 'ARToolkit.js',
    library: 'ARToolkit',
    libraryTarget: 'umd',
    //umdNamedDefine: true,
    // @see: https://github.com/webpack/webpack/issues/3929
    libraryExport: 'default',
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }, {
          // @see https://github.com/emscripten-core/emscripten/issues/8729
          loader: require.resolve('@open-wc/webpack-import-meta-loader')
        }]
      },
    ],
  },
  resolve: {
    extensions: ['.js']
  },
  // @see https://stackoverflow.com/questions/59487224/webpack-throws-error-with-emscripten-cant-resolve-fs
  node: {
    'fs': 'empty'
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: false,
  }
};
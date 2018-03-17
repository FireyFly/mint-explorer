const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './js/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      }
    ],
  },
  plugins: [
    /*
    new UglifyJSPlugin({
      sourceMap: true,
      uglifyOptions: {
        ie8: false,
        ecma: 8,
        warnings: true,
      },
    }),
    */
  ],
  devtool: 'source-map',
}

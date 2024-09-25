const rules = require('./webpack.rules');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');  // Add path module import here

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    new NodePolyfillPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../frontend/.wasm'),  // Source folder with .wasm files
          to: path.resolve(__dirname, '../frontend/.webpack/main')  // Destination folder in .webpack/main
        }
      ]
    })
  ],
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    },
    extensions: ['.js', '.jsx'],
  },

};

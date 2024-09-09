const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');  // Add path module import here

module.exports = {
  entry: './src/main.js',

  module: {
    rules: require('./webpack.rules'),
  },

  experiments: {
    asyncWebAssembly: true
  },

  devServer: {
    historyApiFallback: true,  // This tells Webpack to serve index.html for all 404 routes
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

  externals: {
    'tree-sitter': 'commonjs tree-sitter'  // Ensure that Tree-sitter is properly resolved
  },

  resolve: {
    fallback: {
      fs: false,  // Disable fs, since it’s not needed for the browser
      path: require.resolve("path-browserify")  // Resolve path using path-browserify
    }
  }
};

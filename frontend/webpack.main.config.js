const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  entry: './src/main.js',

  module: {
    rules: require('./webpack.rules'),
  },

  plugins: [
    new NodePolyfillPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../frontend/.wasm'),  // Source folder with .wasm files
          to: path.resolve(__dirname, '../frontend/.webpack/main')  // Destination folder in .webpack/main
        },
        {
          from: path.resolve(__dirname, '../backend/dist/server'),  // Source folder with the server executable
          to: path.resolve(__dirname, '../frontend/.webpack/main')  // Destination folder in .webpack/main
        },
        {
          from: path.resolve(__dirname, '../backend/ollama'),  // Source folder with assets
          to: path.resolve(__dirname, '../frontend/.webpack/main/ollama')  // Destination folder in .webpack/main
        }
      ]
    }),
    new WebpackShellPluginNext({
      onBuildEnd: {
        scripts: ['chmod +x ../frontend/.webpack/main/server', 'chmod +x ../frontend/.webpack/main/ollama/ollama'],  // Set execute permission
        blocking: false,
        parallel: true
      }

    })
  ],

  externals: {
    'tree-sitter': 'commonjs tree-sitter', // Ensure that Tree-sitter is properly resolved
    'electron-reload': 'commonjs electron-reload'
  },

  resolve: {
    fallback: {
      fs: false,  // Disable fs, since it’s not needed for the browser
      path: require.resolve("path-browserify")  // Resolve path using path-browserify
    }
  },
};

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
          from: path.resolve(__dirname, '../frontend/.wasm'),
          to: path.resolve(__dirname, '../frontend/.webpack/main')
        },
        {
          from: path.resolve(__dirname, '../backend/dist/server'),
          to: path.resolve(__dirname, '../frontend/.webpack/main/backend/server')
        },
        {
          from: path.resolve(__dirname, '../backend/app/ollama'),
          to: path.resolve(__dirname, '../frontend/.webpack/main/backend/server/ollama')
        }
      ]
    }),
    new WebpackShellPluginNext({
      onBuildEnd: {
        scripts: [
          'chmod +x ../frontend/.webpack/main/backend/server/ollama/ollama',
          'chmod +x ../frontend/.webpack/main/backend/server/server',
        ],
        blocking: false,
        parallel: true
      }
    })
  ],

  externals: {
    'tree-sitter': 'commonjs tree-sitter',
    'electron-reload': 'commonjs electron-reload'
  },

  resolve: {
    alias: {
      '@codemirror/state': require.resolve('@codemirror/state'),
    },
    fallback: {
      fs: false,
      path: require.resolve("path-browserify")
    }
  },
};

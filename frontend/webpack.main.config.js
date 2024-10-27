const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');
const webpack = require('webpack');
const dotenv = require('dotenv');
const OpenPermissionsPlugin = require('./webpackPlugins/OpenPermissionPlugin');

// Load environment variables from .env file
const env = dotenv.config().parsed;

// Convert environment variables to a format suitable for DefinePlugin
const envKeys = Object.keys(env || {}).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  entry: './src/main.js',

  module: {
    rules: require('./webpack.rules'),
  },

  plugins: [
    new webpack.DefinePlugin(envKeys),
    new NodePolyfillPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../frontend/src/static'),
          to: path.resolve(__dirname, '../frontend/.webpack/main/static'),
        },
        {
          from: path.resolve(__dirname, '../frontend/.wasm'),
          to: path.resolve(__dirname, '../frontend/.webpack/main')
        },
        {
          from: path.resolve(__dirname, '../backend/dist/server'),
          to: path.resolve(__dirname, '../frontend/.webpack/main/Resources/server')
        },
        {
          from: path.resolve(__dirname, '../backend/app/ollama'),
          to: path.resolve(__dirname, '../frontend/.webpack/main/Resources/ollama')
        }
      ]
    }),

    new WebpackShellPluginNext({
      onBuildEnd: {
        scripts: [
          'chmod +x ../frontend/.webpack/main/Resources/ollama/ollama',
          'chmod +x ../frontend/.webpack/main/Resources/server/server',
        ],
        blocking: false,
        parallel: true
      }
    }),

    new OpenPermissionsPlugin({
      outputPath: path.resolve(__dirname, '../frontend/.webpack')
    })
  ],

  externals: {
    'tree-sitter': 'commonjs tree-sitter',
    'electron-reload': 'commonjs electron-reload'
  },

  resolve: {
    fallback: {
      fs: false,
      path: require.resolve("path-browserify")
    }
  },
};

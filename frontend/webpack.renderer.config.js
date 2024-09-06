const rules = require('./webpack.rules');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");


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
    new NodePolyfillPlugin()
  ],
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  },
  resolve: {
    fallback: {
      fs: false, // Don't bundle fs in the renderer
      path: require.resolve("path-browserify"), // Use a browser polyfill for path
    },
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};

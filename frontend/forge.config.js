const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    asarUnpack: "**/*.wasm",

    executableName: "fractal-x", // Set the correct name here
    icon: "./dist/images/fractal-X-logo.png", // Set the correct path here
    extraResource: [
      '../backend/app', // Path to the backend (assuming this is your FastAPI app folder)
      '../backend/server.py', // FastAPI server entry file
      '../backend/ollama',  // Include the Ollama binary
    ]

  },
  rebuildConfig: {},
  makers: [
    // Squirrel for Windows, ensure it is included for win32 platform
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'], // Ensure win32 is set
      config: {
        arch: 'x64', // You can also set arch to 'arm64' if needed
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        icon: './dist/images/fractal-X-logo.png', // Set the correct path here
      }
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

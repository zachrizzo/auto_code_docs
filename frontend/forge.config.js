const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
require('dotenv').config();


module.exports = {
  packagerConfig: {
    asar: true,
    asarUnpack: "**/*.wasm",
    executableName: "fractal-x",
    icon: "./dist/images/fractal-X-logo.png",
    extraResource: [
      '../backend/ollama',
      '../backend/dist/server'
    ],
    appBundleId: 'com.zachrizzo.fractalx',
    extendInfo: {
      LSMinimumSystemVersion: '10.15.0',
      CFBundleVersion: '1.0.0',
      CFBundleShortVersionString: '1.0.0',
      NSHighResolutionCapable: true,
      NSRequiresAquaSystemAppearance: false
    },
    osxSign: {
      identity: 'Developer ID Application: Zach Rizzo (PY886R2W36)',
      hardenedRuntime: true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      'signature-flags': 'library'
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        arch: 'x64',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        icon: './dist/images/fractal-X-logo.png',
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
    // {
    //   name: '@electron-forge/plugin-fuses',
    //   config: {
    //     version: FuseVersion.V1,
    //     [FuseV1Options.RunAsNode]: false,
    //     // [FuseV1Options.EnableCookieEncryption]: true,
    //     // [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    //     // [FuseV1Options.EnableNodeCliInspectArguments]: false,
    //     // [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    //     // [FuseV1Options.OnlyLoadAppFromAsar]: true,
    //     // [FuseV1Options.RUNS_ALLOW_UNPACKED]: false,
    //   }
    // }
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

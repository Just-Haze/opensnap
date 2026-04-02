// @ts-check

/**
 * @type {import('electron-builder').Configuration}
 */
const config = {
  appId: "com.opensnap.app",
  productName: "OpenSnap",
  copyright: "Copyright © 2024 OpenSnap",
  directories: {
    output: "release"
  },
  files: [
    "dist-electron/**/*"
  ],
  extraResources: [
    {
      "from": "dist",
      "to": "dist",
      "filter": ["**/*"]
    },
    {
      "from": "public/icon.png",
      "to": "icon.png"
    }
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable",
        arch: ["x64"]
      },
      {
        target: "dir",
        arch: ["x64"]
      }
    ],
    icon: "public/icon.png"
  },
  portable: {
    artifactName: "OpenSnap-${version}-portable.exe"
  },
  publish: null
}

export default config

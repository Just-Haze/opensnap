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

  // ── Windows ──────────────────────────────────────────────────────────────
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable",
        arch: ["x64"]
      }
    ],
    icon: "public/icon.png"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  portable: {
    artifactName: "OpenSnap-${version}-portable.exe"
  },

  // ── macOS ────────────────────────────────────────────────────────────────
  mac: {
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"]
      },
      {
        target: "zip",
        arch: ["x64", "arm64"]
      }
    ],
    icon: "public/icon.png",
    category: "public.app-category.utilities",
    // Code signing is optional for local builds; set CSC_LINK env var to sign
    identity: null
  },
  dmg: {
    artifactName: "OpenSnap-${version}-${arch}.dmg",
    title: "OpenSnap ${version}"
  },

  // ── Linux ────────────────────────────────────────────────────────────────
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"]
      },
      {
        target: "deb",
        arch: ["x64"]
      },
      {
        target: "rpm",
        arch: ["x64"]
      }
    ],
    icon: "public/icon.png",
    category: "Utility",
    description: "Open-source screenshot tool with beautiful backgrounds and annotations"
  },

  publish: {
    provider: "github",
    owner: "Just-Haze",
    repo: "opensnap"
  }
}

export default config

# OpenSnap

> **Status: Beta**
> 
> OpenSnap is still in active development. Expect bugs and breaking changes.

OpenSnap is a free, open-source screenshot tool with beautiful backgrounds, annotations, and effects. Inspired by [OpenScreen](https://github.com/siddharthvaddem/openscreen).

![OpenSnap screenshot](assets/opensnap-screenshot.png)

## Features

- **Screen & Window Capture**: Capture your entire screen or specific windows
- **Global Hotkeys**: 
  - `Ctrl+Shift+S` - Open screenshot picker
  - `Ctrl+Shift+F` - Capture full screen instantly
  - `PrintScreen` - Capture screenshot
- **Beautiful Backgrounds**:
  - Transparent (for overlay use)
  - Solid colors
  - Gradient presets and custom gradients
  - Custom wallpaper URLs
- **Annotations**:
  - Text
  - Arrows
  - Rectangles
  - Ellipses
  - Lines
  - Freehand drawing
- **Effects**:
  - Customizable drop shadows
  - Border with adjustable radius
  - Adjustable padding
- **Export Options**:
  - PNG, JPG, WebP formats
  - Copy directly to clipboard

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/opensnap.git
cd opensnap

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Release

Latest release: https://github.com/Just-Haze/opensnap/releases/latest

Windows downloads:
- Installer: https://github.com/Just-Haze/opensnap/releases/download/v1.0.0-beta/OpenSnap%20Setup%201.0.0.exe
- Portable: https://github.com/Just-Haze/opensnap/releases/download/v1.0.0-beta/OpenSnap-1.0.0-portable.exe

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

1. Launch OpenSnap
2. Select a screen or window to capture (or use `Ctrl+Shift+S`)
3. Customize the background, shadow, and border in the sidebar
4. Add annotations using the toolbar
5. Export as PNG/JPG/WebP or copy to clipboard

## License

MIT License - feel free to use, modify, and distribute!

## Credits

Inspired by [OpenScreen](https://github.com/siddharthvaddem/openscreen) by [@siddharthvaddem](https://github.com/siddharthvaddem)

# LAS Player - HTML5 Custom Video Player

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

A feature-rich, customizable HTML5 video player built with vanilla JavaScript and styled with Tailwind CSS. This project demonstrates how to build a modern media player from scratch, incorporating numerous features and UI/UX enhancements.

## ✨ Features

### 🎬 Playback Controls
- **Play/Pause** - Toggle video playback
- **Rewind/Fast-Forward** - Skip ±10 seconds
- **Progress Bar** - Clickable & draggable with time tooltip (desktop)
- **Playback Speed** - Select from 0.5x, 0.75x, 1x, 1.5x, 2x

### 🔊 Audio Controls
- **Volume Slider** - Vertical slider appears on hover/tap
- **Mute Toggle** - One-click mute/unmute
- **Volume Memory** - Persists across sessions via localStorage

### 📺 Display Options
- **Fullscreen Mode** - Immersive viewing experience
- **Picture-in-Picture (PiP)** - Watch while multitasking

### 📝 Subtitles
- **WebVTT Support** - Load and toggle .vtt subtitle files
- **Styled Captions** - Custom styled subtitle display

### 📁 File Handling
- **Video Upload** - Load any video file directly
- **Subtitle Upload** - Load WebVTT subtitle files

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` / `K` | Play/Pause |
| `←` Left Arrow | Rewind 10s |
| `→` Right Arrow | Forward 10s |
| `M` | Mute/Unmute |
| `F` | Toggle Fullscreen |

### 📱 Mobile & Touch
- **Touch Optimized** - Tap-to-show controls, touch-seek
- **Responsive Design** - Adapts to all screen sizes
- **Control Auto-Hide** - Controls fade when not in use

### ⚠️ Error Handling
- Invalid file type detection
- Video loading error messages
- Graceful fallbacks

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Clone the Repository
```bash
git clone https://github.com/OmarAglan/html-v-player.git
cd html-v-player
```

### Installation
```bash
npm install
# or
yarn install
```

### Run Development Server
```bash
npm run dev
# or
yarn dev
```
Navigate to `http://localhost:5173` in your browser.

### Build for Production
```bash
npm run build
# or
yarn build
```
This creates optimized static assets in the `dist` folder.

## 📂 Project Structure
```
LAS Player/
├── index.html          # Main HTML structure
├── main.js             # VideoPlayer class & logic
├── style.css           # Custom styles & Tailwind imports
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite configuration (if present)
├── tailwind.config.js  # Tailwind configuration
├── postcss.config.js   # PostCSS configuration
├── public/             # Static assets
│   └── vite.svg        # Favicon
└── dist/               # Production build output
```

## 🛠️ Tech Stack
- **HTML5** - Semantic markup & native video APIs
- **Vanilla JavaScript (ES6+)** - Class-based architecture
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast development & build tool
- **Material Icons** - UI icons

## 🌐 Live Demo
[View Demo](https://simple-video-player.onrender.com) *(may reflect an older version)*

## 📜 License
This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/OmarAglan/html-v-player/issues).

---

<p align="center">Made with ❤️ by <a href="https://github.com/OmarAglan">Omar Aglan</a></p>

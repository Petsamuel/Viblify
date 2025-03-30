# 🔠 Vibe - Unicode Text Styler

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/EXTENSION_ID?color=blue&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/detail/YOUR-EXTENSION-LINK)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A lightweight Chrome extension that transforms plain text into **styled Unicode** (𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤, 𝓯𝓪𝓷𝓬𝔂, 𝚖𝚘𝚗𝚘) with one click. Perfect for social media, emails, and coding.

<!-- ![Demo GIF](demo.gif) *(Add a short screen recording later)* -->

## ✨ Features
- **Instant text styling** - 4+ font styles with Unicode magic
- **Zero dependencies** - Vanilla JS + Tailwind CSS
- **Works everywhere** - LinkedIn, Twitter/X, Gmail, etc.
- **Privacy-focused** - No tracking, no server calls

## 🛠️ Installation
### Option A: Chrome Web Store

1. Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/YOUR-LINK)

### Option B: Manual Load

```bash
git clone https://github.com/petsamuel/Vibe.git
cd Vibe

```

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `Vibe` folder

## 🧩 Tech Stack

- **Frontend**: HTML5 + Tailwind CSS
- **Logic**: Vanilla JavaScript (ES6)
- **Build**: Tailwind CLI (`npm run tw`)
- **Manifest**: Chrome Extension V3

## 📂 Project Structure

```

Vibe/
├── assets/
│   ├── input.css         # Tailwind source
│   └── fonts.ttf         # fonts
├── popup.html           # Main UI
├── manifest.json        # Extension config
├── popup.js             # Core logic
└── tailwind.config.js  # Tailwind setup
```

## 🚀 Building Locally

1. Install dependencies:
   
```bash

npm install i
```

2. Build Tailwind CSS:

```bash

npm run tw
```

3. Load into Chrome as unpacked extension

## 🤝 Contributing

PRs welcome! Follow these steps:

1. Fork the project
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a PR

## 📜 License

MIT © [Samuel Peters](https://github.com/Petsamuel)

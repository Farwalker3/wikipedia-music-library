# wikipedia-music-library
A React-based music library that streams audio files from Wikipedia and Wikimedia Commons, styled like Apple Music

## 🎵 Features

- ✅ Browse trending Wikipedia songs with audio files
- ✅ Search for any song on Wikipedia
- ✅ Stream audio directly from Wikimedia Commons
- ✅ Apple Music-inspired design with dark theme
- ✅ Fixed bottom audio player
- ✅ Fully client-side, no backend required
- ✅ Works seamlessly on GitHub Pages

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Farwalker3/wikipedia-music-library.git
cd wikipedia-music-library
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`

## 📦 Deployment to GitHub Pages

1. Update the `homepage` field in `package.json` with your GitHub username:

```json
"homepage": "https://YOUR_USERNAME.github.io/wikipedia-music-library"
```

2. Deploy to GitHub Pages:

```bash
npm run deploy
```

Your app will be live at `https://YOUR_USERNAME.github.io/wikipedia-music-library/`

## 🛠️ How It Works

1. **Wikipedia API**: Searches for Wikipedia pages based on user queries
2. **Wikimedia Commons API**: Finds audio files associated with those Wikipedia pages
3. **Audio Streaming**: Streams audio files directly using the HTML5 `<audio>` element
4. **React State Management**: Manages search results, featured songs, and playback state

## 📁 Project Structure

```
wikipedia-music-library/
├── public/
├── src/
│   ├── App.js       # Main React component
│   ├── App.css      # Apple Music-inspired styling
│   └── index.js     # Entry point
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## 🎨 Customization

### Change Trending Songs

Edit the `trendingPages` array in `src/App.js`:

```javascript
const trendingPages = [
  "Your Song Title",
  "Another Song",
  // Add more...
];
```

### Modify Styling

Edit `src/App.css` to customize colors, fonts, and layout to match your preferences.

## 🌐 API Usage

This app uses public APIs:

- **Wikipedia API**: `https://en.wikipedia.org/w/api.php`
- **Wikimedia Commons API**: `https://commons.wikimedia.org/w/api.php`

No API keys required!

## 📄 License

This project is licensed under The Unlicense - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Wikipedia and Wikimedia Commons for providing free access to audio content
- Apple Music for design inspiration
- React community for excellent documentation

## 📝 Notes

- Not all Wikipedia pages have audio files
- Audio availability depends on Wikimedia Commons uploads
- Some audio files may be in OGG format

---

Made with ❤️ using React and Wikipedia APIs

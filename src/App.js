import React, { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [loading, setLoading] = useState(false);

  const trendingPages = [
    "Viva la Vida",
    "Bohemian Rhapsody",
    "Yesterday (Beatles song)",
    "Imagine (John Lennon song)",
    "Billie Jean",
    "Hotel California",
    "Smells Like Teen Spirit",
    "Like a Rolling Stone"
  ];

  useEffect(() => {
    loadTrendingSongs();
  }, []);

  async function loadTrendingSongs() {
    setLoading(true);
    const items = [];
    for (const title of trendingPages) {
      const audioURL = await findWikipediaAudio(title);
      if (audioURL) items.push({ title, audioURL });
    }
    setFeatured(items);
    setLoading(false);
  }

  async function searchWikipedia() {
    if (!query) return;
    setLoading(true);
    setResults([]);
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=10`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const pages = Object.values(data.query.pages);
    const found = [];
    for (const page of pages) {
      const audioURL = await findWikipediaAudio(page.title);
      if (audioURL) found.push({ title: page.title, audioURL });
    }

    setResults(found);
    setLoading(false);
  }

  async function findWikipediaAudio(title) {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
      title + " hasaudio"
    )}&gsrlimit=5&prop=imageinfo&iiprop=url`;

    try {
      const res = await fetch(commonsUrl);
      const data = await res.json();
      if (!data.query) return null;
      const pages = Object.values(data.query.pages);

      for (const page of pages) {
        if (
          page.imageinfo &&
          page.imageinfo[0].url.match(/\.(ogg|mp3|wav|flac)$/i)
        ) {
          return page.imageinfo[0].url;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  function playSong(song) {
    setCurrentSong(song);
  }

  return (
    <div className="App">
      <header>
        <h1>Wikipedia Music Library</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for a song..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchWikipedia()}
          />
          <button onClick={searchWikipedia}>Search</button>
        </div>
      </header>

      {loading && <p className="loading">Loading...</p>}

      {!loading && results.length === 0 && (
        <section>
          <h2>🎧 Trending Wikipedia Songs</h2>
          <div className="grid">
            {featured.map((song, i) => (
              <div
                className="song"
                key={i}
                onClick={() => playSong(song)}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6a/Wikipedia-logo-v2-simple.svg"
                  alt="cover"
                />
                <div className="title">{song.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && results.length > 0 && (
        <section>
          <h2>🔍 Search Results</h2>
          <div className="grid">
            {results.map((song, i) => (
              <div
                className="song"
                key={i}
                onClick={() => playSong(song)}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6a/Wikipedia-logo-v2-simple.svg"
                  alt="cover"
                />
                <div className="title">{song.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {currentSong && (
        <div className="player">
          <audio src={currentSong.audioURL} controls autoPlay />
          <span>Now Playing: {currentSong.title}</span>
        </div>
      )}
    </div>
  );
}

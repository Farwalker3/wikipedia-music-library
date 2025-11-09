import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// Helper: search wikipedia for pages matching the query
async function wikipediaSearch(query, limit = 10) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("format", "json");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srlimit", String(limit));
  url.searchParams.set("origin", "*");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return data.query?.search ?? [];
}

// Helper: get files linked from a wikipedia page by pageid
async function getFilesFromPage(pageid) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("pageids", String(pageid));
  url.searchParams.set("prop", "images");
  url.searchParams.set("format", "json");
  url.searchParams.set("imlimit", "max");
  url.searchParams.set("origin", "*");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch page images");
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const first = Object.values(pages)[0] || {};
  return first.images ?? [];
}

// Helper: resolve a File: title to a direct file URL
async function resolveFileUrl(fileTitle) {
  async function fetchFile(site) {
    const url = new URL(`https://${site}/w/api.php`);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", fileTitle);
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages ?? {};
    const first = Object.values(pages)[0] || {};
    const info = first.imageinfo?.[0];
    return info ? { url: info.url, mime: info.mime } : null;
  }
  let resolved = await fetchFile("commons.wikimedia.org");
  if (!resolved) resolved = await fetchFile("en.wikipedia.org");
  return resolved;
}

function isAudioFile(filename) {
  return /\.(ogg|oga|mp3|wav|m4a|flac)$/i.test(filename);
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [showHome, setShowHome] = useState(true);
  const audioRef = useRef(null);

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
      try {
        const hits = await wikipediaSearch(title, 1);
        if (hits[0]) {
          const imgs = await getFilesFromPage(hits[0].pageid);
          const audioFiles = [];
          for (const f of imgs.filter(img => isAudioFile(img.title))) {
            const resolved = await resolveFileUrl(f.title);
            if (resolved?.url && resolved?.mime?.includes('audio')) {
              audioFiles.push({ title: f.title, url: resolved.url });
              break;
            }
          }
          if (audioFiles.length > 0) {
            items.push({ title: hits[0].title, audioFiles });
          }
        }
      } catch (e) {}
    }
    setFeatured(items);
    setLoading(false);
  }

  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setShowHome(false);
    setResults([]);
    try {
      const hits = await wikipediaSearch(query, 12);
      const pages = await Promise.all(
        hits.map(async (h) => {
          try {
            const imgs = await getFilesFromPage(h.pageid);
            const files = imgs.filter((f) => isAudioFile(f.title));
            const audioFiles = await Promise.all(
              files.map(async (f) => {
                try {
                  const resolved = await resolveFileUrl(f.title);
                  if (resolved?.url && /^audio\//.test(resolved.mime)) {
                    return { title: f.title, url: resolved.url, mime: resolved.mime };
                  }
                } catch (err) {}
                return null;
              })
            );
            return { pageid: h.pageid, title: h.title, snippet: h.snippet, audioFiles: audioFiles.filter(Boolean) };
          } catch (err) {
            return { pageid: h.pageid, title: h.title, snippet: h.snippet, audioFiles: [] };
          }
        })
      );
      setResults(pages.filter(p => p.audioFiles.length > 0));
    } catch (err) {}
    setLoading(false);
  }

  function handlePlay(file) {
    setCurrentAudio(file);
    setTimeout(() => {
      audioRef.current?.play();
    }, 100);
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
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
      </header>

      {loading && <p className="loading">Loading...</p>}

      {!loading && showHome && featured.length > 0 && (
        <section>
          <h2>🎧 Trending Wikipedia Songs</h2>
          <div className="grid">
            {featured.map((song, i) => (
              <div className="song" key={i} onClick={() => handlePlay(song.audioFiles[0])}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6a/Wikipedia-logo-v2-simple.svg" alt="cover" />
                <div className="title">{song.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !showHome && results.length > 0 && (
        <section>
          <h2>🔍 Search Results</h2>
          <div className="results-list">
            {results.map((r) => (
              <article key={r.pageid} className="result-card">
                <h3>{r.title}</h3>
                <div className="audio-files">
                  {r.audioFiles.map((f, i) => (
                    <div key={i} className="audio-item">
                      <div className="file-name">{f.title.replace(/^File:/i, "")}</div>
                      <button onClick={() => handlePlay(f)} className="play-btn">▶ Play</button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {currentAudio && (
        <div className="player">
          <audio ref={audioRef} src={currentAudio.url} controls autoPlay />
          <span>Now Playing: {currentAudio.title?.replace(/^File:/i, "")}</span>
        </div>
      )}
    </div>
  );
}

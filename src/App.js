import React, { useState, useRef } from "react";
import "./App.css";

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
  const [currentAudio, setCurrentAudio] = useState(null);
  const audioRef = useRef(null);

  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setResults([]);
    
    try {
      const hits = await wikipediaSearch(query, 12);
      const pages = await Promise.all(
        hits.map(async (h) => {
          try {
            const imgs = await getFilesFromPage(h.pageid);
            const files = imgs.filter((f) => isAudioFile(f.title));
            const audioFiles = [];
            
            for (const f of files.slice(0, 3)) {
              try {
                const resolved = await resolveFileUrl(f.title);
                if (resolved?.url && resolved?.mime?.includes('audio')) {
                  audioFiles.push({ title: f.title, url: resolved.url, mime: resolved.mime });
                }
              } catch (err) {
                console.error('Error resolving file:', err);
              }
            }
            
            return { 
              pageid: h.pageid, 
              title: h.title, 
              snippet: h.snippet, 
              audioFiles 
            };
          } catch (err) {
            console.error('Error processing page:', err);
            return { pageid: h.pageid, title: h.title, snippet: h.snippet, audioFiles: [] };
          }
        })
      );
      
      const withAudio = pages.filter(p => p.audioFiles.length > 0);
      setResults(withAudio);
      
      if (withAudio.length === 0) {
        alert('No audio files found for this search. Try searching for well-known songs like "Bohemian Rhapsody" or "Imagine John Lennon"');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
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
            placeholder="Search for a song... (e.g. Bohemian Rhapsody)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </header>

      {loading && <p className="loading">Searching Wikipedia for audio files...</p>}

      {!loading && results.length === 0 && !loading && (
        <section>
          <h2>🎵 Welcome to Wikipedia Music Library</h2>
          <p style={{color: '#fff', textAlign: 'center', padding: '20px', fontSize: '1.1em'}}>
            Search for your favorite songs to find audio files from Wikipedia!<br/>
            Try: "Bohemian Rhapsody", "Imagine John Lennon", "Hotel California"
          </p>
        </section>
      )}

      {!loading && results.length > 0 && (
        <section>
          <h2>🔍 Search Results ({results.length} pages with audio)</h2>
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

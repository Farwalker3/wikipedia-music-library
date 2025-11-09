import React, { useState, useEffect, useRef } from "react";

// 90s Apple-inspired minimalist Wikipedia Music Library

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
  if (!resolved && fileTitle.match(/^File:/i)) {
    const name = fileTitle.replace(/^File:/i, "").replace(/ /g, "_");
    resolved = { url: `https://upload.wikimedia.org/wikipedia/en/${name}`, mime: "audio/ogg" };
  }
  return resolved;
}

function isAudioFile(filename) {
  return /\.(ogg|oga|mp3|wav|m4a|flac)$/i.test(filename);
}

export default function WikipediaMusicLibrary() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const audioRef = useRef(null);

  async function handleSearch(e) {
    e && e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const hits = await wikipediaSearch(query, 12);
      const pages = await Promise.all(
        hits.map(async (h) => {
          try {
            const imgs = await getFilesFromPage(h.pageid);
            const files = (imgs || []).filter((f) => isAudioFile(f.title || f.name || ""));
            const audioFiles = await Promise.all(
              files.map(async (f) => {
                try {
                  const resolved = await resolveFileUrl(f.title);
                  if (resolved && resolved.mime && resolved.url) {
                    if (/^audio\//.test(resolved.mime)) return { title: f.title, url: resolved.url, mime: resolved.mime };
                    if (isAudioFile(resolved.url)) return { title: f.title, url: resolved.url, mime: resolved.mime };
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
      setResults(pages);
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handlePlay(file) {
    setCurrentAudio(file);
    setTimeout(() => {
      try {
        audioRef.current && audioRef.current.play();
      } catch (e) {}
    }, 100);
  }

  return (
    <div style={{ fontFamily: 'Chicago, "Courier New", monospace', backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header - 90s Apple style */}
      <div style={{ background: 'linear-gradient(180deg, #f0f0f0 0%, #d0d0d0 100%)', borderBottom: '2px solid #999', padding: '12px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000', letterSpacing: '0.5px' }}>■ Music Library</h1>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '2px solid #999',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              backgroundColor: '#fff'
            }}
            placeholder="Search Wikipedia..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 24px',
              border: '2px solid #999',
              borderRadius: '4px',
              backgroundColor: '#f0f0f0',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 20px', margin: '0 20px', backgroundColor: '#fee', border: '2px solid #c00', borderRadius: '4px', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      <div style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto' }}>
        {results.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>No results yet. Try searching for a song or artist.</p>
        )}

        {results.map((r) => (
          <div key={r.pageid} style={{ marginBottom: '16px', border: '2px solid #ccc', borderRadius: '4px', padding: '12px', backgroundColor: '#fafafa' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>{r.title}</h3>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }} dangerouslySetInnerHTML={{ __html: r.snippet + '...' }} />

            {r.audioFiles && r.audioFiles.length > 0 ? (
              <div>
                {r.audioFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '8px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <div style={{ flex: 1, fontSize: '13px' }}>
                      <div style={{ fontWeight: 'bold' }}>{f.title.replace(/^File:/i, '')}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{f.mime}</div>
                    </div>
                    <button
                      onClick={() => handlePlay(f)}
                      style={{
                        padding: '6px 16px',
                        border: '2px solid #333',
                        borderRadius: '4px',
                        backgroundColor: currentAudio?.url === f.url ? '#000' : '#f0f0f0',
                        color: currentAudio?.url === f.url ? '#fff' : '#000',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {currentAudio?.url === f.url ? '▶ Playing' : '▶ Play'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No audio files found</div>
            )}
          </div>
        ))}
      </div>

      {/* Fixed Player at Bottom - 90s style */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)',
        borderTop: '2px solid #999',
        padding: '12px 20px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000
      }}>
        {currentAudio ? (
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ♫ {currentAudio.title.replace(/^File:/i, '')}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>Now Playing</div>
            </div>
            <audio
              ref={audioRef}
              src={currentAudio.url}
              controls
              loop
              preload="metadata"
              style={{ height: '32px' }}
            />
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', fontSize: '13px', color: '#666' }}>
            No track selected
          </div>
        )}
      </div>
    </div>
  );
}

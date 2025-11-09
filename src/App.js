import React, { useState, useEffect, useRef } from "react";


// Wikipedia Music Library
// Single-file React component (default export) you can drop into a React app.
// Uses the MediaWiki API (wikipedia.org + commons) to search pages, extract File: links
// and resolve audio file URLs to allow playback directly in the browser.
// Styling uses Tailwind classes (no imports required if your project already has Tailwind configured).


// Notes & limitations:
// - This frontend-only app queries Wikipedia and Commons APIs with origin=* which is supported by Wikimedia.
// - Not every Wikipedia article has audio files; many audio assets for songs live on Wikimedia Commons.
// - Proper productionizing should add caching, server-side rate-limiting, and attribution tracking.
// - This app attempts to be respectful of Wikimedia's APIs (small page sizes, no heavy crawling in the client).


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
// We'll use prop=images to get File: entries and prop=sections if needed
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


// Helper: resolve a File: title to a direct file URL via Commons (or en.wikipedia where file is hosted)
// Supports audio extensions (ogg, oga, mp3, wav, m4a, flac)
async function resolveFileUrl(fileTitle) {
  // Helper to query any Wikimedia site (commons or enwiki)
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


  // Try Wikimedia Commons first, then fall back to English Wikipedia
  let resolved = await fetchFile("commons.wikimedia.org");
  if (!resolved) resolved = await fetchFile("en.wikipedia.org");


  // Still not found? attempt constructing the known pattern manually as a last resort
  if (!resolved && fileTitle.match(/^File:/i)) {
    const name = fileTitle.replace(/^File:/i, "").replace(/ /g, "_");
    resolved = {
      url: `https://upload.wikimedia.org/wikipedia/en/${name}`,
      mime: "audio/ogg",
    };
  }


  return resolved;
}


// Utility: filter for audio file names
function isAudioFile(filename) {
  return /\.(ogg|oga|mp3|wav|m4a|flac)$/i.test(filename);
}


export default function WikipediaMusicLibrary() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // {pageid, title, snippet, audioFiles: [{title, url, mime}]}[]
  const [error, setError] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null); // {title,url}
  const audioRef = useRef(null);


  useEffect(() => {
    // Auto-play next? We'll keep simple: user clicks play.
  }, []);


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
          // for each hit, get files
          try {
            const imgs = await getFilesFromPage(h.pageid);
            // filter audio files
            const files = (imgs || []).filter((f) => isAudioFile(f.title || f.name || ""));
            // resolve URLs for audio files
            const audioFiles = await Promise.all(
              files.map(async (f) => {
                try {
                  const resolved = await resolveFileUrl(f.title);
                  if (resolved && resolved.mime && resolved.url) {
                    // verify mime is audio
                    if (/^audio\//.test(resolved.mime)) return { title: f.title, url: resolved.url, mime: resolved.mime };
                    // sometimes mime can be application/ogg etc - still include when extension matches
                    if (isAudioFile(resolved.url)) return { title: f.title, url: resolved.url, mime: resolved.mime };
                  }
                } catch (err) {
                  // ignore single-file failures
                }
                return null;
              })
            );


            return { pageid: h.pageid, title: h.title, snippet: h.snippet, audioFiles: audioFiles.filter(Boolean) };
          } catch (err) {
            return { pageid: h.pageid, title: h.title, snippet: h.snippet, audioFiles: [] };
          }
        })
      );


      // Filter results to those with audioFiles or still show top textual matches
      setResults(pages);
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }


  function handlePlay(file) {
    setCurrentAudio(file);
    // after state update, ensure audio element plays
    setTimeout(() => {
      try {
        audioRef.current && audioRef.current.play();
      } catch (e) {}
    }, 100);
  }


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold">Wikipedia Music Library</h1>
          <p className="text-gray-600 mt-1">Search Wikipedia pages for audio files (songs, clips) and play them in-browser. Powered by MediaWiki & Wikimedia Commons.</p>
        </header>


        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            className="flex-1 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Search for a song title, artist, or Wikipedia page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>


        {error && <div className="mb-4 text-red-600">Error: {error}</div>}


        <section>
          {results.length === 0 && !loading && <div className="text-gray-500">No results yet — try searching for a song, artist, or well-known track.</div>}


          <div className="grid grid-cols-1 gap-4">
            {results.map((r) => (
              <article key={r.pageid} className="p-4 bg-white rounded shadow-sm">
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <div className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: r.snippet + "..." }} />


                <div className="mt-3">
                  {r.audioFiles && r.audioFiles.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {r.audioFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-medium">{f.title.replace(/^File:/i, "")}</div>
                            <div className="text-xs text-gray-500">{f.mime} — Hosted on Commons</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePlay(f)}
                              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                            >
                              Play
                            </button>
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                            >
                              Open
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No audio files found on this page.</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>


        <footer className="mt-8 p-4 bg-white rounded shadow-sm flex items-center justify-between">
          <div className="text-sm text-gray-600">Results powered by Wikipedia / Wikimedia Commons. Use responsibly and respect licenses.</div>
          <div>
            {currentAudio ? (
              <div className="flex items-center gap-3">
                <div className="text-sm">Now playing: <strong>{currentAudio.title.replace(/^File:/i, "")}</strong></div>
                <audio ref={audioRef} controls src={currentAudio.url} preload="metadata" />
              </div>
            ) : (
              <div className="text-sm text-gray-500">No audio selected</div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

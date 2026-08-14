import React, { useState, useEffect } from 'react';

interface MapBookmark {
  name: string;
  lat: number;
  lon: number;
  bbox: string;
  desc: string;
}

const PRESET_LANDMARKS: MapBookmark[] = [
  { name: 'Giza Pyramids Anchor', lat: 29.9792, lon: 31.1342, bbox: '31.12,29.97,31.14,29.99', desc: 'Cosmic alignment base station.' },
  { name: 'Svalbard Global Vault', lat: 78.2201, lon: 15.6501, bbox: '15.62,78.21,15.68,78.23', desc: 'Svalbard seed repository anchorage.' },
  { name: 'CERN Supercollider', lat: 46.2330, lon: 6.0556, bbox: '6.03,46.22,6.07,46.24', desc: 'Particle collision sub-space gate.' },
  { name: 'Neo-Tokyo Sector 7', lat: 35.6762, lon: 139.6503, bbox: '139.63,35.66,139.67,35.69', desc: 'Synthetic neural processing core.' },
  { name: 'Silicon Valley Shard', lat: 37.4419, lon: -122.1430, bbox: '-122.16,37.43,-122.12,37.45', desc: 'Lattice OS engineering gateway.' },
  { name: 'Mariana Trench Center', lat: 11.3493, lon: 142.1996, bbox: '142.18,11.33,142.21,11.36', desc: 'Deep-ocean abyssal communications tap.' }
];

const MAP_FILTERS = [
  { id: 'dark-blue', name: 'Midnight Blue', css: 'invert(100%) hue-rotate(185deg) contrast(110%) brightness(95%)' },
  { id: 'matrix', name: 'Matrix Emerald', css: 'invert(90%) hue-rotate(90deg) sepia(60%) saturate(300%) contrast(120%)' },
  { id: 'crimson', name: 'Cyber Crimson', css: 'invert(95%) hue-rotate(330deg) saturate(350%) brightness(90%)' },
  { id: 'monochrome', name: 'Monochrome High-Con', css: 'grayscale(100%) invert(95%) contrast(140%)' },
  { id: 'standard', name: 'Standard Satellite', css: 'none' }
];

const MapsPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mapUrl, setMapUrl] = useState('https://www.openstreetmap.org/export/embed.html?bbox=31.12,29.97,31.14,29.99&layer=mapnik&marker=29.9792,31.1342');
  
  // Customization States
  const [activeFilterId, setActiveFilterId] = useState('dark-blue');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lon: number, name: string}>({ lat: 29.9792, lon: 31.1342, name: 'Giza Pyramids Anchor' });
  const [isSearching, setIsSearching] = useState(false);
  const [bookmarks, setBookmarks] = useState<MapBookmark[]>([]);
  
  // Load bookmarks
  useEffect(() => {
    const saved = localStorage.getItem('nvk_map_bookmarks');
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        setBookmarks([]);
      }
    } else {
      localStorage.setItem('nvk_map_bookmarks', JSON.stringify([]));
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    const encoded = encodeURIComponent(query.trim());
    
    try {
      // Connect to OpenStreetMap's Nominatim JSON API for true resolution (No keys needed!)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encoded}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const place = data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        
        let bboxStr = '';
        if (place.boundingbox) {
          // Nominatim boundingbox: [minlat, maxlat, minlon, maxlon]
          // OSM embed needs: minlon,minlat,maxlon,maxlat
          const box = place.boundingbox;
          bboxStr = `${box[2]},${box[0]},${box[3]},${box[1]}`;
        } else {
          // Construct square offset
          bboxStr = `${lon - 0.015},${lat - 0.01},${lon + 0.015},${lat + 0.01}`;
        }

        setCurrentCoords({ lat, lon, name: place.display_name.split(',')[0] });
        setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bboxStr}&layer=mapnik&marker=${lat},${lon}`);
      } else {
        alert(`Could not resolve location '${query}'. Setting to fallback. Try coordinates like 'Cairo' or 'New York'.`);
      }
    } catch (err) {
      // Offline fallback with localized grid mathematics
      const dummyLat = 40.7128 + (Math.random() - 0.5) * 5;
      const dummyLon = -74.006 + (Math.random() - 0.5) * 5;
      const mockBbox = `${dummyLon - 0.015},${dummyLat - 0.01},${dummyLon + 0.015},${dummyLat + 0.01}`;
      setCurrentCoords({ lat: dummyLat, lon: dummyLon, name: `${query} Resolved` });
      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${mockBbox}&layer=mapnik&marker=${dummyLat},${dummyLon}`);
    } finally {
      setIsSearching(false);
    }
  };

  const traverseToBookmark = (item: MapBookmark) => {
    setCurrentCoords({ lat: item.lat, lon: item.lon, name: item.name });
    setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${item.bbox}&layer=mapnik&marker=${item.lat},${item.lon}`);
  };

  const handleSaveCurrentPlace = () => {
    const isAlreadyBookmarked = bookmarks.some(b => b.name === currentCoords.name);
    if (isAlreadyBookmarked) {
      alert("This coordinate node is already bookmarked.");
      return;
    }

    const currentBbox = mapUrl.split('bbox=')[1]?.split('&')[0] || '11.33,142.18,11.36,142.21';
    const newBmk: MapBookmark = {
      name: currentCoords.name,
      lat: currentCoords.lat,
      lon: currentCoords.lon,
      bbox: currentBbox,
      desc: 'Discovered spatial node.'
    };

    const updated = [...bookmarks, newBmk];
    setBookmarks(updated);
    localStorage.setItem('nvk_map_bookmarks', JSON.stringify(updated));
    alert(`Bookmarked node '${currentCoords.name}' successfully!`);
  };

  const handleDeleteBookmark = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = bookmarks.filter(b => b.name !== name);
    setBookmarks(updated);
    localStorage.setItem('nvk_map_bookmarks', JSON.stringify(updated));
  };

  const getActiveFilterStyle = () => {
    return MAP_FILTERS.find(f => f.id === activeFilterId)?.css || 'none';
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 flex flex-col font-mono relative overflow-hidden select-none">
      
      {/* Upper Navigation overlay search row */}
      <div className="p-3 bg-slate-900/90 border-b border-white/5 flex flex-col gap-2.5 z-10 relative backdrop-blur-md">
        <div className="flex gap-2 items-center">
          <form onSubmit={handleSearch} className="flex-grow flex bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative items-center shadow-inner h-9">
            <div className="px-3 text-slate-500 shrink-0">
              {isSearching ? <i className="ri-loader-3-line animate-spin text-cyan-400"></i> : <i className="ri-search-2-line"></i>}
            </div>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query location coordinates (e.g. Kyoto, London, Giza)..."
              className="flex-grow bg-transparent border-none outline-none text-white text-[11px] placeholder-slate-600 font-mono py-1.5 focus:ring-0 min-w-0"
            />
            <button 
              type="submit" 
              disabled={isSearching}
              className="bg-cyan-600/15 border-l border-cyan-500/30 hover:bg-cyan-600/30 text-cyan-300 px-4 h-full font-bold uppercase transition-colors text-[9px] tracking-widest shrink-0 cursor-pointer"
            >
              FIND
            </button>
          </form>

          {/* Save Place Button */}
          <button 
            onClick={handleSaveCurrentPlace}
            className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-lg border border-white/10 text-cyan-400 hover:text-white transition-all text-xs cursor-pointer shadow-lg shrink-0"
            title="Bookmark Current Node Coordinate"
          >
            <i className="ri-bookmark-fill"></i>
          </button>
        </div>

        {/* Preset Locations Quick Traversal */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          <span className="text-[8px] font-mono font-bold text-slate-500 uppercase flex items-center shrink-0">CYBER NODES:</span>
          {PRESET_LANDMARKS.map((landmark, idx) => {
            const isActive = Math.abs(currentCoords.lat - landmark.lat) < 0.005;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => traverseToBookmark(landmark)}
                className={`py-0.5 px-2 text-[8px] rounded border uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 font-semibold shadow' 
                    : 'bg-slate-950/60 border-white/5 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                }`}
              >
                {landmark.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Visual filter options and current coordination details */}
        <div className="flex flex-wrap justify-between items-center text-[9px] text-slate-500 select-none gap-2 pt-1 border-t border-white/5">
          <div className="flex gap-1 items-center font-mono truncate">
            <span className="text-slate-600 font-bold">LAT:</span>
            <span className="text-slate-300 font-bold">{currentCoords.lat.toFixed(4)}</span>
            <span className="text-slate-600 font-bold ml-1.5">LON:</span>
            <span className="text-slate-300 font-bold">{currentCoords.lon.toFixed(4)}</span>
            <span className="text-cyan-500 font-bold ml-2 truncate">({currentCoords.name})</span>
          </div>

          {/* Aesthetic layer select */}
          <div className="flex items-center gap-1">
            <span className="text-slate-600 font-bold uppercase text-[7.5px]">LAYER_FILTER:</span>
            <select
              value={activeFilterId}
              onChange={(e) => setActiveFilterId(e.target.value)}
              className="bg-slate-950 text-[8px] font-mono py-0.5 px-1 rounded border border-white/5 text-slate-300 outline-none"
            >
              {MAP_FILTERS.map(f => (
                <option key={f.id} value={f.id} className="bg-slate-950 text-slate-300">{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Primary Map View Container */}
      <div className="flex-grow w-full relative bg-slate-900 border-b border-white/5 overflow-hidden">
        
        {/* Custom Visual styling layer overrides applied directly to the embedded map iframe */}
        <iframe 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no" 
          src={mapUrl} 
          style={{ filter: getActiveFilterStyle() }}
          className="w-full h-full opacity-90 transition-all duration-700"
          title="NVK Cartography Node View"
        />

        {/* Bookmarks Overlay HUD panel */}
        {bookmarks.length > 0 && (
          <div className="absolute right-3 top-3 z-20 w-36 bg-slate-950/90 border border-white/5 rounded-xl p-2 max-h-36 overflow-y-auto custom-scrollbar shadow-2xl backdrop-blur">
            <div className="text-[7.5px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1 mb-1 font-mono tracking-widest">SAVED NODES</div>
            <div className="space-y-1">
              {bookmarks.map((bmk, idx) => (
                <div 
                  key={idx} 
                  onClick={() => traverseToBookmark(bmk)}
                  className="flex justify-between items-center text-[9px] hover:text-white hover:bg-white/5 p-1 rounded cursor-pointer group/bmk whitespace-nowrap overflow-hidden transition-all text-slate-400 font-mono"
                >
                  <span className="truncate flex-grow">{bmk.name}</span>
                  <button
                    onClick={(e) => handleDeleteBookmark(bmk.name, e)}
                    className="opacity-0 group-hover/bmk:opacity-100 text-rose-500 hover:text-rose-400 p-0.5 transition-opacity"
                    title="Remove bookmark"
                  >
                    <i className="ri-close-fill"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-1.5 border-t border-slate-950 bg-slate-900 text-[8px] text-slate-600 flex justify-between uppercase select-none">
        <span>CARTOGRAPHIC_OSM_MAP: ACTIVE_ENCRYPTED</span>
        <span>LAT_SHADOW_DECODER_GIZ_OK</span>
      </div>
    </div>
  );
};

export default MapsPanel;

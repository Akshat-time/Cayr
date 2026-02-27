import React, { useState, useEffect, useRef } from 'react';

// Declaration for Leaflet which will be loaded via script
declare global {
    interface Window {
        L: any;
    }
}

interface Facility {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    rating?: number;
    user_ratings_total?: number;
    open_now?: boolean;
    types: string[];
    place_id: string;
    distance?: number;
}

const ClinicLabFinder: React.FC = () => {
    const [map, setMap] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('Hospitals');
    const [radius, setRadius] = useState(5000); // 5km
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [isGpsActive, setIsGpsActive] = useState(true);

    const mapRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<any[]>([]);
    const leafletMapRef = useRef<any>(null);

    const categories = [
        { id: 'Hospitals', icon: '🏥', overpassQuery: 'amenity=hospital' },
        { id: 'Clinics', icon: '🩺', overpassQuery: 'amenity=clinic' },
        { id: 'Labs', icon: '🧪', overpassQuery: 'amenity=laboratory' },
        { id: 'Emergency', icon: '🚨', overpassQuery: 'emergency=yes' }
    ];

    useEffect(() => {
        const loadLeaflet = () => {
            if (window.L) {
                initMap();
                return;
            }

            // Load Leaflet CSS
            if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            // Load Leaflet JS
            if (!document.querySelector('script[src*="leaflet.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                script.onload = initMap;
                script.onerror = () => {
                    setError('Failed to load map library. Please check your internet connection.');
                    setLoading(false);
                };
                document.head.appendChild(script);
            } else {
                // Script already exists but L might not be ready
                const checkL = setInterval(() => {
                    if (window.L) {
                        clearInterval(checkL);
                        initMap();
                    }
                }, 100);
            }
        };

        const initMap = () => {
            if (!navigator.geolocation) {
                setError('Geolocation is not supported by your browser.');
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(pos);

                    if (mapRef.current && window.L && !leafletMapRef.current) {
                        try {
                            const L = window.L;
                            const mapInstance = L.map(mapRef.current).setView([pos.lat, pos.lng], 14);

                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            }).addTo(mapInstance);

                            // User marker (Blue circle)
                            L.circleMarker([pos.lat, pos.lng], {
                                radius: 10,
                                fillColor: "#3b5bfd",
                                color: "#fff",
                                weight: 3,
                                opacity: 1,
                                fillOpacity: 0.8
                            }).addTo(mapInstance).bindPopup("Your Location");

                            leafletMapRef.current = mapInstance;
                            setMap(mapInstance);
                            setLoading(false);
                        } catch (e: any) {
                            console.error("Map initialization error:", e);
                            setError(`Map initialization failed: ${e.message}`);
                            setLoading(false);
                        }
                    }
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    setError(`Permission to access location was denied or location unavailable: ${err.message}`);
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };

        loadLeaflet();

        return () => {
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
            }
        };
    }, []);

    const resetToGps = () => {
        setIsSearchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(pos);
                setIsGpsActive(true);
                setSearchInput('');
                if (leafletMapRef.current) {
                    leafletMapRef.current.setView([pos.lat, pos.lng], 14);
                    // Update user marker if exists, or recreate
                    leafletMapRef.current.eachLayer((layer: any) => {
                        if (layer instanceof window.L.CircleMarker && layer.getPopup()?.getContent() === "Your Location") {
                            layer.setLatLng([pos.lat, pos.lng]);
                        }
                    });
                }
                setIsSearchingLocation(false);
            },
            (err) => {
                setError(`Failed to get GPS location: ${err.message}`);
                setIsSearchingLocation(false);
            }
        );
    };

    const handleManualSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchInput.trim();
        if (!query) return;

        setIsSearchingLocation(true);
        setError(null);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();

            if (data && data.length > 0) {
                const pos = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                setUserLocation(pos);
                setIsGpsActive(false);

                if (leafletMapRef.current) {
                    leafletMapRef.current.setView([pos.lat, pos.lng], 14);

                    // Update user marker position and label
                    leafletMapRef.current.eachLayer((layer: any) => {
                        if (layer instanceof window.L.CircleMarker && layer.getPopup()?.getContent()?.includes("Location")) {
                            layer.setLatLng([pos.lat, pos.lng]);
                            layer.bindPopup(`Search Location: ${query}`);
                        }
                    });
                }
            } else {
                setError(`Location "${query}" not found. Try Area name or Pincode.`);
            }
        } catch (e) {
            console.error("Geocoding error:", e);
            setError("Failed to reach search service. Please try again.");
        } finally {
            setIsSearchingLocation(false);
        }
    };

    useEffect(() => {
        if (map && userLocation) {
            searchFacilities();
        }
    }, [map, userLocation, activeCategory, radius]);

    const searchFacilities = async () => {
        if (!window.L || !userLocation || !leafletMapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const category = categories.find(c => c.id === activeCategory);
        const lat = userLocation.lat;
        const lng = userLocation.lng;

        // Convert radius to degrees approx (111km per degree)
        const radiusInDeg = radius / 111000;
        const bbox = `${lat - radiusInDeg},${lng - radiusInDeg},${lat + radiusInDeg},${lng + radiusInDeg}`;

        // Overpass QL Query
        const query = `
            [out:json][timeout:25];
            (
              node[${category?.overpassQuery}](${bbox});
              way[${category?.overpassQuery}](${bbox});
              relation[${category?.overpassQuery}](${bbox});
            );
            out center;
        `;

        setLoading(true);
        try {
            const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.elements) {
                const mappedResults = data.elements.map((element: any) => {
                    const elLat = element.lat || element.center?.lat;
                    const elLng = element.lon || element.center?.lon;

                    return {
                        id: element.id.toString(),
                        name: element.tags?.name || "Unnamed Facility",
                        address: `${element.tags?.['addr:street'] || ''} ${element.tags?.['addr:housenumber'] || ''}`.trim() || "Address not available",
                        lat: elLat,
                        lng: elLng,
                        types: [activeCategory.toLowerCase()],
                        place_id: element.id.toString(),
                        distance: calculateDistance(lat, lng, elLat, elLng)
                    };
                }).sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));

                setFacilities(mappedResults);
                renderMarkers(mappedResults);
            } else {
                setFacilities([]);
            }
        } catch (e) {
            console.error("Overpass API error:", e);
            // Fallback for demo if API fails
            setFacilities([]);
        } finally {
            setLoading(false);
        }
    };

    const renderMarkers = (results: Facility[]) => {
        if (!window.L || !leafletMapRef.current) return;
        const L = window.L;

        results.forEach((facility) => {
            const marker = L.marker([facility.lat, facility.lng]).addTo(leafletMapRef.current);

            marker.on('click', () => {
                setSelectedFacility(facility);
                leafletMapRef.current.setView([facility.lat, facility.lng], 16);
                document.getElementById(`facility-${facility.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

            markersRef.current.push(marker);
        });
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const deg2rad = (deg: number) => deg * (Math.PI / 180);

    const handleGetDirections = (facility: Facility) => {
        // Universal Maps URL works with Google and Apple Maps
        const url = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;
        window.open(url, '_blank');
    };

    if (error) {
        return (
            <div className="h-[600px] bg-white rounded-[20px] flex flex-col items-center justify-center p-10 text-center border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.15)] animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-slate-50 rounded-[14px] flex items-center justify-center text-4xl mb-6 shadow-sm">📍</div>
                <h3 className="text-[20px] font-bold text-slate-900 mb-2">Location Required</h3>
                <p className="text-[14px] font-medium text-slate-500 max-w-md">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-[14px] font-bold text-[14px]">Retry Access</button>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-[28px] font-semibold text-white tracking-tight flex items-center">
                        Facility Locator
                        {loading && <div className="ml-4 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>}
                    </h1>
                    <p className="text-[14px] font-medium text-blue-100/60 mt-1">{isGpsActive ? 'Live OpenStreetMap Network' : 'Manual Location Explorer'}</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-center">
                    <form onSubmit={handleManualSearch} className="relative flex-1 sm:w-80 group">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Area / Pincode..."
                            className="w-full pl-6 pr-12 py-3.5 bg-white border border-white/5 rounded-[14px] text-[14px] font-medium placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                        />
                        <button
                            type="submit"
                            disabled={isSearchingLocation}
                            className="absolute right-2 top-2 bottom-2 w-10 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-[10px] flex items-center justify-center transition-all disabled:opacity-50"
                        >
                            {isSearchingLocation ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : '🔍'}
                        </button>
                    </form>

                    <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-[14px] border border-white/10 shadow-lg overflow-x-auto scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-5 py-2.5 rounded-[10px] text-[13px] font-bold tracking-wide transition-all gap-2 flex items-center ${activeCategory === cat.id ? 'bg-[#3b5bfd] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                <span>{cat.icon}</span>
                                {cat.id}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[650px]">
                {/* Map Container */}
                <div className="lg:col-span-2 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/5 overflow-hidden relative group h-full">
                    <div ref={mapRef} className="w-full h-full z-0" />

                    {loading && facilities.length === 0 && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4 z-20">
                            <div className="w-12 h-12 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[13px] font-bold text-slate-400 tracking-wider">Querying Network...</p>
                        </div>
                    )}

                    {/* Map Overlay Controls */}
                    <div className="absolute top-6 left-6 p-4 bg-white/90 backdrop-blur-md rounded-[16px] border border-white/10 shadow-xl z-10 flex items-center space-x-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${isGpsActive ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                <span className="text-[12px] font-bold text-slate-800">{isGpsActive ? 'GPS Locked' : 'Search View'}</span>
                            </div>
                        </div>
                        {!isGpsActive && (
                            <button
                                onClick={resetToGps}
                                disabled={isSearchingLocation}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-[10px] text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all"
                            >
                                Reset to GPS
                            </button>
                        )}
                    </div>

                    <div className="absolute bottom-6 right-6">
                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-[16px] shadow-xl border border-white/10 w-48">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Range</span>
                                <span className="text-[13px] font-bold text-blue-600">{(radius / 1000).toFixed(1)} km</span>
                            </div>
                            <input
                                type="range" min="1000" max="20000" step="1000"
                                value={radius}
                                onChange={(e) => setRadius(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#3b5bfd]"
                            />
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/5 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                        <h3 className="text-[16px] font-bold text-slate-900">Nearby Results</h3>
                        <p className="text-[13px] font-medium text-slate-500 mt-1">{facilities.length} verified locations</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {loading && facilities.length === 0 ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="p-5 bg-slate-50/50 rounded-[16px] border border-transparent animate-pulse space-y-4">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-8 bg-slate-100 rounded-[10px] w-full"></div>
                                </div>
                            ))
                        ) : facilities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-8">
                                <div className="text-6xl mb-4">🏥</div>
                                <p className="text-[14px] font-bold text-slate-900">No Facilities Found</p>
                                <p className="text-[12px] font-medium text-slate-500 mt-2">Try increasing search radius.</p>
                            </div>
                        ) : (
                            facilities.map((f) => (
                                <div
                                    key={f.id}
                                    id={`facility-${f.id}`}
                                    className={`p-5 border transition-all cursor-pointer rounded-[20px] ${selectedFacility?.id === f.id ? 'border-[#3b5bfd] bg-blue-50/30' : 'bg-white border-slate-50 hover:border-slate-200 hover:shadow-md'}`}
                                    onClick={() => {
                                        setSelectedFacility(f);
                                        if (leafletMapRef.current) {
                                            leafletMapRef.current.setView([f.lat, f.lng], 16);
                                        }
                                    }}
                                >
                                    <h4 className="font-bold text-slate-900 text-[15px] leading-tight mb-2">{f.name}</h4>
                                    <div className="space-y-2 mb-4">
                                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                                            📍 {f.address}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-[6px] text-[10px] font-bold">
                                                {f.distance?.toFixed(2)} km away
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleGetDirections(f); }}
                                        className="w-full py-3 bg-slate-900 text-white rounded-[12px] text-[12px] font-bold hover:bg-black transition-all shadow-lg shadow-black/5 active:scale-95"
                                    >
                                        Get Directions
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicLabFinder;

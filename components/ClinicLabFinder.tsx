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
            <div className="h-[600px] bg-white rounded-[40px] flex flex-col items-center justify-center p-10 text-center border border-slate-100 shadow-sm animate-in fade-in duration-500">
                <div className="text-6xl mb-6">📍</div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Location Access Required</h3>
                <p className="text-slate-500 text-sm max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="w-full md:w-auto">
                    <h2 className="text-3xl font-black tracking-tight flex items-center text-slate-900">
                        Clinic & Labs Finder
                        {loading && <div className="ml-4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>}
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isGpsActive ? 'Real-time OpenStreetMap Network' : 'Manual Location Explorer'}</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-center">
                    <form onSubmit={handleManualSearch} className="relative flex-1 sm:w-80 group">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search Area or Pincode..."
                            className="w-full pl-6 pr-12 py-3.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm group-hover:shadow-md"
                        />
                        <button
                            type="submit"
                            disabled={isSearchingLocation}
                            className="absolute right-2 top-1.5 bottom-1.5 w-10 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                        >
                            {isSearchingLocation ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : '🔍'}
                        </button>
                    </form>

                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex items-center ${activeCategory === cat.id ? 'bg-[#3b5bfd] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
                            >
                                <span>{cat.icon}</span>
                                {cat.id}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Map Container */}
                <div className="lg:col-span-2 bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden h-[600px] relative group">
                    <div ref={mapRef} className="w-full h-full z-0" />

                    {loading && facilities.length === 0 && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 z-20">
                            <div className="w-16 h-16 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Querying OpenStreetMap...</p>
                        </div>
                    )}

                    {/* Map Overlay Controls */}
                    <div className="absolute top-8 left-8 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 shadow-lg z-10">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Location Status</p>
                        <div className="flex items-center justify-between gap-4 mt-1">
                            {isGpsActive ? (
                                <p className="text-[10px] font-black uppercase text-green-500 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    GPS Locked
                                </p>
                            ) : (
                                <p className="text-[10px] font-black uppercase text-amber-500 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                    Manual Search
                                </p>
                            )}
                            <button
                                onClick={resetToGps}
                                disabled={isGpsActive || isSearchingLocation}
                                className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${isGpsActive ? 'text-slate-300 pointer-events-none' : 'text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white'}`}
                            >
                                Reset to GPS
                            </button>
                        </div>
                    </div>

                    <div className="absolute bottom-6 right-6 flex flex-col space-y-2 align-end">
                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-slate-100 w-48 z-10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[8px] font-black uppercase text-slate-400">Search Radius</span>
                                <span className="text-[10px] font-black text-blue-600">{(radius / 1000).toFixed(1)} km</span>
                            </div>
                            <input
                                type="range" min="1000" max="20000" step="500"
                                value={radius}
                                onChange={(e) => setRadius(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3b5bfd]"
                            />
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nearby {activeCategory}</span>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">Showing {facilities.length} verified locations</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide custom-scrollbar">
                        {loading && facilities.length === 0 ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-transparent animate-pulse space-y-4">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-8 bg-slate-100 rounded-[12px] w-full"></div>
                                </div>
                            ))
                        ) : facilities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-10">
                                <div className="text-6xl mb-6">🏥</div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No {activeCategory.toLowerCase()} found in this area. Try increasing search radius.</p>
                            </div>
                        ) : (
                            facilities.map((f) => (
                                <article
                                    key={f.id}
                                    id={`facility-${f.id}`}
                                    className={`p-6 border transition-all group cursor-pointer rounded-[32px] ${selectedFacility?.id === f.id ? 'border-[#3b5bfd] bg-blue-50/30 ring-4 ring-blue-500/5' : 'bg-white border-slate-100 hover:border-[#3b5bfd] hover:shadow-lg'}`}
                                    onClick={() => {
                                        setSelectedFacility(f);
                                        if (leafletMapRef.current) {
                                            leafletMapRef.current.setView([f.lat, f.lng], 16);
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-black text-slate-800 text-sm leading-tight tracking-tight group-hover:text-[#3b5bfd] transition-colors">{f.name}</h4>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <p className="flex items-start text-[10px] text-slate-500 font-bold leading-tight">
                                            <span className="mr-2 mt-0.5">📍</span> {f.address}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest">
                                                {f.distance?.toFixed(2)} km away
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleGetDirections(f); }}
                                            className="px-4 py-2.5 bg-[#3b5bfd] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
                                        >
                                            Get Directions ➜
                                        </button>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicLabFinder;

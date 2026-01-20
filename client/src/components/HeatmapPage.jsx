import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGlobalConfig } from '../contexts/GlobalConfigContext';
import { API_BASE_URL } from '../config';
import { MapContainer, TileLayer, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat/dist/leaflet-heat.js'; // Import heatmap plugin
import { Map, Loader, RefreshCw, Layers, Download, Upload, Signal } from 'lucide-react';

// Heatmap Layer Component
const HeatmapLayer = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        // Configuration du heatmap
        const heat = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 13,
            max: 1.0, // Scale normalized to 1.0
            minOpacity: 0.2,
            gradient: {
                0.2: '#3b82f6', // Blue (Low)
                0.4: '#22c55e', // Green (Medium)
                0.7: '#eab308', // Yellow (High)
                1.0: '#ef4444'  // Red (Intense)
            }
        }).addTo(map);

        // Apply global transparency to the heatmap canvas to ensure map labels are visible
        if (heat._canvas) {
            heat._canvas.style.opacity = '0.6';
        }

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);

    return null;
};

// Component to handle clicks on the map and show aggregated stats
const ClickHandler = ({ data }) => {
    const [popupInfo, setPopupInfo] = useState(null);

    useMapEvents({
        click(e) {
            if (!data || data.length === 0) return;

            const radius = 500; // Search radius in meters
            const clickedPoint = e.latlng;

            // Filter points within the radius
            const nearbyPoints = data.filter(p => {
                if (!p.latitude || !p.longitude) return false;
                const pointLatLng = L.latLng(p.latitude, p.longitude);
                return pointLatLng.distanceTo(clickedPoint) <= radius;
            });

            if (nearbyPoints.length > 0) {
                // Calculate Statistics
                const total = nearbyPoints.length;
                const avgDl = nearbyPoints.reduce((sum, p) => sum + (Number(p.download_mbps) || 0), 0) / total;
                const avgUl = nearbyPoints.reduce((sum, p) => sum + (Number(p.upload_mbps) || 0), 0) / total;

                setPopupInfo({
                    latlng: clickedPoint,
                    count: total,
                    avgDl: avgDl.toFixed(2),
                    avgUl: avgUl.toFixed(2)
                });
            } else {
                setPopupInfo(null);
            }
        }
    });

    return popupInfo ? (
        <Popup position={popupInfo.latlng} onClose={() => setPopupInfo(null)}>
            <div style={{ color: '#000', minWidth: '160px' }}>
                <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                    📊 Info Zone (~500m)
                </h4>
                <div style={{ marginBottom: '4px' }}>
                    <strong>Points de test:</strong> {popupInfo.count}
                </div>
                <div style={{ marginBottom: '4px' }}>
                    <strong>Avg Download:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{popupInfo.avgDl} Mbps</span>
                </div>
                <div>
                    <strong>Avg Upload:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{popupInfo.avgUl} Mbps</span>
                </div>
            </div>
        </Popup>
    ) : null;
};

const HeatmapPage = () => {
    const { timeFilter } = useGlobalConfig();
    const [points, setPoints] = useState([]);
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [heatmapMode, setHeatmapMode] = useState('tech'); // 'tech', 'download', 'upload'

    const fetchData = async () => {
        setLoading(true);
        try {
            const timeParams = `?startDate=${timeFilter.startDate}&endDate=${timeFilter.endDate}&startTime=${timeFilter.startTime}&endTime=${timeFilter.endTime}`;
            const response = await axios.get(`${API_BASE_URL}/data${timeParams}`);
            // Ensure data has valid coordinates
            const validData = response.data.filter(d => d.latitude && d.longitude);
            setRawData(validData);
        } catch (error) {
            console.error("Error fetching heatmap data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [timeFilter]);

    // Recalculate heatmap points when mode or data changes
    useEffect(() => {
        if (!rawData.length) return;

        const heatPoints = rawData.map(d => {
            let intensity = 0.2;

            if (heatmapMode === 'tech') {
                if (!d.network_type) intensity = 0.2;
                else {
                    switch (d.network_type.toUpperCase()) {
                        case '5G': intensity = 1.0; break;
                        case '4G': intensity = 0.7; break;
                        case '3G': intensity = 0.4; break;
                        default: intensity = 0.2;
                    }
                }
            } else if (heatmapMode === 'download') {
                // Normalize 0-100 Mbps
                const val = Number(d.download_mbps) || 0;
                intensity = Math.min(val / 100, 1.0);
                if (intensity < 0.1) intensity = 0.1; // Min visibility
            } else if (heatmapMode === 'upload') {
                // Normalize 0-50 Mbps
                const val = Number(d.upload_mbps) || 0;
                intensity = Math.min(val / 50, 1.0);
                if (intensity < 0.1) intensity = 0.1;
            }

            return [Number(d.latitude), Number(d.longitude), intensity];
        });

        setPoints(heatPoints);
    }, [rawData, heatmapMode]);

    return (
        <div style={{ padding: '20px', color: 'var(--text-primary)', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 0 }}>
                    <Map size={24} color="var(--accent-color)" />
                    <h2 style={{ margin: 0 }}>Carte Thermique Réseau (Heatmap)</h2>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{
                        display: 'flex',
                        background: 'rgba(30, 41, 59, 0.7)', // Glass
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => setHeatmapMode('tech')}
                            style={{
                                padding: '8px 12px', border: 'none', cursor: 'pointer',
                                background: heatmapMode === 'tech' ? 'rgba(56, 189, 248, 0.25)' : 'transparent', // Match sidebar active
                                color: heatmapMode === 'tech' ? '#38bdf8' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                            }}
                        >
                            <Signal size={16} /> Technologie
                        </button>
                        <button
                            onClick={() => setHeatmapMode('download')}
                            style={{
                                padding: '8px 12px', border: 'none', cursor: 'pointer',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                                background: heatmapMode === 'download' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                color: heatmapMode === 'download' ? '#38bdf8' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                            }}
                        >
                            <Download size={16} /> Download
                        </button>
                        <button
                            onClick={() => setHeatmapMode('upload')}
                            style={{
                                padding: '8px 12px', border: 'none', cursor: 'pointer',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                                background: heatmapMode === 'upload' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                color: heatmapMode === 'upload' ? '#38bdf8' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                            }}
                        >
                            <Upload size={16} /> Upload
                        </button>
                    </div>

                    <button
                        onClick={fetchData}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '8px',
                            background: 'rgba(30, 41, 59, 0.7)', // Glass
                            backdropFilter: 'blur(12px)',
                            color: 'var(--text-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)', cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="card" style={{
                flex: 1,
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.7)', // Glass style
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Mode Description Note */}
                <div style={{ padding: '10px 15px', background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.9rem', color: '#cbd5e1' }}>
                    ℹ️ <strong>Note :</strong> {heatmapMode === 'tech'
                        ? "Affichage basé sur le type de technologie (5G, 4G, 3G, 2G)."
                        : heatmapMode === 'download'
                            ? "La carte est basée sur la vitesse de Download (plus rouge = vitesse plus rapide)."
                            : "La carte est basée sur la vitesse d'Upload (plus rouge = vitesse plus rapide)."}
                </div>

                {loading && points.length === 0 && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff'
                    }}>
                        <Loader size={32} className="loader" /> Chargement...
                    </div>
                )}

                <MapContainer center={[36.75, 3.05]} zoom={6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    {points.length > 0 && <HeatmapLayer points={points} />}
                    <ClickHandler data={rawData} />
                </MapContainer>

                {/* Legend Overlay */}
                <div style={{
                    position: 'absolute', bottom: '20px', right: '20px',
                    background: 'rgba(30, 41, 59, 0.7)', // Match Database Table
                    backdropFilter: 'blur(12px)',
                    padding: '15px', borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 1000,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)', minWidth: '220px',
                    color: '#e2e8f0'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                        <Layers size={16} /> Légende : {heatmapMode === 'tech' ? 'Technologie' : heatmapMode === 'download' ? 'Vitesse Download' : 'Vitesse Upload'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '20px', height: '10px', background: 'linear-gradient(90deg, #ef4444, #ef4444)', borderRadius: '2px' }}></div>
                            <span>
                                {heatmapMode === 'tech' ? '5G (Intense)' :
                                    heatmapMode === 'download' ? '> 100 Mbps (Rapide)' :
                                        '> 50 Mbps (Rapide)'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '20px', height: '10px', background: 'linear-gradient(90deg, #eab308, #eab308)', borderRadius: '2px' }}></div>
                            <span>
                                {heatmapMode === 'tech' ? '4G (Élevé)' :
                                    heatmapMode === 'download' ? '~ 70 Mbps' :
                                        '~ 35 Mbps'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '20px', height: '10px', background: 'linear-gradient(90deg, #22c55e, #22c55e)', borderRadius: '2px' }}></div>
                            <span>
                                {heatmapMode === 'tech' ? '3G (Moyen)' :
                                    heatmapMode === 'download' ? '~ 40 Mbps' :
                                        '~ 20 Mbps'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '20px', height: '10px', background: 'linear-gradient(90deg, #3b82f6, #3b82f6)', borderRadius: '2px' }}></div>
                            <span>
                                {heatmapMode === 'tech' ? '2G (Faible)' :
                                    heatmapMode === 'download' ? '< 20 Mbps (Lent)' :
                                        '< 10 Mbps (Lent)'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeatmapPage;

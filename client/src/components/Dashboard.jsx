import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Circle, Polygon, useMap } from 'react-leaflet';
import { Activity, Wifi, MapPin, Database, Server, AlertTriangle, Radio, Settings, X, Save, BarChart2, Signal, Globe, LayoutDashboard, Calendar, Clock } from 'lucide-react';
import { useGlobalConfig } from '../contexts/GlobalConfigContext';
import { API_BASE_URL } from '../config';
import L from 'leaflet';
import '../index.css';

// Component to auto-center map
const MapReCenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            // High zoom level to make the selected BTS visible
            map.flyTo(center, 12, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
};

// Custom BTS icon (static)
const btsIcon = new L.DivIcon({
    className: 'bts-marker',
    html: `<div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <circle cx="12" cy="12" r="3"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
        </svg>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
});

// Calculate sector path (triangle/pie slice)
const getSectorPath = (lat, lng, radiusKm, startAngle, endAngle) => {
    const R = 6371; // Earth radius in km
    const centerLatRad = lat * Math.PI / 180;
    const centerLngRad = lng * Math.PI / 180;
    const points = [[lat, lng]]; // Start at center

    // Convert kilometers to degrees (approximation)
    // 1 degree latitude ~ 111.32 km
    // 1 degree longitude ~ 40075 * cos(lat) / 360 km

    // Let's generate points along the arc
    const step = 5; // degrees
    for (let angle = startAngle; angle <= endAngle; angle += step) {
        const angleRad = (angle - 90) * Math.PI / 180; // -90 to start from North (0 is East in trig)
        const bearingRad = angle * Math.PI / 180;
        const distRatio = radiusKm / R;
        const destLatVal = Math.asin(Math.sin(centerLatRad) * Math.cos(distRatio) +
            Math.cos(centerLatRad) * Math.sin(distRatio) * Math.cos(bearingRad));
        const destLngVal = centerLngRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distRatio) * Math.cos(centerLatRad),
            Math.cos(distRatio) - Math.sin(centerLatRad) * Math.sin(destLatVal));
        points.push([destLatVal * 180 / Math.PI, destLngVal * 180 / Math.PI]);
    }

    points.push([lat, lng]); // Close to center
    return points;
};

const calculateStatus = (value, thresholds) => {
    if (value === null || value === undefined) return 'inconnu';
    if (value >= thresholds.good) return 'bon';
    if (value >= thresholds.medium) return 'moyen';
    return 'critique';
};

const getSectorColor = (state) => {
    switch (state) {
        case 'bon': return '#22c55e';
        case 'moyen': return '#eab308';
        case 'critique': return '#ef4444';
        default: return '#9ca3af';
    }
};

const SettingsModal = ({ config, setConfig, onClose, initialTab = 'general' }) => {
    const { timeFilter, setTimeFilter } = useGlobalConfig();
    const [localConfig, setLocalConfig] = useState(config);
    const [localTimeFilter, setLocalTimeFilter] = useState(timeFilter);
    const [activeTab, setActiveTab] = useState(initialTab);

    const handleSave = () => {
        setConfig(localConfig);
        setTimeFilter(localTimeFilter);
        onClose();
    };

    const TabButton = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                flex: 1,
                padding: '12px',
                background: activeTab === id ? 'var(--accent-color)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
            }}
        >
            {icon}
            {label}
        </button>
    );

    const SectionHeader = ({ title, description }) => (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {title}
            </label>
            {description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{description}</div>}
        </div>
    );

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(5, 10, 20, 0.8)',
            zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                width: '600px', maxWidth: '95%',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-color)' }}>
                            <Settings size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Paramètres</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px',
                            padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ padding: '16px 24px 0', display: 'flex', gap: '8px' }}>
                    <TabButton id="general" label="Général" icon={<LayoutDashboard size={16} />} />
                    <TabButton id="period" label="Période" icon={<Calendar size={16} />} />
                    <TabButton id="detection" label="Détection" icon={<Activity size={16} />} />
                    <TabButton id="advanced" label="Avancé" icon={<Server size={16} />} />
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '60vh' }}>

                    {activeTab === 'general' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Metric Selection */}
                            <div className="card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                                <SectionHeader title="Métrique Principal" description="Choisissez la métrique à analyser sur les graphiques." />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[
                                        { value: 'download', label: 'Téléchargement', unit: 'Mbps' },
                                        { value: 'upload', label: 'Envoi', unit: 'Mbps' }
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            onClick={() => setLocalConfig({ ...localConfig, metric: opt.value })}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '8px',
                                                border: localConfig.metric === opt.value ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                height: '60px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                                                backgroundColor: localConfig.metric === opt.value ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: localConfig.metric === opt.value ? 'var(--accent-color)' : 'var(--text-primary)' }}>{opt.label}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({opt.unit})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Map Style Selection */}
                            <div className="card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                                <SectionHeader title="Style de Carte" description="Choisissez l'apparence du fond de carte." />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[
                                        { value: 'colored', label: 'Coloré (Standard)', icon: '🗺️' },
                                        { value: 'monochrome', label: 'Noir & Blanc', icon: '🌑' }
                                    ].map(style => (
                                        <div
                                            key={style.value}
                                            onClick={() => setLocalConfig({ ...localConfig, mapStyle: style.value })}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '8px',
                                                border: (localConfig.mapStyle || 'colored') === style.value ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                height: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                backgroundColor: (localConfig.mapStyle || 'colored') === style.value ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
                                            <span style={{ fontWeight: 600, color: (localConfig.mapStyle || 'colored') === style.value ? 'var(--accent-color)' : 'var(--text-primary)' }}>{style.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Toggle Test Points */}
                            <div className="card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', color: 'var(--text-primary)' }}>Points de Test</label>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Afficher les points individuels sur la carte</span>
                                </div>
                                <div
                                    onClick={() => setLocalConfig({ ...localConfig, showTestPoints: !localConfig.showTestPoints })}
                                    style={{
                                        position: 'relative', width: '44px', height: '24px', borderRadius: '20px',
                                        backgroundColor: localConfig.showTestPoints ? 'var(--accent-color)' : '#334155',
                                        cursor: 'pointer', transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute', top: '2px', left: localConfig.showTestPoints ? '22px' : '2px',
                                        width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }} />
                                </div>
                            </div>

                            {/* Thresholds */}
                            <div className="card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                                <SectionHeader title="Seuils de Performance" description={`Définissez les critères de qualité pour le ${localConfig.metric === 'download' ? 'téléchargement' : 'transfert'}.`} />

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>Bon ({'>='} {localConfig.thresholds[localConfig.metric].good} Mbps)</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="100"
                                        value={localConfig.thresholds[localConfig.metric].good}
                                        onChange={(e) => setLocalConfig({
                                            ...localConfig,
                                            thresholds: { ...localConfig.thresholds, [localConfig.metric]: { ...localConfig.thresholds[localConfig.metric], good: Number(e.target.value) } }
                                        })}
                                        style={{ width: '100%', accentColor: 'var(--success)' }}
                                    />
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#eab308', fontWeight: 600 }}>Moyen ({'>='} {localConfig.thresholds[localConfig.metric].medium} Mbps)</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="50"
                                        value={localConfig.thresholds[localConfig.metric].medium}
                                        onChange={(e) => setLocalConfig({
                                            ...localConfig,
                                            thresholds: { ...localConfig.thresholds, [localConfig.metric]: { ...localConfig.thresholds[localConfig.metric], medium: Number(e.target.value) } }
                                        })}
                                        style={{ width: '100%', accentColor: '#eab308' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'detection' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <SectionHeader title="Mode de Détection" description="Sélectionnez la méthode d'agrégation des données pour identifier les zones critiques." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                {[
                                    { id: 'commune', icon: <MapPin size={18} />, label: 'Administratif', subLabel: 'Par Wilaya & Commune', desc: 'Idéal pour le reporting régional.' },
                                    { id: 'grid', icon: <Globe size={18} />, label: 'Géographique', subLabel: 'Grille (Recommandé)', desc: 'Analyse précise par zones de 500m².' },
                                    { id: 'antenna', icon: <Radio size={18} />, label: 'Infrastucture', subLabel: 'Par Cellule BTS', desc: 'Focus sur la performance équipement.' }
                                ].map(mode => (
                                    <div
                                        key={mode.id}
                                        onClick={() => setLocalConfig({ ...localConfig, mode: mode.id })}
                                        style={{
                                            padding: '16px', borderRadius: '12px',
                                            border: localConfig.mode === mode.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                            backgroundColor: localConfig.mode === mode.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                                            transition: 'all 0.2s hover:scale-[1.01]'
                                        }}
                                    >
                                        <div style={{
                                            padding: '12px', borderRadius: '50%',
                                            backgroundColor: localConfig.mode === mode.id ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                            color: localConfig.mode === mode.id ? '#fff' : 'var(--text-secondary)'
                                        }}>
                                            {mode.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: localConfig.mode === mode.id ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                                                {mode.label} <span style={{ opacity: 0.6, fontWeight: 400 }}>— {mode.subLabel}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{mode.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                                <SectionHeader title="Paramètres de l'Algorithme" />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Seuil Critique (Mbps)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                value={localConfig.detectionThreshold || 10}
                                                onChange={(e) => setLocalConfig({ ...localConfig, detectionThreshold: Number(e.target.value) })}
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                                                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)', outline: 'none', fontWeight: 600
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Échantillon Min.</label>
                                        <input
                                            type="number"
                                            value={localConfig.minTests || 5}
                                            onChange={(e) => setLocalConfig({ ...localConfig, minTests: Number(e.target.value) })}
                                            style={{
                                                width: '100%', padding: '10px 12px', borderRadius: '8px',
                                                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)', outline: 'none', fontWeight: 600
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {localConfig.mode === 'grid' && (
                                <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                                    <SectionHeader title="Configuration de la Grille" />
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Taille de cellule (degrés)</label>
                                    <input
                                        type="number" step="0.001"
                                        value={localConfig.gridSize || 0.005}
                                        onChange={(e) => setLocalConfig({ ...localConfig, gridSize: Number(e.target.value) })}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)', outline: 'none'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        Valeur recommandée : 0.005 (approx. 500m).
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'period' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                                <SectionHeader title="Période d'Analyse" description="Définissez l'intervalle de temps pour filtrer les données sur tout le tableau de bord." />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Date Début</label>
                                        <input
                                            type="date"
                                            value={localTimeFilter.startDate}
                                            onChange={(e) => setLocalTimeFilter({ ...localTimeFilter, startDate: e.target.value })}
                                            className="styled-input"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Date Fin</label>
                                        <input
                                            type="date"
                                            value={localTimeFilter.endDate}
                                            onChange={(e) => setLocalTimeFilter({ ...localTimeFilter, endDate: e.target.value })}
                                            className="styled-input"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Heure Début</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <Clock size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
                                            <input
                                                type="time"
                                                value={localTimeFilter.startTime}
                                                onChange={(e) => setLocalTimeFilter({ ...localTimeFilter, startTime: e.target.value })}
                                                className="styled-input"
                                                style={{ paddingLeft: '40px' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Heure Fin</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <Clock size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
                                            <input
                                                type="time"
                                                value={localTimeFilter.endTime}
                                                onChange={(e) => setLocalTimeFilter({ ...localTimeFilter, endTime: e.target.value })}
                                                className="styled-input"
                                                style={{ paddingLeft: '40px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '24px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px',
                    backgroundColor: 'var(--bg-card)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px', borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'transparent', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => e.target.style.borderColor = 'var(--text-secondary)'}
                        onMouseOut={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '10px 24px', borderRadius: '8px',
                            border: 'none',
                            background: 'var(--accent-color)',
                            color: '#fff', cursor: 'pointer', fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Dashboard Component
const Dashboard = () => {
    const { timeFilter } = useGlobalConfig();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [criticalZones, setCriticalZones] = useState([]);
    const [btsAntennas, setBtsAntennas] = useState([]);
    const [selectedBTS, setSelectedBTS] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [activeChart, setActiveChart] = useState('trend'); // 'trend', 'latency', 'signal', 'regional'
    const [trendWilaya, setTrendWilaya] = useState('All');
    const [latencyWilaya, setLatencyWilaya] = useState('All');
    const [selectedTech, setSelectedTech] = useState(null);
    const [selectedDrillWilaya, setSelectedDrillWilaya] = useState(null);
    const [drillLevel, setDrillLevel] = useState(0); // 0: Tech, 1: Wilaya, 2: Commune

    const mapSectionRef = useRef(null);

    // Default Configuration
    const [config, setConfig] = useState({
        metric: 'download',
        mode: 'commune', // commune, grid, antenna
        showTestPoints: true,
        detectionThreshold: 10,
        minTests: 5,
        gridSize: 0.005,
        mapStyle: 'colored',
        thresholds: {
            download: { good: 10, medium: 5 },
            upload: { good: 5, medium: 2 }
        }
    });

    useEffect(() => {
        fetchData();
    }, [config, timeFilter]); // Refetch when config or timeFilter changes

    const fetchData = async () => {
        try {
            const timeParams = `&startDate=${timeFilter.startDate}&endDate=${timeFilter.endDate}&startTime=${timeFilter.startTime}&endTime=${timeFilter.endTime}`;
            const queryParams = `?mode=${config.mode}&metric=${config.metric}&threshold=${config.detectionThreshold}&minTests=${config.minTests}&gridSize=${config.gridSize}${timeParams}`;

            const [dataRes, statsRes, criticalRes, btsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/data?start=null${timeParams}`), // Hack to add query params, 'start=null' just to start querystring if missing but here we just append
                axios.get(`${API_BASE_URL}/stats?q=1${timeParams}`),
                axios.get(`${API_BASE_URL}/critical-zones-with-bts${queryParams}`),
                axios.get(`${API_BASE_URL}/bts?q=1${timeParams}`)
            ]);
            setData(dataRes.data);
            setStats(statsRes.data);
            setCriticalZones(criticalRes.data);
            setBtsAntennas(btsRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    if (loading) return <div className="loader"></div>;

    // Safety check: ensure data is an array before processing
    if (!data || !Array.isArray(data)) {
        return (
            <div className="dashboard-container" style={{ textAlign: 'center', padding: '50px' }}>
                <h2 style={{ color: 'var(--danger)' }}>Erreur de chargement des données</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Impossible de récupérer les données du serveur.</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Réessayer
                </button>
            </div>
        );
    }

    // Process data for charts
    // 1. Tech Distribution (Pie)
    const techDistribution = data.reduce((acc, curr) => {
        const type = curr.network_type;
        if (['2G', '3G', '4G', '5G'].includes(type)) {
            acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
    }, {});
    const pieData = Object.keys(techDistribution).map(key => ({
        name: key,
        value: techDistribution[key]
    }));
    const TECH_COLORS = {
        '2G': '#f97316', // Orange
        '3G': '#eab308', // Yellow
        '4G': '#3b82f6', // Blue
        '5G': '#22c55e'  // Green (5G)
    };

    // 2. Signal Strength Distribution (Bar)
    const signalBuckets = data.reduce((acc, curr) => {
        const sig = curr.signal_strength_dbm || -100;
        if (sig > -80) acc.Excellent++;
        else if (sig > -95) acc.Good++;
        else if (sig > -110) acc.Fair++;
        else acc.Poor++;
        return acc;
    }, { Excellent: 0, Good: 0, Fair: 0, Poor: 0 });
    const signalData = Object.keys(signalBuckets).map(k => ({ name: k, value: signalBuckets[k] }));

    // 3. Regional Performance (Bar)
    const wilayaStats = data.reduce((acc, curr) => {
        const w = curr.wilaya || 'Unknown';
        if (!acc[w]) acc[w] = { sum: 0, count: 0 };
        acc[w].sum += parseFloat(curr.download_mbps || 0);
        acc[w].count++;
        return acc;
    }, {});
    const regionalData = Object.keys(wilayaStats).map(k => ({
        name: k,
        avg_download: (wilayaStats[k].sum / wilayaStats[k].count).toFixed(2)
    })).sort((a, b) => b.avg_download - a.avg_download).slice(0, 10); // Top 10

    // Format Date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render Active Chart
    const renderActiveChart = () => {
        switch (activeChart) {
            case 'latency':
                return (
                    <>
                        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={20} /> Latency Analysis
                            </div>
                            <select
                                value={latencyWilaya}
                                onChange={(e) => setLatencyWilaya(e.target.value)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '5px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="All" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Toutes les Wilayas</option>
                                {[...new Set(data.map(d => d.wilaya).filter(w => w))].sort().map(w => (
                                    <option key={w} value={w} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{w}</option>
                                ))}
                            </select>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={
                                (latencyWilaya === 'All'
                                    ? data
                                    : data.filter(d => d.wilaya === latencyWilaya)
                                ).slice(0, 50).reverse()
                            }>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                                <Area type="monotone" dataKey="latency_ms" stroke="#8884d8" fill="#8884d8" name="Latency (ms)" fillOpacity={0.3} />
                                <Area type="monotone" dataKey="jitter_ms" stroke="#82ca9d" fill="#82ca9d" name="Jitter (ms)" fillOpacity={0.3} />
                                <Legend />
                            </AreaChart>
                        </ResponsiveContainer>
                    </>
                );
            case 'signal':
                return (
                    <>
                        <div className="section-title"><Signal size={20} /> Signal Quality Distribution</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={signalData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                                <Bar dataKey="value" fill="#38bdf8" name="Count" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </>
                );
            case 'regional':
                return (
                    <>
                        <div className="section-title"><Globe size={20} /> Regional Performance (Top 10)</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionalData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis type="number" stroke="var(--text-secondary)" />
                                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={100} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                                <Bar dataKey="avg_download" fill="#22c55e" name="Avg Download (Mbps)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </>
                );
            case 'trend':
            default:
                return (
                    <>
                        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Network Performance Trend</span>
                            <select
                                value={trendWilaya}
                                onChange={(e) => setTrendWilaya(e.target.value)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '5px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="All" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Toutes les Wilayas</option>
                                {[...new Set(data.map(d => d.wilaya).filter(w => w))].sort().map(w => (
                                    <option key={w} value={w} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{w}</option>
                                ))}
                            </select>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={
                                (trendWilaya === 'All'
                                    ? data
                                    : data.filter(d => d.wilaya === trendWilaya)
                                ).slice(0, 50).reverse()
                            }>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleDateString()} stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                                <Legend />
                                <Line type="monotone" dataKey="download_mbps" stroke="var(--accent-color)" strokeWidth={2} dot={false} name="Download" />
                                <Line type="monotone" dataKey="upload_mbps" stroke="#22c55e" strokeWidth={2} dot={false} name="Upload" />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                );
        }
    };

    return (
        <div className="dashboard-container" style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
            {showSettings && <SettingsModal config={config} setConfig={setConfig} onClose={() => setShowSettings(false)} initialTab={typeof showSettings === 'string' ? showSettings : 'period'} />}



            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>

                <div className="header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <h1 style={{
                                margin: 0,
                                fontSize: '3rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #fff 0%, #6366f1 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px'
                            }}>Mobilis Network Analytics</h1>
                            <div style={{
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'var(--bg-card)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                width: 'fit-content',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={14} /> Monitoring :
                                </span>
                                <span style={{
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: 'var(--accent-color)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    border: '1px solid rgba(59, 130, 246, 0.3)'
                                }}>
                                    {config?.metric || 'Loading...'}
                                </span>
                                <span style={{ height: '14px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }}></span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {(() => {
                                        const currentThresholds = config?.thresholds?.[config?.metric] || { good: 0, medium: 0 };
                                        return (
                                            <>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                                                    <span style={{ color: '#22c55e' }}>Bon &ge; {currentThresholds.good}</span>
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }}></span>
                                                    <span style={{ color: '#eab308' }}>Moyen &ge; {currentThresholds.medium}</span>
                                                </span>
                                            </>
                                        );
                                    })()}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowSettings(true);
                                // We can't easily pass initialTab via state here with current simple toggle,
                                // but we could enhance showSettings to be an object or string
                            }}
                            className="period-btn" // Add class for potential styling
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 15px', borderRadius: '8px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                                color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            <Calendar size={18} /> Période
                            {timeFilter.startDate && <span style={{ fontSize: '0.8em', marginLeft: '5px', color: 'var(--accent-color)' }}>Active</span>}
                        </button>

                        <button
                            onClick={() => setShowSettings('general')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 15px', borderRadius: '8px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                                color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            <Settings size={18} /> Configurer
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid-container">
                    <div className="card">
                        <div className="section-title"><Activity size={20} color="var(--accent-color)" /> Avg Download</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {Number(stats?.avg_download).toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Mbps</span>
                        </div>
                    </div>
                    <div className="card">
                        <div className="section-title"><Server size={20} color="#22c55e" /> Avg Upload</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {Number(stats?.avg_upload).toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Mbps</span>
                        </div>
                    </div>
                    <div className="card">
                        <div className="section-title"><Wifi size={20} color="#eab308" /> Avg Latency</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {Number(stats?.avg_latency).toFixed(0)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>ms</span>
                        </div>
                    </div>
                    <div className="card">
                        <div className="section-title"><Database size={20} color="#ef4444" /> Total Tests</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {stats?.total_tests}
                        </div>
                    </div>
                </div>

                {/* Critical Zones Alerts with Responsible BTS */}
                {criticalZones.length > 0 && (
                    <div className="card" style={{ marginBottom: '30px', borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}>
                        <div className="section-title" style={{ color: 'var(--danger)' }}>
                            <AlertTriangle size={20} /> Zones Critiques Détectées ({criticalZones.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {Array.isArray(criticalZones) && criticalZones.map((zone, idx) => {
                                const mode = zone.detection_mode || config.mode || 'commune';
                                const isGrid = mode === 'grid';
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setSelectedBTS({ latitude: Number(zone.lat), longitude: Number(zone.lng), nom: isGrid ? 'Zone Grille' : zone.commune, commune: zone.wilaya });
                                            mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: '1px solid var(--danger)',
                                            borderRadius: '8px',
                                            padding: '12px 16px',
                                            minWidth: '280px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                                    >
                                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                            📍 {zone.commune}, {zone.wilaya}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Débit moyen: <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{Number(zone.avg_download).toFixed(2)} Mbps</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            Tests: {zone.test_count} | Latence: {Number(zone.avg_latency).toFixed(0)} ms
                                        </div>
                                        {zone.responsible_bts && zone.responsible_bts.length > 0 && (
                                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '5px' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginBottom: '5px' }}>
                                                    📡 Antennes BTS Responsables:
                                                </div>
                                                {zone.responsible_bts.map((bts, bIdx) => (
                                                    <div key={bIdx} style={{ fontSize: '0.8rem', marginLeft: '10px', marginBottom: '5px', padding: '5px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                                        <strong>{bts.nom}</strong> ({Number(bts.distance_km).toFixed(1)} km)
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Map Section */}
                <div ref={mapSectionRef} className="card" style={{ marginBottom: '30px', height: '500px' }}>
                    <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={20} color="var(--accent-color)" /> Geospatial Coverage
                        </div>

                        {/* Search Bar - Relocated */}
                        <div style={{ position: 'relative', width: '300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 10px' }}>
                                <span style={{ marginRight: '8px' }}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="Recherche BTS ou Cell ID..."
                                    style={{
                                        border: 'none', outline: 'none', padding: '8px 0', width: '100%', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.9rem'
                                    }}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase();
                                        if (val.length > 1) {
                                            const matches = btsAntennas.filter(b =>
                                                b.nom.toLowerCase().includes(val) ||
                                                String(b.cell_id_A).includes(val) ||
                                                String(b.cell_id_B).includes(val) ||
                                                String(b.cell_id_C).includes(val)
                                            ).slice(0, 10);
                                            setSearchResults(matches);
                                        } else {
                                            setSearchResults([]);
                                        }
                                    }}
                                />
                            </div>
                            {searchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    borderRadius: '8px', marginTop: '5px', zIndex: 1000, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    {searchResults.map((res, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedBTS(res);
                                                setSearchResults([]);
                                            }}
                                            style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.9em' }}
                                            onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                        >
                                            <div><strong>{res.nom}</strong> <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>({res.commune})</span></div>
                                            <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                ID Ant: {res.cell_id_A}, {res.cell_id_B}, {res.cell_id_C}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <MapContainer center={[36.75, 3.05]} zoom={10} style={{ height: 'calc(100% - 50px)', width: '100%', borderRadius: '8px' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url={config.mapStyle === 'monochrome'
                                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            }
                        />
                        <MapReCenter center={selectedBTS && selectedBTS.latitude && selectedBTS.longitude ? [selectedBTS.latitude, selectedBTS.longitude] : null} />
                        {/* Critical Zone Markers (Circle or Rectangle) */}
                        {Array.isArray(criticalZones) && criticalZones.filter(z => z.lat && z.lng).map((zone, idx) => {
                            // Robust check for detection mode
                            const mode = zone.detection_mode || config.mode || 'commune';
                            const isGrid = mode === 'grid';
                            const center = [Number(zone.lat) || 0, Number(zone.lng) || 0];

                            // Unique key to prevent rendering issues
                            const uniqueKey = `critical-${mode}-${idx}-${zone.lat}-${zone.lng}`;

                            // Popup Content
                            const PopupContent = () => (
                                <div style={{ color: '#000' }}>
                                    <strong style={{ color: '#ef4444' }}>⚠️ ZONE CRITIQUE {isGrid ? '(GRILLE)' : ''}</strong><br />
                                    {isGrid ? (
                                        <>
                                            <strong>Communes:</strong> {zone.commune}<br />
                                            <strong>Wilayas:</strong> {zone.wilaya}<br />
                                        </>
                                    ) : (
                                        <>{zone.commune}, {zone.wilaya}<br /></>
                                    )}
                                    <hr style={{ margin: '5px 0', borderColor: '#eee' }} />
                                    Débit Moyen: {Number(zone.avg_download).toFixed(2)} Mbps<br />
                                    Latence: {Number(zone.avg_latency).toFixed(0)} ms<br />
                                    Tests: {zone.test_count}
                                </div>
                            );

                            if (isGrid) {
                                const size = Number(zone.grid_size) || 0.005;
                                const half = size / 2;
                                const centerLat = center[0];
                                const centerLng = center[1];

                                if (isNaN(centerLat) || isNaN(centerLng) || centerLat === 0 || centerLng === 0) {
                                    return null;
                                }

                                // manual polygon points: BL, TL, TR, BR
                                const polyPositions = [
                                    [centerLat - half, centerLng - half],
                                    [centerLat + half, centerLng - half],
                                    [centerLat + half, centerLng + half],
                                    [centerLat - half, centerLng + half]
                                ];

                                return (
                                    <Polygon
                                        key={uniqueKey}
                                        positions={polyPositions}
                                        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.4, weight: 2 }}
                                    >
                                        <Popup><PopupContent /></Popup>
                                    </Polygon>
                                );
                            }

                            return (
                                <CircleMarker
                                    key={uniqueKey}
                                    center={center}
                                    radius={25}
                                    fillColor="#ef4444"
                                    color="#ef4444"
                                    weight={3}
                                    fillOpacity={0.3}
                                >
                                    <Popup><PopupContent /></Popup>
                                </CircleMarker>
                            );
                        })}


                        {/* Regular Data Points (Toggleable) */}
                        {config.showTestPoints !== false && data.filter(p => p.latitude && p.longitude).map((point, idx) => {
                            // Find connected BTS info
                            // Optimization: In a real large app, pre-calculate this map outside the render loop
                            const connectedBTS = btsAntennas.find(b =>
                                b.cell_id_A === point.cell_id ||
                                b.cell_id_B === point.cell_id ||
                                b.cell_id_C === point.cell_id
                            );

                            let sectorName = '';
                            if (connectedBTS) {
                                if (connectedBTS.cell_id_A === point.cell_id) sectorName = 'A';
                                else if (connectedBTS.cell_id_B === point.cell_id) sectorName = 'B';
                                else if (connectedBTS.cell_id_C === point.cell_id) sectorName = 'C';
                            }

                            return (
                                <CircleMarker
                                    key={idx}
                                    center={[point.latitude, point.longitude]}
                                    radius={5}
                                    fillColor={point.network_type === '5G' ? '#22c55e' : point.network_type === '4G' ? '#38bdf8' : '#eab308'}
                                    color="transparent"
                                    fillOpacity={0.7}
                                >
                                    <Popup>
                                        <div style={{ color: '#000' }}>
                                            <strong>{point.network_type}</strong><br />
                                            DL: {point.download_mbps} Mbps<br />
                                            Lat: {point.latency_ms} ms<br />
                                            {connectedBTS && (
                                                <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #ccc', fontSize: '0.9em' }}>
                                                    <strong>BTS:</strong> {connectedBTS.nom}<br />
                                                    <strong>Secteur:</strong> {sectorName} (Cell ID: {point.cell_id})
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                        {/* BTS Antennas */}
                        {btsAntennas.filter(b => b.latitude && b.longitude).map((bts, idx) => {
                            // Dynamic Status Calculation within Map Loop
                            // Stats for sectors
                            const statsA = bts.stats?.A || {};
                            const statsB = bts.stats?.B || {};
                            const statsC = bts.stats?.C || {};

                            // Calculate dynamic status based on metric (upload vs download)
                            const valA = config.metric === 'upload' ? statsA.avg_upload : statsA.avg_download;
                            const valB = config.metric === 'upload' ? statsB.avg_upload : statsB.avg_download;
                            const valC = config.metric === 'upload' ? statsC.avg_upload : statsC.avg_download;

                            const statusA = calculateStatus(parseFloat(valA), config.thresholds[config.metric]);
                            const statusB = calculateStatus(parseFloat(valB), config.thresholds[config.metric]);
                            const statusC = calculateStatus(parseFloat(valC), config.thresholds[config.metric]);

                            return (
                                <React.Fragment key={`bts-${idx}`}>
                                    {selectedBTS && selectedBTS.id === bts.id && (
                                        <>
                                            {/* Selected BTS Highlight Ring */}
                                            {selectedBTS && selectedBTS.id === bts.id && (
                                                <Circle
                                                    center={[bts.latitude, bts.longitude]}
                                                    radius={300}
                                                    pathOptions={{ color: 'var(--accent-color)', dashArray: '10, 10', fillOpacity: 0.1 }}
                                                />
                                            )}

                                            {/* Sector A */}
                                            <Polygon
                                                positions={getSectorPath(Number(bts.latitude), Number(bts.longitude), 5, 0, 120)}
                                                pathOptions={{ color: getSectorColor(statusA), fillColor: getSectorColor(statusA), fillOpacity: 0.3, weight: 1 }}
                                            >
                                                <Popup>
                                                    <div style={{ minWidth: '200px' }}>
                                                        <strong style={{ color: getSectorColor(statusA), fontSize: '1.1em' }}>📡 Secteur A (Cell ID: {bts.cell_id_A})</strong>
                                                        <hr style={{ margin: '5px 0', borderColor: '#eee' }} />
                                                        <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                                                            <strong>État ({config.metric}):</strong> <span style={{ color: getSectorColor(statusA), fontWeight: 'bold' }}>{statusA.toUpperCase()}</span><br />
                                                            <strong>Tests:</strong> {statsA.test_count || 0}<br />
                                                            <strong>Download:</strong> {Number(statsA.avg_download || 0).toFixed(2)} Mbps<br />
                                                            <strong>Upload:</strong> {Number(statsA.avg_upload || 0).toFixed(2)} Mbps<br />
                                                            <strong>Latence:</strong> {Number(statsA.avg_latency || 0).toFixed(0)} ms<br />
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Polygon>
                                            {/* Sector B */}
                                            <Polygon
                                                positions={getSectorPath(Number(bts.latitude), Number(bts.longitude), 5, 120, 240)}
                                                pathOptions={{ color: getSectorColor(statusB), fillColor: getSectorColor(statusB), fillOpacity: 0.3, weight: 1 }}
                                            >
                                                <Popup>
                                                    <div style={{ minWidth: '200px' }}>
                                                        <strong style={{ color: getSectorColor(statusB), fontSize: '1.1em' }}>📡 Secteur B (Cell ID: {bts.cell_id_B})</strong>
                                                        <hr style={{ margin: '5px 0', borderColor: '#eee' }} />
                                                        <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                                                            <strong>État ({config.metric}):</strong> <span style={{ color: getSectorColor(statusB), fontWeight: 'bold' }}>{statusB.toUpperCase()}</span><br />
                                                            <strong>Tests:</strong> {statsB.test_count || 0}<br />
                                                            <strong>Download:</strong> {Number(statsB.avg_download || 0).toFixed(2)} Mbps<br />
                                                            <strong>Upload:</strong> {Number(statsB.avg_upload || 0).toFixed(2)} Mbps<br />
                                                            <strong>Latence:</strong> {Number(statsB.avg_latency || 0).toFixed(0)} ms<br />
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Polygon>
                                            {/* Sector C */}
                                            <Polygon
                                                positions={getSectorPath(Number(bts.latitude), Number(bts.longitude), 5, 240, 360)}
                                                pathOptions={{ color: getSectorColor(statusC), fillColor: getSectorColor(statusC), fillOpacity: 0.3, weight: 1 }}
                                            >
                                                <Popup>
                                                    <div style={{ minWidth: '200px' }}>
                                                        <strong style={{ color: getSectorColor(statusC), fontSize: '1.1em' }}>📡 Secteur C (Cell ID: {bts.cell_id_C})</strong>
                                                        <hr style={{ margin: '5px 0', borderColor: '#eee' }} />
                                                        <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                                                            <strong>État ({config.metric}):</strong> <span style={{ color: getSectorColor(statusC), fontWeight: 'bold' }}>{statusC.toUpperCase()}</span><br />
                                                            <strong>Tests:</strong> {statsC.test_count || 0}<br />
                                                            <strong>Download:</strong> {Number(statsC.avg_download || 0).toFixed(2)} Mbps<br />
                                                            <strong>Upload:</strong> {Number(statsC.avg_upload || 0).toFixed(2)} Mbps<br />
                                                            <strong>Latence:</strong> {Number(statsC.avg_latency || 0).toFixed(0)} ms<br />
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Polygon>
                                        </>
                                    )}
                                    <Marker
                                        position={[bts.latitude, bts.longitude]}
                                        icon={btsIcon}
                                        eventHandlers={{
                                            click: () => {
                                                setSelectedBTS(selectedBTS && selectedBTS.id === bts.id ? null : bts);
                                            },
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ minWidth: '200px', textAlign: 'center' }}>
                                                <strong style={{ fontSize: '1.2em', color: '#333' }}>📡 {bts.nom}</strong><br />
                                                <span style={{ fontSize: '0.9em', color: '#666' }}>{bts.commune}, {bts.wilaya}</span>
                                                <hr style={{ margin: '8px 0', borderColor: '#eee' }} />
                                                <div style={{ textAlign: 'left', fontSize: '0.9em' }}>
                                                    <strong>Total Tests:</strong> {(parseInt(statsA.test_count || 0) + parseInt(statsB.test_count || 0) + parseInt(statsC.test_count || 0))}<br />
                                                    <div style={{ marginTop: '5px' }}>
                                                        <span style={{ color: getSectorColor(statusA) }}>■</span> Sec A: {statsA.test_count || 0} tests<br />
                                                        <span style={{ color: getSectorColor(statusB) }}>■</span> Sec B: {statsB.test_count || 0} tests<br />
                                                        <span style={{ color: getSectorColor(statusC) }}>■</span> Sec C: {statsC.test_count || 0} tests
                                                    </div>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </React.Fragment>
                            );
                        })}

                    </MapContainer>
                </div >

                {/* Charts Row */}
                < div className="grid-container" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        {/* Integrated Sidebar */}
                        <div className="card" style={{
                            width: '80px', height: '400px', padding: '20px 0',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
                            flexShrink: 0
                        }}>
                            <div
                                title="Performance Trend"
                                onClick={() => setActiveChart('trend')}
                                style={{
                                    padding: '12px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeChart === 'trend' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activeChart === 'trend' ? 'var(--accent-color)' : 'var(--text-secondary)'
                                }}
                            >
                                <BarChart2 size={24} />
                            </div>
                            <div
                                title="Latency Analysis"
                                onClick={() => setActiveChart('latency')}
                                style={{
                                    padding: '12px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeChart === 'latency' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activeChart === 'latency' ? 'var(--accent-color)' : 'var(--text-secondary)'
                                }}
                            >
                                <Activity size={24} />
                            </div>
                            <div
                                title="Signal Quality"
                                onClick={() => setActiveChart('signal')}
                                style={{
                                    padding: '12px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeChart === 'signal' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activeChart === 'signal' ? 'var(--accent-color)' : 'var(--text-secondary)'
                                }}
                            >
                                <Signal size={24} />
                            </div>
                            <div
                                title="Regional Performance"
                                onClick={() => setActiveChart('regional')}
                                style={{
                                    padding: '12px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeChart === 'regional' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activeChart === 'regional' ? 'var(--accent-color)' : 'var(--text-secondary)'
                                }}
                            >
                                <Globe size={24} />
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="card" style={{ height: '400px', flex: 1 }}>
                            {renderActiveChart()}
                        </div>
                    </div>

                    <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                        <div className="section-title">
                            {drillLevel === 0 ? 'Répartition Technologique Globale' :
                                drillLevel === 1 ? `Analyse Régionale : Réseau ${selectedTech}` :
                                    `Détail Local : ${selectedDrillWilaya} (${selectedTech})`}
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            {/* Process Data Logic Extracted for Reuse */}
                            {(() => {
                                const currentPieData =
                                    drillLevel === 0 ? pieData :
                                        drillLevel === 1 ?
                                            Object.entries(data.filter(d => d.network_type === selectedTech).reduce((acc, curr) => {
                                                if (curr.wilaya) acc[curr.wilaya] = (acc[curr.wilaya] || 0) + 1;
                                                return acc;
                                            }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
                                            :
                                            Object.entries(data.filter(d => d.network_type === selectedTech && d.wilaya === selectedDrillWilaya).reduce((acc, curr) => {
                                                if (curr.commune) acc[curr.commune] = (acc[curr.commune] || 0) + 1;
                                                return acc;
                                            }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

                                return (
                                    <>
                                        {/* Chart Wrapper */}
                                        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={currentPieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        onClick={(entry) => {
                                                            if (drillLevel === 0) {
                                                                setSelectedTech(entry.name);
                                                                setDrillLevel(1);
                                                            } else if (drillLevel === 1) {
                                                                setSelectedDrillWilaya(entry.name);
                                                                setDrillLevel(2);
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {currentPieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={drillLevel === 0 ? (TECH_COLORS[entry.name] || '#8884d8') : `hsl(${index * 45}, 70%, 50%)`} style={{ outline: 'none' }} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                                                        itemStyle={{ color: 'var(--text-primary)' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>

                                            {/* Center Click Area for Back Navigation */}
                                            {drillLevel > 0 && (
                                                <div
                                                    onClick={() => {
                                                        if (drillLevel === 2) {
                                                            setDrillLevel(1);
                                                            setSelectedDrillWilaya(null);
                                                        } else {
                                                            setDrillLevel(0);
                                                            setSelectedTech(null);
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '50%', left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        width: '100px', height: '100px',
                                                        borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        zIndex: 10
                                                    }}
                                                    title="Cliquez au centre pour revenir"
                                                >
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '12px' }}>
                                                        Retour
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Legend Side (Right) */}
                                        <div style={{
                                            width: '140px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            paddingRight: '15px',
                                            overflowY: 'auto', maxHeight: '100%'
                                        }}>
                                            {drillLevel === 0 ? (
                                                Object.entries(TECH_COLORS).map(([tech, color]) => (
                                                    <div key={tech} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                        <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '3px', flexShrink: 0 }}></div>
                                                        <span>{tech}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                currentPieData.map((entry, index) => (
                                                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        <div style={{ width: '12px', height: '12px', backgroundColor: `hsl(${index * 45}, 70%, 50%)`, borderRadius: '3px', flexShrink: 0 }}></div>
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${entry.name}: ${entry.value}`}>
                                                            {entry.name} <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({entry.value})</span>
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div> {/* End Main Content Flex Column */}
        </div>
    );
};

export default Dashboard;

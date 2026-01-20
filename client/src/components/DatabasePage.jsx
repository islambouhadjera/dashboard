import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Loader } from 'lucide-react';
import { useGlobalConfig } from '../contexts/GlobalConfigContext';
import { API_BASE_URL } from '../config';

const DatabasePage = () => {
    const { timeFilter } = useGlobalConfig();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const timeParams = `?startDate=${timeFilter.startDate}&endDate=${timeFilter.endDate}&startTime=${timeFilter.startTime}&endTime=${timeFilter.endTime}`;
                const response = await axios.get(`${API_BASE_URL}/data${timeParams}`);
                setData(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, [timeFilter]);

    const formatDate = (dateString) => {
        const options = { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Helper functions for conditional styling
    const getLatencyColor = (value) => {
        if (!value) return 'var(--text-secondary)';
        if (value < 50) return '#10b981'; // Green
        if (value < 150) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const getSignalColor = (value) => {
        if (!value) return 'var(--text-secondary)';
        if (value > -85) return '#10b981'; // Green
        if (value > -105) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredData = React.useMemo(() => {
        let sortableData = [...data];

        // Filter
        if (searchTerm) {
            sortableData = sortableData.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Sort
        if (sortConfig.key) {
            sortableData.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [data, searchTerm, sortConfig]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader className="loader" size={48} />
            </div>
        );
    }

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.2, marginLeft: '5px' }}>⇅</span>;
        return (
            <span style={{ marginLeft: '5px', color: 'var(--accent-color)' }}>
                {sortConfig.direction === 'ascending' ? '↑' : '↓'}
            </span>
        );
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-primary)', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>

            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="section-title" style={{ fontSize: '1.5rem', margin: 0 }}>
                    <Database size={24} style={{ marginRight: '10px', color: 'var(--accent-color)' }} />
                    Detailed Logs
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            paddingLeft: '40px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'white',
                            width: '300px',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                        🔍
                    </div>
                </div>
            </div>

            <div className="card" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0,
                background: 'rgba(30, 41, 59, 0.7)', // Glass background from QnA
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div className="table-container" style={{ flex: 1, overflowY: 'auto', background: 'transparent', border: 'none' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
                                <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer', padding: '16px' }}>Time <SortIcon columnKey="timestamp" /></th>
                                <th onClick={() => handleSort('test_id')} style={{ cursor: 'pointer', padding: '16px' }}>ID <SortIcon columnKey="test_id" /></th>
                                <th onClick={() => handleSort('operator')} style={{ cursor: 'pointer', padding: '16px' }}>Operator <SortIcon columnKey="operator" /></th>
                                <th onClick={() => handleSort('network_type')} style={{ cursor: 'pointer', padding: '16px' }}>Network <SortIcon columnKey="network_type" /></th>
                                <th onClick={() => handleSort('device_type')} style={{ cursor: 'pointer', padding: '16px' }}>Device <SortIcon columnKey="device_type" /></th>
                                <th onClick={() => handleSort('download_mbps')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'right' }}>Download <SortIcon columnKey="download_mbps" /></th>
                                <th onClick={() => handleSort('upload_mbps')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'right' }}>Upload <SortIcon columnKey="upload_mbps" /></th>
                                <th onClick={() => handleSort('latency_ms')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'right' }}>Latency <SortIcon columnKey="latency_ms" /></th>
                                <th onClick={() => handleSort('signal_strength_dbm')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'right' }}>Signal <SortIcon columnKey="signal_strength_dbm" /></th>
                                <th onClick={() => handleSort('wilaya')} style={{ cursor: 'pointer', padding: '16px' }}>Location <SortIcon columnKey="wilaya" /></th>
                                <th style={{ padding: '16px' }}>Coordinates</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredData.map((row, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{formatDate(row.timestamp)}</td>
                                    <td style={{ padding: '14px 16px' }}><span style={{ fontFamily: 'monospace', color: 'var(--accent-color)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{row.test_id?.substring(0, 8)}</span></td>
                                    <td style={{ padding: '14px 16px', fontWeight: '500' }}>{row.operator}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span
                                            className={`badge badge-${row.network_type}`}
                                            style={row.network_type === '4G' || row.network_type === '5G' ? {
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                padding: '4px 8px', borderRadius: '6px'
                                            } : {
                                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                color: '#f59e0b',
                                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                                padding: '4px 8px', borderRadius: '6px'
                                            }}
                                        >
                                            {row.network_type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{row.device_type}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 'bold', color: row.download_mbps > 50 ? '#10b981' : row.download_mbps < 10 ? '#ef4444' : '#e2e8f0' }}>
                                        {Number(row.download_mbps).toFixed(2)} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Mbps</span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#e2e8f0' }}>{Number(row.upload_mbps).toFixed(2)} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Mbps</span></td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '500', color: getLatencyColor(row.latency_ms) }}>
                                        {row.latency_ms} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>ms</span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '500', color: getSignalColor(row.signal_strength_dbm) }}>
                                        {row.signal_strength_dbm || '-'} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>dBm</span>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: '#e2e8f0' }}>{row.wilaya}</span>
                                            <span style={{ fontSize: '0.8em', color: '#64748b' }}>{row.commune}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#64748b', fontSize: '0.85rem' }}>
                                        {Number(row.latitude).toFixed(4)}, {Number(row.longitude).toFixed(4)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedAndFilteredData.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No logs found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabasePage;

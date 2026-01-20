const express = require('express');
const cors = require('cors');
const db = require('./db');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder']
}));
app.use(express.json());

// Helper to build time filter condition
const getTimeMetadata = (query) => {
    const { startDate, endDate, startTime, endTime } = query;
    let clauses = [];
    let start = startDate ? `${startDate} ${startTime || '00:00:00'}` : null;
    let end = endDate ? `${endDate} ${endTime || '23:59:59'}` : null;

    if (start) clauses.push(`timestamp >= '${start}'`);
    if (end) clauses.push(`timestamp <= '${end}'`);

    return clauses.length > 0 ? clauses.join(' AND ') : null;
};

// Get all speed tests
app.get('/api/data', async (req, res) => {
    try {
        // Just select data. Sync is now handled separately on App load.
        // Select all columns to satisfy user requirement "all information possible"
        const timeFilter = getTimeMetadata(req.query);
        const query = `SELECT * FROM speed_tests ${timeFilter ? 'WHERE ' + timeFilter : ''} ORDER BY timestamp DESC`;
        const result = await db.query(query);
        res.json(result.rows); // MySQL returns rows directly in the array
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Explicit Sync Endpoint (Called on App Mount)
app.post('/api/sync', async (req, res) => {
    const syncScriptPath = process.env.SYNC_SCRIPT_PATH;
    if (!syncScriptPath) {
        console.log('Sync skipped: SYNC_SCRIPT_PATH not defined.');
        return res.json({ success: true, message: 'Sync skipped (not configured)' });
    }

    console.log('Running sync script:', syncScriptPath);
    try {
        const { stdout, stderr } = await execPromise(`node "${syncScriptPath}"`);
        if (stdout) console.log('Sync Output:', stdout);
        if (stderr) console.error('Sync Error:', stderr);
        res.json({ success: true, message: 'Sync completed' });
    } catch (syncErr) {
        console.error('Failed to run sync script:', syncErr.message);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Get Stats (Aggregated)
app.get('/api/stats', async (req, res) => {
    try {
        const timeFilter = getTimeMetadata(req.query);
        const whereClause = timeFilter ? 'WHERE ' + timeFilter : '';
        const statsQuery = `
            SELECT 
                COUNT(*) as total_tests,
                AVG(download_mbps) as avg_download,
                AVG(upload_mbps) as avg_upload,
                AVG(latency_ms) as avg_latency
            FROM speed_tests
            ${whereClause}
        `;
        const result = await db.query(statsQuery);
        res.json(result.rows[0]); // MySQL returns rows directly in the array
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get Critical Zones (Configurable Detection Modes)
app.get('/api/critical-zones', async (req, res) => {
    try {
        const {
            mode = 'commune',
            metric = 'download',
            threshold = 10,
            minTests = 5,
            gridSize = 0.005 // Approx 500m
        } = req.query;

        const metricColumn = metric === 'upload' ? 'upload_mbps' : 'download_mbps';
        const thresholdVal = parseFloat(threshold);
        const minTestsVal = parseInt(minTests);
        const gridSizeVal = parseFloat(gridSize);

        const timeFilter = getTimeMetadata(req.query);
        const whereClause = timeFilter ? 'WHERE ' + timeFilter : '';


        let query = '';

        if (mode === 'grid') {
            // Method 2: Geographic Grid
            query = `
                SELECT 
                    ROUND(latitude / ${gridSizeVal}) * ${gridSizeVal} as grid_lat,
                    ROUND(longitude / ${gridSizeVal}) * ${gridSizeVal} as grid_lng,
                    AVG(download_mbps) as avg_download,
                    AVG(upload_mbps) as avg_upload,
                    AVG(latency_ms) as avg_latency,
                    COUNT(*) as test_count
                FROM speed_tests
                ${whereClause}
                GROUP BY grid_lat, grid_lng
                HAVING AVG(${metricColumn}) < ${thresholdVal} AND COUNT(*) >= ${minTestsVal}
                ORDER BY avg_${metric} ASC
            `;
        } else if (mode === 'antenna') {
            // Method 3: Critical Antenna Sectors
            query = `
                SELECT 
                    cell_id,
                    AVG(download_mbps) as avg_download,
                    AVG(upload_mbps) as avg_upload,
                    AVG(latency_ms) as avg_latency,
                    AVG(latitude) as lat,
                    AVG(longitude) as lng,
                    COUNT(*) as test_count
                FROM speed_tests
                WHERE cell_id IS NOT NULL ${timeFilter ? 'AND ' + timeFilter : ''}
                GROUP BY cell_id
                HAVING AVG(${metricColumn}) < ${thresholdVal} AND COUNT(*) >= ${minTestsVal}
                ORDER BY avg_${metric} ASC
            `;
        } else {
            // Method 1: Commune/Wilaya (Default)
            query = `
                SELECT 
                    commune,
                    wilaya,
                    AVG(download_mbps) as avg_download,
                    AVG(upload_mbps) as avg_upload,
                    AVG(latency_ms) as avg_latency,
                    AVG(latitude) as lat,
                    AVG(longitude) as lng,
                    COUNT(*) as test_count
                FROM speed_tests
                ${whereClause}
                GROUP BY commune, wilaya
                HAVING AVG(${metricColumn}) < ${thresholdVal} AND COUNT(*) >= ${minTestsVal}
                ORDER BY avg_${metric} ASC
            `;
        }

        const result = await db.query(query);

        // Add mode info to response for client handling
        const responseData = result.rows.map(row => ({
            ...row,
            detection_mode: mode,
            // Calculate center for grid if needed
            lat: row.lat || row.grid_lat,
            lng: row.lng || row.grid_lng
        }));

        res.json(responseData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// Get BTS antennas covering a specific point (within 40km radius)
// Uses Haversine formula to calculate distance
app.get('/api/bts/coverage', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng parameters required' });
        }

        // 5km coverage radius
        const coverageRadius = 5;

        // Haversine formula in SQL (approximate for small distances)
        const query = `
            SELECT *,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(latitude))
                )) AS distance_km
            FROM bts_antennas
            HAVING distance_km <= ?
            ORDER BY distance_km ASC
        `;

        const result = await db.query(query, [lat, lng, lat, coverageRadius]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get all BTS antennas with dynamic status
app.get('/api/bts', async (req, res) => {
    try {
        // 1. Get All BTS
        const btsResult = await db.query('SELECT * FROM bts_antennas ORDER BY wilaya, commune');
        const btsList = btsResult.rows;

        // 2. Get Aggregated Stats by Cell ID
        const statsQuery = `
            SELECT 
                cell_id,
                AVG(download_mbps) as avg_download,
                AVG(upload_mbps) as avg_upload,
                AVG(latency_ms) as avg_latency,
                COUNT(*) as test_count
            FROM speed_tests
            WHERE cell_id IS NOT NULL ${getTimeMetadata(req.query) ? 'AND ' + getTimeMetadata(req.query) : ''}
            GROUP BY cell_id
        `;
        const statsResult = await db.query(statsQuery);
        const statsMap = {};
        statsResult.rows.forEach(row => {
            statsMap[row.cell_id] = row;
        });

        // 3. Map Stats to BTS Sectors and determine status
        const getStatus = (avgDownload) => {
            if (!avgDownload) return 'inconnu'; // No data
            if (avgDownload < 5) return 'critique';
            if (avgDownload < 10) return 'moyen';
            return 'bon'; // > 10 Mbps
        };

        const btsWithStatus = btsList.map(bts => {
            const statsA = statsMap[bts.cell_id_A] || { avg_download: 0 };
            const statsB = statsMap[bts.cell_id_B] || { avg_download: 0 };
            const statsC = statsMap[bts.cell_id_C] || { avg_download: 0 };

            return {
                ...bts,
                etatA: getStatus(statsA.avg_download ? parseFloat(statsA.avg_download) : null),
                etatB: getStatus(statsB.avg_download ? parseFloat(statsB.avg_download) : null),
                etatC: getStatus(statsC.avg_download ? parseFloat(statsC.avg_download) : null),
                stats: {
                    A: statsA,
                    B: statsB,
                    C: statsC
                }
            };
        });

        res.json(btsWithStatus);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get critical zones with responsible BTS antennas (Updated logic with Config)
app.get('/api/critical-zones-with-bts', async (req, res) => {
    try {
        const {
            mode = 'commune',
            metric = 'download',
            threshold = 10,
            minTests = 5,
            gridSize = 0.005
        } = req.query;

        const metricColumn = metric === 'upload' ? 'upload_mbps' : 'download_mbps';
        const thresholdVal = parseFloat(threshold);
        const minTestsVal = parseInt(minTests);
        const gridSizeVal = parseFloat(gridSize);

        // 1. Get Critical Zones based on Mode
        const timeFilter = getTimeMetadata(req.query);
        const whereClause = timeFilter ? 'WHERE ' + timeFilter : '';
        let criticalQuery = '';
        if (mode === 'grid') {
            criticalQuery = `
                SELECT 
                    ROUND(latitude / ${gridSizeVal}) * ${gridSizeVal} as grid_lat,
                    ROUND(longitude / ${gridSizeVal}) * ${gridSizeVal} as grid_lng,
                    AVG(download_mbps) as avg_download,
                    AVG(upload_mbps) as avg_upload,
                    AVG(latency_ms) as avg_latency,
                    COUNT(*) as test_count,
                    GROUP_CONCAT(DISTINCT commune SEPARATOR ', ') as related_communes,
                    GROUP_CONCAT(DISTINCT wilaya SEPARATOR ', ') as related_wilayas
                FROM speed_tests
                GROUP BY grid_lat, grid_lng
                HAVING AVG(${metricColumn}) < ${thresholdVal} AND COUNT(*) >= ${minTestsVal}
                ORDER BY avg_${metric} ASC
            `;
        } else if (mode === 'antenna') {
            criticalQuery = `
                SELECT 
                    cell_id,
                    AVG(download_mbps) as avg_download,
                    AVG(upload_mbps) as avg_upload,
                    AVG(latency_ms) as avg_latency,
                    AVG(latitude) as lat,
                    AVG(longitude) as lng,
                    COUNT(*) as test_count
                FROM speed_tests
                FROM speed_tests
                WHERE cell_id IS NOT NULL ${timeFilter ? 'AND ' + timeFilter : ''}
                GROUP BY cell_id
                HAVING AVG(${metricColumn}) < ${thresholdVal} AND COUNT(*) >= ${minTestsVal}
                ORDER BY avg_${metric} ASC
            `;
        } else {
            criticalQuery = `
                SELECT 
                    commune,
                    wilaya,
                    AVG(download_mbps) as avg_download,
                    AVG(upload_mbps) as avg_upload,
                    AVG(latency_ms) as avg_latency,
                    AVG(latitude) as lat,
                    AVG(longitude) as lng,
                    COUNT(*) as test_count
                FROM speed_tests
                ${whereClause}
                GROUP BY commune, wilaya
                HAVING AVG(${metricColumn}) < ${thresholdVal} AND COUNT(*) >= ${minTestsVal}
                ORDER BY avg_${metric} ASC
            `;
        }

        const zonesResult = await db.query(criticalQuery);
        let zones = zonesResult.rows.map(z => ({
            ...z,
            lat: z.lat || z.grid_lat,
            lng: z.lng || z.grid_lng,
            commune: mode === 'grid' ? (z.related_communes || 'Zone Inconnue') : (z.commune || 'Cellule Antenne'),
            wilaya: mode === 'grid' ? (z.related_wilayas || `Lat: ${z.grid_lat}`) : (z.wilaya || `Cell ID: ${z.cell_id}`),
            grid_size: mode === 'grid' ? gridSizeVal : null,
            detection_mode: mode
        }));

        // Reuse the logic from /api/bts to get BTS with states
        // In a real app, this should be a shared function
        const btsResult = await db.query('SELECT * FROM bts_antennas');
        const btsList = btsResult.rows;

        const statsQuery = `
            SELECT cell_id, AVG(download_mbps) as avg_download, AVG(upload_mbps) as avg_upload FROM speed_tests 
            ${whereClause ? whereClause + ' AND' : 'WHERE'} cell_id IS NOT NULL 
            GROUP BY cell_id
        `;
        const statsResult = await db.query(statsQuery);
        const statsMap = {};
        statsResult.rows.forEach(r => statsMap[r.cell_id] = r);

        const getStatus = (dl) => {
            if (!dl) return 'inconnu';
            if (dl < 5) return 'critique';
            if (dl < 20) return 'moyen';
            return 'bon';
        };

        const btsWithStatus = btsList.map(bts => ({
            ...bts,
            etatA: getStatus(statsMap[bts.cell_id_A]?.avg_download),
            etatB: getStatus(statsMap[bts.cell_id_B]?.avg_download),
            etatC: getStatus(statsMap[bts.cell_id_C]?.avg_download)
        }));

        // Helper function to calculate bearing
        const calculateBearing = (lat1, lng1, lat2, lng2) => {
            const toRad = (deg) => deg * Math.PI / 180;
            const toDeg = (rad) => rad * 180 / Math.PI;
            const dLng = toRad(lng2 - lng1);
            const y = Math.sin(dLng) * Math.cos(toRad(lat2));
            const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
                Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
            let bearing = toDeg(Math.atan2(y, x));
            return (bearing + 360) % 360;
        };

        const getResponsibleSubAntenna = (bearing) => {
            if (bearing >= 0 && bearing < 120) return 'A';
            if (bearing >= 120 && bearing < 240) return 'B';
            return 'C';
        };

        // For each zone, find nearby BTS and determine status
        const zonesWithBTS = await Promise.all(zones.map(async (zone) => {
            const R = 6371;
            const zoneLat = parseFloat(zone.lat);
            const zoneLng = parseFloat(zone.lng);

            // Calculate distance for ALL BTS, then filter and sort
            // Optimization: In a real app with thousands of BTS, use PostGIS 'ST_DWithin' or bounding box
            const btsWithDistance = btsWithStatus.map(bts => {
                const btsLat = parseFloat(bts.latitude);
                const btsLng = parseFloat(bts.longitude);

                const dLat = (zoneLat - btsLat) * Math.PI / 180;
                const dLon = (zoneLng - btsLng) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(btsLat * Math.PI / 180) * Math.cos(zoneLat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                return { ...bts, distance_km: distance };
            });

            const nearbyBTS = btsWithDistance
                .filter(bts => bts.distance_km <= 5)
                .sort((a, b) => a.distance_km - b.distance_km)
                .slice(0, 5);

            // Calculate details for these BTS
            const detailedBTS = nearbyBTS.map(bts => {
                const bearing = calculateBearing(
                    parseFloat(bts.latitude), parseFloat(bts.longitude),
                    zoneLat, zoneLng
                );
                const responsibleSub = getResponsibleSubAntenna(bearing);
                const subState = bts[`etat${responsibleSub}`];

                return {
                    ...bts,
                    bearing: bearing.toFixed(1),
                    distance_km: bts.distance_km.toFixed(2), // Format for display
                    responsible_sub_antenna: responsibleSub,
                    sub_antenna_state: subState
                };
            });

            return {
                ...zone,
                responsible_bts: detailedBTS
            };
        }));
        res.json(zonesWithBTS);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Mobile App Endpoints ---

// 1. Submit Test Result
app.post('/api/mobile/submit-test', async (req, res) => {
    const {
        download_mbps,
        upload_mbps,
        latency_ms,
        jitter_ms,
        latitude,
        longitude,
        network_type,
        device_type
    } = req.body;

    // Validate essential data
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'GPS coordinates are required' });
    }

    try {
        const query = `
            INSERT INTO speed_tests 
            (test_id, download_mbps, upload_mbps, latency_ms, jitter_ms, latitude, longitude, network_type, device_type, operator, test_server, timestamp)
            VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 'Mobilis', 'Local Server', NOW())
        `;

        await db.query(query, [
            download_mbps || 0,
            upload_mbps || 0,
            latency_ms || 0,
            jitter_ms || 0,
            latitude,
            longitude,
            network_type || 'Unknown',
            device_type || 'Mobile'
        ]);

        res.json({ success: true, message: 'Test result saved successfully' });
    } catch (err) {
        console.error('Error saving mobile test:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Download Test Endpoint (Streams random data)
app.get('/api/speedtest/download', (req, res) => {
    // Send 10MB chunk (adjust size as needed)
    const sizeInBytes = 10 * 1024 * 1024; // 10 MB
    const chunk = Buffer.alloc(1024 * 64, 'a'); // 64KB chunk
    let sent = 0;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=speedtest.dat');

    const stream = () => {
        if (sent >= sizeInBytes) {
            res.end();
            return;
        }
        const canWrite = res.write(chunk);
        sent += chunk.length;
        if (canWrite) {
            setImmediate(stream);
        } else {
            res.once('drain', stream);
        }
    };
    stream();
});

// --- LLM Integration (Native Node.js) ---
const llmService = require('./llmservice');
const syncService = require('./syncservice');

// Initialize LLM on startup (optional, but good for UX)
(async () => {
    try {
        console.log('Pre-initializing LLM...');
        await llmService.initialize();
    } catch (err) {
        console.error('Failed to pre-initialize LLM:', err);
    }
})();

// Ask Endpoint
app.post('/api/llm/ask', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Question is required' });

        const sql = await llmService.generateSql(question);
        res.json({ sql: sql });
    } catch (err) {
        console.error('LLM Generation Error:', err);
        res.status(500).json({ error: 'Failed to generate SQL', details: err.message });
    }
});

// Execute Endpoint
app.post('/api/llm/execute', async (req, res) => {
    const { sql } = req.body;

    if (!sql || !sql.trim().toLowerCase().startsWith('select')) {
        return res.status(400).json({ error: 'Only SELECT queries are allowed for safety.' });
    }

    try {
        // 1. Synchronize Database
        console.log('Synchronizing database before execution...');
        try {
            // Use new SyncService
            const syncResult = await syncService.syncDatabases();
            console.log('Sync result:', syncResult);
        } catch (syncErr) {
            console.error('Sync warning:', syncErr.message);
        }

        // 2. Execute SQL
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error('SQL Execution Error:', err.message);
        res.status(500).json({ error: 'Database execution failed', details: err.message });
    }
});

// --- End LLM Integration ---

// 3. Upload Test Endpoint
app.post('/api/speedtest/upload', (req, res) => {
    // We just discard the data to measure upload speed on client
    req.on('data', () => { }); // Consume stream
    req.on('end', () => {
        res.json({ success: true });
    });
});

// Export for Vercel
module.exports = app;

// Only listen if run directly (not required as module)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}



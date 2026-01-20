import React, { useState, useRef, useEffect } from 'react';
import { Play, Trash2, Plus, MessageSquare, Database, RefreshCw, ChevronRight, Check, Sparkles, Terminal } from 'lucide-react';

import { API_BASE_URL } from '../config';

const QnAPage = ({ cells, setCells }) => {
    // Local state is removed in favor of props from App.jsx

    const addCell = () => {
        setCells([...cells, { id: Date.now(), question: '', sql: '', result: null, status: 'idle', error: null }]);
    };

    const removeCell = (id) => {
        setCells(cells.filter(cell => cell.id !== id));
    };

    // Fix: Use functional update to avoid stale closures
    const updateCell = (id, field, value) => {
        setCells(prevCells => prevCells.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const generateSQL = async (id, question) => {
        if (!question.trim()) return;

        console.log("Generating SQL for:", question);
        updateCell(id, 'status', 'generating');
        updateCell(id, 'error', null);

        try {
            const res = await fetch(`${API_BASE_URL}/llm/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            if (!res.ok) throw new Error('Failed to generate SQL');

            const data = await res.json();
            console.log("Received SQL:", data);

            if (data.error) throw new Error(data.error);

            setCells(prevCells => prevCells.map(c =>
                c.id === id
                    ? { ...c, sql: data.sql, status: 'generated', error: null }
                    : c
            ));
        } catch (err) {
            console.error("Frontend Error:", err);
            updateCell(id, 'status', 'error');
            updateCell(id, 'error', err.message);
        }
    };

    const executeSQL = async (id, sql) => {
        if (!sql.trim()) return;

        updateCell(id, 'status', 'executing');
        updateCell(id, 'error', null);

        try {
            const res = await fetch(`${API_BASE_URL}/llm/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
            });

            if (!res.ok) throw new Error('Failed to execute SQL');

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            updateCell(id, 'result', data);
            updateCell(id, 'status', 'success');
        } catch (err) {
            updateCell(id, 'status', 'error');
            updateCell(id, 'error', err.message);
        }
    };

    return (
        <div style={{
            padding: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
            color: '#e2e8f0',
            fontFamily: '"Inter", sans-serif'
        }}>
            {/* Header Section */}
            <div style={{ marginBottom: '50px', position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '-40px',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
                    zIndex: -1,
                    pointerEvents: 'none'
                }} />
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    marginBottom: '10px',
                    background: 'linear-gradient(135deg, #fff 0%, #6366f1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-1px'
                }}>
                    Assistant IA
                </h1>
                <p style={{
                    color: '#94a3b8',
                    fontSize: '1.1rem',
                    maxWidth: '600px',
                    lineHeight: '1.6'
                }}>
                    Explorez votre réseau avec la puissance de l'IA locale.
                    Posez des questions complexes et obtenez des réponses instantanées.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {cells.map((cell, index) => (
                    <div key={cell.id} className="glass-card" style={{
                        position: 'relative',
                        animation: 'fadeIn 0.5s ease-out'
                    }}>
                        {/* Status Indicator Bar */}
                        <div style={{
                            position: 'absolute',
                            left: '0',
                            top: '20px',
                            bottom: '20px',
                            width: '4px',
                            backgroundColor: cell.status === 'error' ? '#ef4444' :
                                cell.status === 'success' ? '#10b981' :
                                    cell.status === 'generating' || cell.status === 'executing' ? '#6366f1' : 'rgba(255,255,255,0.1)',
                            borderRadius: '0 4px 4px 0',
                            boxShadow: cell.status === 'generating' || cell.status === 'executing' ? '0 0 10px #6366f1' : 'none',
                            transition: 'all 0.3s'
                        }} />

                        {/* Cell Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingLeft: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    color: '#64748b'
                                }}>
                                    CELLULE {index + 1}
                                </div>
                                {cell.status === 'generating' && <span className="status-badge generating"><RefreshCw size={14} className="spin" /> Génération du SQL...</span>}
                                {cell.status === 'executing' && <span className="status-badge executing"><RefreshCw size={14} className="spin" /> Exécution sur DB...</span>}
                                {cell.status === 'success' && <span className="status-badge success"><Check size={14} /> Terminé</span>}
                                {cell.status === 'error' && <span className="status-badge error">Erreur</span>}
                            </div>
                            <button
                                onClick={() => removeCell(cell.id)}
                                className="icon-btn delete"
                                title="Supprimer"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* Question Input */}
                        <div style={{ paddingLeft: '20px', marginBottom: '24px' }}>
                            <div className="input-group">
                                <div className="input-icon">
                                    <Sparkles size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <textarea
                                        value={cell.question}
                                        onChange={(e) => updateCell(cell.id, 'question', e.target.value)}
                                        placeholder="Décrivez ce que vous cherchez..."
                                        className="modern-textarea"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                generateSQL(cell.id, cell.question);
                                            }
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Appuyez sur Entrée pour générer</span>
                                        <button
                                            onClick={() => generateSQL(cell.id, cell.question)}
                                            disabled={cell.status === 'generating' || !cell.question}
                                            className={`action-btn primary ${(!cell.question || cell.status === 'generating') ? 'disabled' : ''}`}
                                        >
                                            <Play size={14} fill="currentColor" /> Générer SQL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SQL Editor Area */}
                        {(cell.sql || cell.status === 'generated' || cell.status === 'executing' || cell.status === 'success' || cell.status === 'error') && (
                            <div className="code-section" style={{ animation: 'slideDown 0.3s ease-out' }}>
                                <div className="code-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Terminal size={14} color="#6366f1" />
                                        <span>Requête SQL</span>
                                    </div>
                                    <button
                                        onClick={() => executeSQL(cell.id, cell.sql)}
                                        disabled={cell.status === 'executing' || !cell.sql}
                                        className="run-btn"
                                    >
                                        {cell.status === 'executing' ? <RefreshCw size={14} className="spin" /> : <Play size={14} />} Exécuter
                                    </button>
                                </div>
                                <div className="code-editor">
                                    <textarea
                                        value={cell.sql}
                                        onChange={(e) => updateCell(cell.id, 'sql', e.target.value)}
                                        spellCheck="false"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error Box */}
                        {cell.error && (
                            <div className="error-box">
                                <strong>Une erreur est survenue</strong>
                                <p>{cell.error}</p>
                            </div>
                        )}

                        {/* Results Table */}
                        {cell.result && (
                            <div className="result-section" style={{ animation: 'slideUp 0.4s ease-out' }}>
                                <div className="result-header">
                                    <Database size={16} /> Résultat ({Array.isArray(cell.result) ? cell.result.length : 0} lignes)
                                </div>
                                <div className="table-container custom-scrollbar">
                                    <table>
                                        <thead>
                                            <tr>
                                                {cell.result.length > 0 && Object.keys(cell.result[0]).map(key => (
                                                    <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cell.result.map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).map((val, j) => (
                                                        <td key={j}>
                                                            {val === null ? <span style={{ opacity: 0.3 }}>N/A</span> :
                                                                typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {cell.result.length === 0 && (
                                        <div className="empty-state">
                                            Aucune donnée trouvée pour cette requête.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Cell Button */}
                <div
                    onClick={addCell}
                    className="add-btn"
                >
                    <div className="icon-circle">
                        <Plus size={24} />
                    </div>
                    <span>Nouvelle Analyse</span>
                </div>
            </div>

            <style>{`
                /* Animations */
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                /* Glass Card */
                .glass-card {
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 30px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .glass-card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
                }

                /* Inputs */
                .modern-textarea {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #fff;
                    font-size: 1.1rem;
                    line-height: 1.5;
                    font-family: inherit;
                    resize: vertical;
                    min-height: 50px;
                    outline: none;
                    padding: 0;
                }
                .modern-textarea::placeholder { color: rgba(255,255,255,0.2); }
                
                .input-group {
                    display: flex;
                    gap: 16px;
                    background: rgba(0,0,0,0.2);
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.05);
                    transition: border-color 0.2s;
                }
                .input-group:focus-within {
                    border-color: rgba(99,102,241,0.5);
                    background: rgba(0,0,0,0.3);
                }
                .input-icon {
                    color: #6366f1;
                    padding-top: 4px;
                }

                /* Buttons */
                .action-btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .action-btn.primary {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: white;
                    box-shadow: 0 2px 4px rgba(99,102,241,0.3);
                }
                .action-btn.primary:hover:not(.disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(99,102,241,0.4);
                }
                .action-btn.disabled { opacity: 0.5; cursor: not-allowed; }

                .icon-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .icon-btn.delete { color: #64748b; }
                .icon-btn.delete:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                /* Status Badges */
                .status-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                .status-badge.generating { background: rgba(99,102,241,0.1); color: #818cf8; }
                .status-badge.executing { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
                .status-badge.success { background: rgba(16, 185, 129, 0.1); color: #34d399; }
                .status-badge.error { background: rgba(239, 68, 68, 0.1); color: #f87171; }

                /* Code Editor */
                .code-section {
                    margin-left: 20px;
                    background: #0f172a;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                    margin-bottom: 24px;
                }
                .code-header {
                    padding: 10px 16px;
                    background: rgba(255,255,255,0.03);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #94a3b8;
                    font-size: 0.85rem;
                }
                .code-editor textarea {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #a5b4fc;
                    font-family: 'Fira Code', monospace;
                    padding: 16px;
                    min-height: 80px;
                    outline: none;
                    font-size: 0.9rem;
                    line-height: 1.6;
                }
                .run-btn {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #fff;
                    padding: 4px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                .run-btn:hover { background: rgba(255,255,255,0.2); }

                /* Result Table */
                .result-section { margin-left: 20px; }
                .result-header {
                    margin-bottom: 12px;
                    color: #94a3b8;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .table-container {
                    overflow-x: auto;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                    max-height: 400px;
                }
                table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                th {
                    background: rgba(15, 23, 42, 0.8);
                    padding: 16px;
                    text-align: left;
                    color: #94a3b8;
                    font-weight: 600;
                    font-size: 0.75rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    white-space: nowrap;
                    position: sticky;
                    top: 0;
                }
                td {
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    color: #e2e8f0;
                }
                tr:last-child td { border-bottom: none; }
                tr:hover td { background: rgba(255,255,255,0.02); }

                /* Error Box */
                .error-box {
                    margin-left: 20px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    padding: 16px;
                    border-radius: 12px;
                    color: #fca5a5;
                    font-size: 0.9rem;
                    margin-bottom: 24px;
                }

                /* Add Btn */
                .add-btn {
                    border: 2px dashed rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                    color: #94a3b8;
                }
                .add-btn:hover {
                    border-color: #6366f1;
                    color: #6366f1;
                    background: rgba(99,102,241,0.05);
                }
                .icon-circle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                }
                .add-btn:hover .icon-circle { background: #6366f1; color: white; }

                /* Scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
            `}</style>
        </div>
    );
};

export default QnAPage;

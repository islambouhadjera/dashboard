import React, { useState } from 'react';
import { GlobalConfigProvider } from './contexts/GlobalConfigContext';
import Dashboard from './components/Dashboard';
import HeatmapPage from './components/HeatmapPage';
import DatabasePage from './components/DatabasePage';
import QnAPage from './components/QnAPage';
import { LayoutDashboard, Map, Database, Bot } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  // Trigger Sync ONLY on App Mount (Browser Refresh)
  React.useEffect(() => {
    const runSync = async () => {
      try {
        console.log("Triggering DB Sync on App Load...");
        await fetch(`${API_BASE_URL}/sync`, { method: 'POST' });
        console.log("DB Sync request sent.");
      } catch (error) {
        console.error("Failed to trigger sync:", error);
      }
    };
    runSync();
  }, []);

  // State for QnA Page (Lifted to persist navigation)
  const [qnaCells, setQnaCells] = useState([
    { id: Date.now(), question: '', sql: '', result: null, status: 'idle', error: null }
  ]);

  return (
    <GlobalConfigProvider>
      <div className="App" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
        {/* Global Sidebar - Professional Mobilis Style */}
        <div style={{ padding: '20px', paddingRight: '0', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{
            width: '80px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '30px 0',
            gap: '30px',
            borderRadius: '16px', // Slightly less rounded for professional look
            background: '#0f172a', // Solid corporate dark
            border: '1px solid #1e293b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', // Subtle shadow
          }}>
            {/* Mobilis-ish Brand Indicator */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #76b82a 0%, #0099cc 100%)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>M</div>

            {/* Navigation Items */}
            {[
              { id: 'dashboard', icon: LayoutDashboard, title: 'Statistiques Globales' },
              { id: 'heatmap', icon: Map, title: 'Heatmap Details' },
              { id: 'database', icon: Database, title: 'Base de Données' },
              { id: 'qna', icon: Bot, title: 'Assistant IA' }
            ].map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.title}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'transparent', // Light blue transparent
                    color: isActive ? '#38bdf8' : '#64748b', // Light cyan text
                    position: 'relative',
                    marginTop: '10px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#1e293b';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
          {currentView === 'dashboard' ? <Dashboard /> :
            currentView === 'heatmap' ? <HeatmapPage /> :
              currentView === 'database' ? <DatabasePage /> :
                <QnAPage cells={qnaCells} setCells={setQnaCells} />}
        </div>
      </div>
    </GlobalConfigProvider>
  );
}

export default App;

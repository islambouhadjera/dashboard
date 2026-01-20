// Configuration pour l'API
// En production (Vercel), utiliser l'URL relative /api
// En local, utiliser http://localhost:5000/api

const isProduction = import.meta.env.PROD;
export const API_BASE_URL = import.meta.env.VITE_API_URL || (isProduction ? '/api' : 'http://localhost:5000/api');

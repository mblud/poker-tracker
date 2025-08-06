import axios from 'axios'

// Base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000'

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Player service functions
export const playerService = {
  // Existing functions
  getAll: () => api.get('/api/players'),
  create: (playerData) => api.post('/api/players', playerData),
  testConnection: () => api.get('/api/test'),
  addBuyIn: (playerId, buyinData) => api.post(`/api/players/${playerId}/buyin`, buyinData),
  getGameStats: () => api.get('/api/game-stats'),
  getPlayerPaymentSummary: (playerId) => api.get(`/api/players/${playerId}/payment-summary`),
  
  // NEW rebuy functions
  processRebuy: (rebuyData) => api.post('/api/rebuys', rebuyData),
  getRecentRebuys: () => api.get('/api/rebuys/recent'),
  
    // NEW admin functions
    getRecentTransactions: () => api.get('/api/transactions/recent'),
    deletePayment: (playerId, paymentId) => api.delete(`/api/players/${playerId}/payments/${paymentId}`),
}

// Export the axios instance in case we need it elsewhere
export default api

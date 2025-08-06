import axios from 'axios'

// Base URL for your FastAPI backend
const API_BASE_URL = 'https://poker-tracker-production.up.railway.app';

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
  
  // Rebuy functions
  processRebuy: (rebuyData) => api.post('/api/rebuys', rebuyData),
  getRecentRebuys: () => api.get('/api/rebuys/recent'),
  
  // Admin functions
  getRecentTransactions: () => api.get('/api/transactions/recent'),
  deletePayment: (playerId, paymentId) => api.delete(`/api/players/${playerId}/payments/${paymentId}`),
  deletePlayer: (playerId) => api.delete(`/api/players/${playerId}`),
  confirmPayment: (playerId, paymentId) => api.put(`/api/players/${playerId}/payments/${paymentId}/confirm`),
  getPendingPayments: () => api.get('/api/pending-payments'),
  
  // FIXED CASH OUT METHODS - using 'api' instance and correct variable names
  createCashOut: (playerId, data) => {
    return api.post(`/api/players/${playerId}/cashout`, data)
  },
  
  getPendingCashOuts: () => {
    return api.get('/api/pending-cashouts')
  },
  
  confirmCashOut: (cashOutId) => {
    return api.put(`/api/cashouts/${cashOutId}/confirm`)
  },
  
  getCashOutHistory: () => {
    return api.get('/api/cashouts/history')
  }
}

// Export the axios instance in case we need it elsewhere
export default api
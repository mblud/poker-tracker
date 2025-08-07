import axios from 'axios'

// Base URL for your FastAPI backend
const API_BASE_URL = 'https://degenpoker.up.railway.app';

class PlayerService {
    async request(url, options = {}) {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }
  
      return response.json()
    }
  
    // Player management
    async create(playerData) {
      return this.request('/api/players', {
        method: 'POST',
        body: JSON.stringify(playerData),
      })
    }
  
    async getAll() {
      return { data: await this.request('/api/players') }
    }
  
    async deletePlayer(playerId) {
      return this.request(`/api/players/${playerId}`, {
        method: 'DELETE',
      })
    }
  
    // Buy-ins and payments
    async addBuyIn(playerId, buyInData) {
      return this.request(`/api/players/${playerId}/buyin`, {
        method: 'POST',
        body: JSON.stringify(buyInData),
      })
    }
  
    async confirmPayment(playerId, paymentId) {
      return this.request(`/api/players/${playerId}/payments/${paymentId}/confirm`, {
        method: 'PUT',
      })
    }
  
    async deletePayment(playerId, paymentId) {
      return this.request(`/api/players/${playerId}/payments/${paymentId}`, {
        method: 'DELETE',
      })
    }
  
    // Rebuys
    async processRebuy(rebuyData) {
      return this.request('/api/rebuys', {
        method: 'POST',
        body: JSON.stringify(rebuyData),
      })
    }
  
    async getRecentRebuys() {
      return { data: await this.request('/api/rebuys/recent') }
    }
  
    // 🔥 CASH OUT METHODS
    async createCashOut(playerId, cashOutData) {
      return this.request(`/api/players/${playerId}/cashout`, {
        method: 'POST',
        body: JSON.stringify(cashOutData),
      })
    }
  
    async getPendingCashOuts() {
      return { data: await this.request('/api/pending-cashouts') }
    }
  
    async confirmCashOut(cashOutId) {
      return this.request(`/api/cashouts/${cashOutId}/confirm`, {
        method: 'PUT',
      })
    }

// In api.js, update the confirmCashOut method:
async confirmCashOutWithPayments(cashOutId, paymentMethods) {
    return this.request(`/api/cashouts/${cashOutId}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({
        payment_methods: paymentMethods,
        reason: "Player cashed out"
      }),
    })
  }
  
    // 🔥 NEW: Get recent confirmed cash outs
    async getRecentCashOuts() {
      return { data: await this.request('/api/cashouts/recent') }
    }
  
    async getCashOutHistory() {
      return { data: await this.request('/api/cashouts/history') }
    }
  
    // Game statistics
    async getGameStats() {
      return { data: await this.request('/api/game-stats') }
    }
  
    async getPlayerPaymentSummary(playerId) {
      return { data: await this.request(`/api/players/${playerId}/payment-summary`) }
    }
  
    // Transactions
    async getRecentTransactions() {
      return { data: await this.request('/api/transactions/recent') }
    }
  
    async getPendingPayments() {
      return { data: await this.request('/api/pending-payments') }
    }
  
    // Admin functions
    async backupGameData() {
      return { data: await this.request('/api/admin/backup') }
    }
  
    async restoreGameData(backupData) {
      return this.request('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify(backupData),
      })
    }
  
    // Debug endpoints
    async debugCashOuts() {
      return { data: await this.request('/api/debug/cashouts') }
    }
  
    // Health check
    async healthCheck() {
      return { data: await this.request('/api/health') }
    }
  
    async test() {
      return { data: await this.request('/api/test') }
    }
  }
  
  export const playerService = new PlayerService()
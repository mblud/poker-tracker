import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { playerService } from './services/api'
import { QRCodeSVG } from 'qrcode.react'
import RebuyForm from './components/RebuyForm'

function PokerTracker() {
  // Move all your existing state and functions here
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gameStats, setGameStats] = useState({ 
    total_pot: 0, 
    total_dealer_fees: 0, 
    total_buy_ins: 0,
    payment_method_breakdown: {}
  })
  const [lastPaymentCount, setLastPaymentCount] = useState(0)
const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  
  // Buy-in modal state
  const [showBuyInModal, setShowBuyInModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [buyInAmount, setBuyInAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  // QR Code modal state
  const [showQRModal, setShowQRModal] = useState(false)
  const [recentRebuys, setRecentRebuys] = useState([])

  // Generate QR code URL
  const rebuyUrl = `${window.location.origin}/rebuy`
// Admin panel state
const [showAdminPanel, setShowAdminPanel] = useState(false)
const [recentTransactions, setRecentTransactions] = useState([])
const [showPinModal, setShowPinModal] = useState(false)
const [pinInput, setPinInput] = useState('')
const [adminPin] = useState('6969') // Host can change this
const [pendingPayments, setPendingPayments] = useState([])
const [showPendingCount, setShowPendingCount] = useState(0)

  // Keep ALL your existing functions (loadPlayers, loadGameStats, addPlayer, etc.)

  // Load players and game stats when component starts + polling
  useEffect(() => {
    loadPlayers()
    loadGameStats()
    
    // Set up polling every 5 seconds to auto-update the page
    const interval = setInterval(() => {
      loadPlayers()
      loadGameStats()
      checkForNewPayments() // ADD THIS LINE
    }, 5000) // Update every 5 seconds
    
    // Cleanup interval when component unmounts
    return () => clearInterval(interval)
  }, [])

  // Polling for recent rebuys when QR modal is open
  useEffect(() => {
    let interval
    if (showQRModal) {
      // Poll every 3 seconds for new rebuys
      interval = setInterval(() => {
        loadRecentRebuys()
        loadPlayers() // Refresh player data
        loadGameStats() // Refresh game stats
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [showQRModal])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const response = await playerService.getAll()
      setPlayers(response.data)
      setError('')
    } catch (err) {
      setError('Failed to load players')
      console.error('Error loading players:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadGameStats = async () => {
    try {
      const response = await playerService.getGameStats()
      setGameStats(response.data)
    } catch (err) {
      console.error('Error loading game stats:', err)
    }
  }
  

  const loadRecentRebuys = async () => {
    try {
      const response = await playerService.getRecentRebuys()
      setRecentRebuys(response.data)
    } catch (err) {
      console.error('Error loading recent rebuys:', err)
    }
  }
  // ADD THIS NEW FUNCTION RIGHT AFTER:
  const checkForNewPayments = async () => {
    try {
      const response = await playerService.getRecentTransactions()
      const currentPaymentCount = response.data.length
      
      // Initialize on first load (don't show notifications for existing payments)
      if (lastPaymentCount === 0) {
        setLastPaymentCount(currentPaymentCount)
        return
      }
      
      // Check for NEW payments (after first load)
      if (currentPaymentCount > lastPaymentCount) {
        const newPaymentCount = currentPaymentCount - lastPaymentCount
        const newPayments = response.data.slice(0, newPaymentCount)
        
        // Show notification for each new payment
        newPayments.forEach(payment => {
          showPaymentNotification(payment.player_name, payment.amount, payment.method)
        })
        
        setLastPaymentCount(currentPaymentCount)
      }
    } catch (err) {
      console.error('Error checking for new payments:', err)
    }
  }

  const addPlayer = async () => {
    if (!playerName.trim()) return
    
    try {
      setLoading(true)
      await playerService.create({ name: playerName })
      await loadPlayers()
      await loadGameStats()
      setPlayerName('')
      setError('')
    } catch (err) {
      setError('Failed to add player')
      console.error('Error adding player:', err)
    } finally {
      setLoading(false)
    }
  }

  const openBuyInModal = (player) => {
    setSelectedPlayer(player)
    setBuyInAmount('')
    setPaymentMethod('Cash')
    setShowBuyInModal(true)
  }

  const closeBuyInModal = () => {
    setShowBuyInModal(false)
    setSelectedPlayer(null)
    setBuyInAmount('')
  }

  const openQRModal = () => {
    setShowQRModal(true)
    loadRecentRebuys()
  }

  const closeQRModal = () => {
    setShowQRModal(false)
    setRecentRebuys([])
  }

  const processBuyIn = async () => {
    if (!buyInAmount || !selectedPlayer) return

    try {
      setLoading(true)
      await playerService.addBuyIn(selectedPlayer.id, {
        amount: parseFloat(buyInAmount),
        method: paymentMethod
      })
      await loadPlayers()
      await loadGameStats()
      closeBuyInModal()
      setError('')
    } catch (err) {
      setError('Failed to process buy-in')
      console.error('Error processing buy-in:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addPlayer()
    }
  }
  const deletePlayer = async (playerId, playerName, playerTotal, transactionCount) => {
    const confirmMessage = transactionCount > 0 
      ? `DELETE PLAYER: ${playerName}?\n\n⚠️ This will remove:\n• Player: ${playerName}\n• ${transactionCount} transactions\n• $${playerTotal} from the pot\n\nThis cannot be undone!`
      : `DELETE PLAYER: ${playerName}?\n\nPlayer has no transactions yet.\nThis cannot be undone!`
      
    if (!confirm(confirmMessage)) {
      return
    }
    
    try {
      setLoading(true)
      await playerService.deletePlayer(playerId)
      await loadPlayers()
      await loadGameStats()
      await loadRecentTransactions()
      setError('')
    } catch (err) {
      setError('Failed to delete player')
      console.error('Error deleting player:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format payment summary for each player
  const formatPaymentSummary = (player) => {
    const summary = {}
    player.payments.forEach(payment => {
      const method = payment.method
      if (!summary[method]) {
        summary[method] = { total: 0, count: 0 }
      }
      summary[method].total += payment.amount
      summary[method].count += 1
    })

    return Object.entries(summary).map(([method, data]) => 
      `${data.count} ${method} ($${data.total.toFixed(0)})`
    ).join(', ')
  }
  const loadRecentTransactions = async () => {
    try {
      const response = await playerService.getRecentTransactions()
      setRecentTransactions(response.data)
    } catch (err) {
      console.error('Error loading transactions:', err)
    }
  }
  
  const deleteTransaction = async (playerId, paymentId, playerName, amount) => {
    if (!confirm(`Delete $${amount} transaction for ${playerName}?`)) {
      return
    }
    
    try {
      setLoading(true)
      await playerService.deletePayment(playerId, paymentId)
      await loadPlayers()
      await loadGameStats()
      await loadRecentTransactions()
      setError('')
    } catch (err) {
      setError('Failed to delete transaction')
      console.error('Error deleting transaction:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const openAdminPanel = () => {
    setShowPinModal(true)
    setPinInput('')
  }
  
  const verifyPin = () => {
    if (pinInput === adminPin) {
      setShowPinModal(false)
      setShowAdminPanel(true)
      loadRecentTransactions()
      loadPendingPayments()  // ADD THIS LINE
      setPinInput('')
    } else {
      alert('Incorrect PIN')
      setPinInput('')
    }
  }
  
  const handlePinKeyPress = (e) => {
    if (e.key === 'Enter') {
      verifyPin()
    }
  }
  // ADD THESE NEW FUNCTIONS:
const loadPendingPayments = async () => {
  try {
    const response = await playerService.getPendingPayments()
    setPendingPayments(response.data)
    setShowPendingCount(response.data.length)
  } catch (err) {
    console.error('Error loading pending payments:', err)
  }
}

const confirmPayment = async (playerId, paymentId, playerName, amount) => {
  if (!confirm(`Confirm $${amount} payment from ${playerName}?\n\nThis means you received the money.`)) {
    return
  }
  
  try {
    setLoading(true)
    await playerService.confirmPayment(playerId, paymentId)
    await loadPlayers()
    await loadGameStats()
    await loadPendingPayments()
    await loadRecentTransactions()
    setError('')
  } catch (err) {
    setError('Failed to confirm payment')
    console.error('Error confirming payment:', err)
  } finally {
    setLoading(false)
  }
}
  // ADD THESE NEW FUNCTIONS RIGHT AFTER:
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    setNotificationsEnabled(permission === 'granted')
    return permission === 'granted'
  }
  return false
}

const showPaymentNotification = (player_name, amount, method) => {
  if (notificationsEnabled) {
    new Notification(`💰 New Payment Request`, {
      body: `${player_name} submitted $${amount} ${method} payment`,
      icon: '🃏',
      requireInteraction: true
    })
    
    // Play audio alert
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEASD0AAEg9AAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBy6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcF')
      audio.volume = 0.3
      audio.play()
    } catch (e) {
      console.log('Audio not supported')
    }
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🃏 Poker Tracker</h1>
          <p className="text-green-100 text-xl">Professional game management</p>
</header>

     {/* Enhanced Game Stats */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <div className="card text-center">
    <p className="text-sm text-gray-500">Total Pot</p>
    <p className="text-2xl font-bold text-green-600">${gameStats.total_pot.toFixed(2)}</p>
  </div>
  <div className="card text-center">
    <p className="text-sm text-gray-500">Dealer Fees</p>
    <p className="text-2xl font-bold text-blue-600">${gameStats.total_dealer_fees.toFixed(2)}</p>
  </div>
  <div className="card text-center">
    <p className="text-sm text-gray-500">Total Buy-Ins</p>
    <p className="text-2xl font-bold text-purple-600">${gameStats.total_buy_ins.toFixed(2)}</p>
  </div>
  <div className="card text-center">
  <div className="space-y-2">
    <button
      onClick={() => {
        requestNotificationPermission()
        alert('Host Mode: Notifications enabled!')
      }}
      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-sm"
    >
      🔔 Enable Host Mode
    </button>
    <button
      onClick={openQRModal}
      className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-sm"
    >
      📱 Player Buy-in/Rebuy
    </button>
    <button
      onClick={openAdminPanel}
      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-sm"
    >
      ⚙️ Admin Panel
    </button>
  </div>
</div>
</div>

        {/* Payment Method Breakdown */}
        {Object.keys(gameStats.payment_method_breakdown).length > 0 && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold mb-4">💳 Payment Method Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(gameStats.payment_method_breakdown).map(([method, data]) => (
                <div key={method} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">{method}</p>
                  <p className="text-lg font-bold text-gray-900">${data.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{data.count} transactions</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Add Player Card */}
        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-6">Add Player</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg disabled:opacity-50"
            />
            <button
              onClick={addPlayer}
              disabled={loading || !playerName.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Players ({players.length})</h2>
          </div>

          <div className="space-y-3">
            {loading && players.length === 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading players...</p>
              </div>
            )}

            {players.map((player) => (
              <div
                key={player.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <span className="text-lg font-medium">{player.name}</span>
                  <div className="text-sm text-gray-600">
                    {player.payments.length > 0 ? (
                      <>
                        <div className="mb-1">
                          💳 {formatPaymentSummary(player)}
                        </div>
                        <div>${player.total.toFixed(2)} in pot</div>
                      </>
                    ) : (
                      <div className="text-gray-500">No buy-ins yet</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-green-600">
                    ${player.total.toFixed(2)}
                  </span>
                  <button
                    onClick={() => openBuyInModal(player)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold"
                  >
                    Buy In
                  </button>
                </div>
              </div>
            ))}

            {!loading && players.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎲</div>
                <p className="text-gray-500 text-lg">No players added yet</p>
                <p className="text-gray-400">Add your first player to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center">
              <h3 className="text-2xl font-semibold mb-4">📱 Player Buy-in & Rebuy</h3>
              <p className="text-gray-600 mb-6">Players scan this for buy-ins or rebuys</p>
                
                {/* QR Code Display */}
                <QRCodeSVG 
  value={rebuyUrl} 
  size={200}
  level="M"
/>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Scan to open: {rebuyUrl}
                </p>

                {/* Recent Rebuys */}
                <div className="text-left">
                  <h4 className="font-semibold mb-2">Recent Rebuys:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {recentRebuys.length > 0 ? (
                      recentRebuys.map((rebuy, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{rebuy.player_name}</span> - 
                          ${rebuy.amount} ({rebuy.method})
                          <div className="text-xs text-gray-500">
                            {new Date(rebuy.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No recent rebuys</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={closeQRModal}
                  className="mt-6 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
        )}

        {/* Buy-In Modal */}
        {showBuyInModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-2xl font-semibold mb-4">
                Buy-In for {selectedPlayer?.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    value={buyInAmount}
                    onChange={(e) => setBuyInAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2 mt-2">
                    {[100, 300, 500, 1000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBuyInAmount(amount.toString())}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Venmo">Venmo</option>
                    <option value="Apple Pay">Apple Pay</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {buyInAmount && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Buy-in:</strong> ${buyInAmount}
                      {!selectedPlayer?.payments.some(p => p.type === 'buy-in') && (
                        <>
                          <br />
                          <strong>Dealer fee:</strong> $35.00 (first buy-in)
                          <br />
                          <strong>To pot:</strong> ${(parseFloat(buyInAmount) - 35).toFixed(2)}
                        </>
                      )}
                      {selectedPlayer?.payments.some(p => p.type === 'buy-in') && (
                        <>
                          <br />
                          <strong>To pot:</strong> ${buyInAmount} (no dealer fee)
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeBuyInModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processBuyIn}
                  disabled={!buyInAmount || loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Buy-In'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-4">🔒 Admin Access</h3>
                <p className="text-gray-600 mb-6">Enter PIN to access admin panel</p>
                
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyPress={handlePinKeyPress}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-lg text-center"
                  maxLength="4"
                  autoFocus
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowPinModal(false)
                      setPinInput('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyPin}
                    disabled={pinInput.length !== 4}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Access Admin
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-4">
                  Default PIN: 1234 (host can change this)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panel Modal */}
        {showAdminPanel && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-semibold">⚙️ Admin Panel</h3>
        <button
          onClick={() => setShowAdminPanel(false)}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto max-h-[60vh]">
        {/* Pending Payments Section */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold mb-4">
            🟡 Pending Payments ({pendingPayments.length})
          </h4>
          
          {pendingPayments.length === 0 ? (
            <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-2xl">✅</span>
              <p className="text-green-700 font-medium">All payments confirmed!</p>
              <p className="text-green-600 text-sm">No pending payments to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center p-4 border border-yellow-300 rounded-lg bg-yellow-50"
                >
                  <div className="flex-1">
                    <div className="font-medium text-yellow-800">
                      {payment.player_name} • ${payment.amount} {payment.method}
                    </div>
                    <div className="text-sm text-yellow-700">
                      {payment.type === 'buy-in' ? '🎯 Buy-in' : '🔄 Rebuy'} • 
                      {new Date(payment.timestamp).toLocaleString()}
                      {payment.dealer_fee_applied && ' • $35 dealer fee applied'}
                    </div>
                    <div className="text-xs text-yellow-600 font-medium mt-1">
                      ⏳ PENDING - Waiting for host confirmation
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-yellow-700">
                      ${payment.amount}
                    </span>
                    <button
                      onClick={() => confirmPayment(
                        payment.player_id,
                        payment.id,
                        payment.player_name,
                        payment.amount
                      )}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      ✅ Confirm Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions Section */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Recent Transactions</h4>
          
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3 mb-8">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {transaction.player_name}
                      {transaction.status === 'confirmed' && <span className="text-green-600">✅</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.type === 'buy-in' ? '🎯' : '🔄'} 
                      {transaction.type} • ${transaction.amount} • {transaction.method}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.timestamp).toLocaleString()}
                      {transaction.dealer_fee_applied && ' • $35 dealer fee applied'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-600">
                      ${transaction.amount}
                    </span>
                    <button
                      onClick={() => deleteTransaction(
                        transaction.player_id, 
                        transaction.id, 
                        transaction.player_name, 
                        transaction.amount
                      )}
                      disabled={loading}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player Management Section */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">🚨 Player Management</h4>
          
          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No players in game</p>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center p-4 border border-red-200 rounded-lg bg-red-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-gray-600">
                      ${player.total.toFixed(2)} in pot • {player.payments.length} transactions
                    </div>
                    <div className="text-xs text-gray-500">
                      Added {new Date(player.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-600">
                      ${player.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deletePlayer(
                        player.id,
                        player.name, 
                        player.total.toFixed(2),
                        player.payments.length
                      )}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      🗑️ Delete Player
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {pendingPayments.length} pending • {recentTransactions.length} transactions • {players.length} players
          </div>
          <button
            onClick={() => {
              loadPendingPayments()
              loadRecentTransactions()
              loadPlayers()
              loadGameStats()
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  )
}

// Main App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PokerTracker />} />
        <Route path="/rebuy" element={<RebuyForm />} />
      </Routes>
    </Router>
  )
}

export default App
import { useState, useEffect } from 'react'
import { playerService } from './services/api'
import { QRCodeSVG } from 'qrcode.react'

function App() {
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

  // Load players and game stats when component starts
  useEffect(() => {
    loadPlayers()
    loadGameStats()
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
            <button
              onClick={openQRModal}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
            >
              📱 Show QR Rebuy
            </button>
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
                <h3 className="text-2xl font-semibold mb-4">📱 Player Rebuy QR Code</h3>
                <p className="text-gray-600 mb-6">Players scan this code to rebuy themselves</p>
                
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
      </div>
    </div>
  )
}

export default App
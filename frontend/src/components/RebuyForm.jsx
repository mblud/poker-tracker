import { useState, useEffect } from 'react'
import { playerService } from '../services/api'

function RebuyForm() {
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

// Load players when component starts + keep data fresh
useEffect(() => {
    loadPlayers()
    
    // Poll for fresh player data every 10 seconds
    const interval = setInterval(() => {
      loadPlayers()
    }, 10000) // Every 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadPlayers = async () => {
    try {
      const response = await playerService.getAll()
      setPlayers(response.data)
    } catch (err) {
      setError('Failed to load players')
      console.error('Error loading players:', err)
    }
  }

  const submitRebuy = async () => {
    if (!selectedPlayer || !amount) {
      setError('Please enter your name and an amount')
      return
    }
  
    try {
      setLoading(true)
      setError('')
      
      // Handle new player creation
      const playerName = selectedPlayer.startsWith('NEW:') 
        ? selectedPlayer.substring(4).trim()
        : selectedPlayer
  
      if (!playerName) {
        setError('Please enter a valid name')
        return
      }
      
      await playerService.processRebuy({
        player_name: playerName,
        amount: parseFloat(amount),
        method: paymentMethod
      })
  
      // IMPORTANT: Reload player data to get fresh transaction history
      await loadPlayers()
  
      setSuccess(true)
      setSelectedPlayer('')
      setAmount('')
      setError('')
    } catch (err) {
      setError('Failed to process transaction. Please try again.')
      console.error('Error processing rebuy:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(false)
    setSelectedPlayer('')
    setAmount('')
    setError('')
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Rebuy Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your ${amount} rebuy has been processed and added to the pot.
          </p>
          <button
            onClick={resetForm}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            Process Another Rebuy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">🃏 Rebuy</h1>
          <p className="text-green-100 text-lg">Quick and easy poker rebuy</p>
        </div>

        <div className="bg-white rounded-lg p-6">
          {error && (
            <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
         {/* Player Selection OR Creation */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Your Name
  </label>
  
  {/* Option 1: Select existing player */}
  <select
    value={selectedPlayer}
    onChange={(e) => setSelectedPlayer(e.target.value)}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg mb-3"
    disabled={loading}
  >
    <option value="">Select your name if already playing...</option>
    {players.map((player) => (
      <option key={player.id} value={player.name}>
        {player.name} (${player.total.toFixed(2)} in pot)
      </option>
    ))}
  </select>

  <div className="text-center text-gray-500 text-sm mb-3">
    -- OR --
  </div>

  {/* Option 2: Create new player */}
  <input
    type="text"
    value={selectedPlayer.startsWith('NEW:') ? selectedPlayer.substring(4) : ''}
    onChange={(e) => setSelectedPlayer('NEW:' + e.target.value)}
    placeholder="Enter your name (new player)"
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
    disabled={loading}
  />
  
  {selectedPlayer.startsWith('NEW:') && selectedPlayer.length > 4 && (
    <p className="text-sm text-green-600 mt-2">
      ✨ New player: "{selectedPlayer.substring(4)}" will be added to the game
    </p>
  )}
</div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rebuy Amount ($)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                disabled={loading}
              />
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[100, 300, 500, 1000].map(quickAmount => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    disabled={loading}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                disabled={loading}
              >
                <option value="Cash">Cash</option>
                <option value="Venmo">Venmo</option>
                <option value="Apple Pay">Apple Pay</option>
                <option value="Zelle">Zelle</option>
                <option value="Other">Other</option>
              </select>
            </div>

          {/* Smart Buy-in/Rebuy Info */}
{amount && selectedPlayer && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    {(() => {
      const playerName = selectedPlayer.startsWith('NEW:') 
        ? selectedPlayer.substring(4).trim()
        : selectedPlayer
        
      if (!playerName) return null
      
      const existingPlayer = players.find(p => p.name === selectedPlayer)
      const isNewPlayer = selectedPlayer.startsWith('NEW:') || !existingPlayer
      const isFirstBuyin = isNewPlayer || !existingPlayer || existingPlayer.payments.length === 0
      const dealerFee = isFirstBuyin ? 35 : 0
      const toPot = parseFloat(amount) - dealerFee
      
      return (
        <div className="text-sm text-blue-800">
          {isNewPlayer && (
            <p className="mb-2">
              <strong>🎉 Welcome {playerName}!</strong>
              <br />
              You'll be added to the game.
            </p>
          )}
          <p>
            <strong>
              {isFirstBuyin ? 'First Buy-in' : 'Rebuy'}: 
            </strong> ${amount}
            <br />
            {isFirstBuyin && (
              <>
                <strong>Dealer fee:</strong> $35.00 (first buy-in)
                <br />
              </>
            )}
            {!isFirstBuyin && (
              <>
                <strong>No dealer fee</strong> (rebuy)
                <br />
              </>
            )}
            <strong>To pot:</strong> ${toPot.toFixed(2)}
          </p>
        </div>
      )
    })()}
  </div>
)}

            {/* Submit Button */}
            <button
              onClick={submitRebuy}
              disabled={!selectedPlayer || !amount || loading}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Rebuy'}
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-green-100 text-sm">
            Return to your poker game after submitting
          </p>
        </div>
      </div>
    </div>
  )
}

export default RebuyForm
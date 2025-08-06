import { useState, useEffect } from 'react'
import { playerService } from '../services/api'

function RebuyForm() {
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Apple Pay')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Load players when component starts + keep data fresh
  useEffect(() => {
    loadPlayers()
    
    // Poll for fresh player data every 10 seconds
    const interval = setInterval(() => {
      loadPlayers()
    }, 10000)
    
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative flex items-center justify-center min-h-screen p-4">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md text-center border border-white/20 shadow-2xl">
            <div className="text-8xl mb-6 animate-bounce">✅</div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-4">
              Chips Requested!
            </h2>
            <p className="text-emerald-100 mb-6 text-lg">
              Your ${amount} {paymentMethod === 'Apple Pay' ? 'Apple Pay' : paymentMethod.toLowerCase()} payment has been submitted.
            </p>
            
            {/* Payment Reminder Section */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-2xl p-6 mb-6">
              <div className="text-2xl mb-3">📱💰</div>
              <h3 className="text-xl font-bold text-white mb-2">Don't Forget to Pay!</h3>
              <p className="text-blue-100 text-sm mb-4">
                Text <strong>Max</strong> to complete your ${amount} {paymentMethod} payment
              </p>
              
              <a
                href={`sms:3109138703?body=Hey Max! I just submitted a ${amount} ${paymentMethod} payment for the poker game. Let me know when you want me to send it!`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 mb-3 w-full justify-center"
              >
                <span className="text-lg">💬</span>
                Send Payment To Max
              </a>
              
              <div className="bg-white/10 rounded-xl p-3 mb-3">
                <p className="text-white text-sm font-medium">Max's Number:</p>
                <p className="text-green-300 font-bold text-lg">(310) 913-8703</p>
              </div>
              
              <p className="text-xs text-blue-200 italic">
                Payment: ${amount} via {paymentMethod}
              </p>
            </div>
            
            <button
              onClick={resetForm}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-green-400/30"
            >
              Submit Another Payment
            </button>
            
            <p className="text-emerald-200 text-sm mt-4">
              Return to the poker game once you've completed payment
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative max-w-md mx-auto">
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="text-5xl animate-pulse">🃏</div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                Buy Chips
              </h1>
              <p className="text-emerald-100 text-lg font-light">Get off the sidelines, fucker.</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 mx-4 border border-white/20 shadow-2xl">
          {error && (
            <div className="bg-red-500/20 border border-red-400/40 text-red-100 p-4 rounded-2xl mb-6 text-center">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Player Selection OR Creation */}
            <div>
              <label className="block text-emerald-100 font-medium mb-3">
                Your Name
              </label>
              
              {/* Option 1: Select existing player */}
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg mb-3 disabled:opacity-50"
                disabled={loading}
              >
                <option value="" className="bg-gray-800">Select your name if already playing...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.name} className="bg-gray-800">
                    {player.name} (${player.total.toFixed(2)} in pot)
                  </option>
                ))}
              </select>

              <div className="text-center text-emerald-300 text-sm mb-3 font-medium">
                -- OR --
              </div>

              {/* Option 2: Create new player */}
             
<input
  type="text"
  inputMode="text" // 📱 MOBILE FIX: Ensures full keyboard
  value={selectedPlayer.startsWith('NEW:') ? selectedPlayer.substring(4) : ''}
  onChange={(e) => setSelectedPlayer('NEW:' + e.target.value)}
  placeholder="Enter your name (new player)"
  className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg placeholder-gray-400 disabled:opacity-50"
  disabled={loading}
  autoComplete="given-name" // 📱 MOBILE FIX: Better autocomplete
  autoCorrect="off"
  spellCheck="false"
  autoCapitalize="words" // 📱 MOBILE FIX: Capitalizes names properly
/>
              
              {selectedPlayer.startsWith('NEW:') && selectedPlayer.length > 4 && (
                <p className="text-sm text-green-400 mt-3 p-3 bg-green-500/20 rounded-xl border border-green-400/30">
                  ✨ New player: "{selectedPlayer.substring(4)}" will be added to the game
                </p>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-emerald-100 font-medium mb-3">
                 Amount ($)
              </label>
              
<input
  type="tel" // 📱 MOBILE FIX: Better than "number" on mobile
  inputMode="decimal" // 📱 MOBILE FIX: Shows decimal keyboard
  pattern="[0-9]*" // 📱 MOBILE FIX: Safari numeric keyboard
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  placeholder="Enter amount"
  className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg placeholder-gray-400 disabled:opacity-50"
  disabled={loading}
  autoComplete="off"
  autoCorrect="off"
  spellCheck="false"
/>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[100, 300, 500, 1000].map(quickAmount => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className="px-3 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-emerald-100 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    disabled={loading}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-emerald-100 font-medium mb-3">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg disabled:opacity-50"
                disabled={loading}
              >
                <option value="Apple Pay" className="bg-gray-800">Apple Pay</option>
                <option value="Cash" className="bg-gray-800">Cash</option>
                <option value="Venmo" className="bg-gray-800">Venmo</option>
                <option value="Zelle" className="bg-gray-800">Zelle</option>
                <option value="Other" className="bg-gray-800">Other</option>
              </select>
            </div>

            {/* Smart Buy-in/Rebuy Info */}
            {amount && selectedPlayer && (
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-2xl p-4">
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
                    <div className="text-sm text-blue-100">
                      {isNewPlayer && (
                        <p className="mb-3 text-center">
                          <strong className="text-lg">🎉 Welcome {playerName}!</strong>
                          <br />
                          <span className="text-blue-200">You'll be added to the game.</span>
                        </p>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <strong>{isFirstBuyin ? 'First Buy-in' : 'Rebuy'}:</strong>
                          <span className="text-white font-bold">${amount}</span>
                        </div>
                        {isFirstBuyin && (
                          <div className="flex justify-between">
                            <strong>Dealer fee:</strong>
                            <span className="text-red-300">-$35.00</span>
                          </div>
                        )}
                        {!isFirstBuyin && (
                          <div className="flex justify-between text-green-300">
                            <strong>No dealer fee</strong>
                            <span>✓ Rebuy</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-blue-400/30 pt-2 mt-2">
                          <strong>To pot:</strong>
                          <span className="text-green-300 font-bold">${toPot.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={submitRebuy}
              disabled={!selectedPlayer || !amount || loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-green-400/30 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Processing...' : 'Confirm Rebuy'}
            </button>
          </div>
        </div>

        <div className="text-center mt-6 px-4">
          <p className="text-emerald-200 text-sm">
            Return to your poker game after submitting
          </p>
        </div>
      </div>
    </div>
  )
}

export default RebuyForm
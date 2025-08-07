import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { playerService } from './services/api'
import { QRCodeSVG } from 'qrcode.react'
import RebuyForm from './components/RebuyForm'

function PokerTracker() {
  // Existing state
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [error, setError] = useState('')
  const [gameStats, setGameStats] = useState({ 
    total_pot: 0, 
    total_dealer_fees: 0, 
    total_buy_ins: 0,
    total_cash_outs: 0,
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

  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [adminPin] = useState('6969')
  const [pendingPayments, setPendingPayments] = useState([])
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)

  // Cash out state
  const [pendingCashOuts, setPendingCashOuts] = useState([])
  const [showCashOutModal, setShowCashOutModal] = useState(false)
  const [cashOutPlayer, setCashOutPlayer] = useState(null)
  const [cashOutAmount, setCashOutAmount] = useState('')
  
  // Recent cash outs for display
  const [recentCashOuts, setRecentCashOuts] = useState([])
  
  // 🔥 NEW: Track original buy-ins for cash out display
  const [playerBuyInHistory, setPlayerBuyInHistory] = useState({})

  // Generate QR code URL
  const rebuyUrl = `${window.location.origin}/rebuy`

  // Load players and game stats when component starts + polling
  useEffect(() => {
    loadPlayers()
    loadGameStats()
    loadPendingPayments()
    loadPendingCashOuts()
    loadRecentCashOuts()
    
    // Set up polling every 5 seconds to auto-update the page
    const interval = setInterval(() => {
      loadPlayers()
      loadGameStats()
      checkForNewPayments()
      loadPendingPayments()
      loadPendingCashOuts()
      loadRecentCashOuts()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Install prompt detection - SEPARATE useEffect
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  // Polling for recent rebuys when QR modal is open
  useEffect(() => {
    let interval
    if (showQRModal) {
      interval = setInterval(() => {
        loadRecentRebuys()
        loadPlayers()
        loadGameStats()
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
      
      // 🔥 NEW: Store buy-in history for each player
      const buyInMap = {}
      response.data.forEach(player => {
        if (player.payments && player.payments.length > 0) {
          const firstBuyIn = player.payments.find(p => p.type === 'buy-in')
          if (firstBuyIn) {
            buyInMap[player.name] = {
              originalAmount: firstBuyIn.amount,
              method: firstBuyIn.method,
              totalInvested: player.payments.reduce((sum, p) => sum + p.amount, 0)
            }
          }
        }
      })
      setPlayerBuyInHistory(buyInMap)
      
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

  const loadPendingCashOuts = async () => {
    try {
      const response = await playerService.getPendingCashOuts()
      setPendingCashOuts(response.data)
    } catch (err) {
      console.error('Error loading pending cash outs:', err)
    }
  }

  const loadRecentCashOuts = async () => {
    try {
      const response = await playerService.getRecentCashOuts()
      setRecentCashOuts(response.data)
    } catch (err) {
      console.error('Error loading recent cash outs:', err)
    }
  }

  const checkForNewPayments = async () => {
    try {
      const response = await playerService.getRecentTransactions()
      const currentPaymentCount = response.data.length
      
      if (lastPaymentCount === 0) {
        setLastPaymentCount(currentPaymentCount)
        return
      }
      
      if (currentPaymentCount > lastPaymentCount) {
        const newPaymentCount = currentPaymentCount - lastPaymentCount
        const newPayments = response.data.slice(0, newPaymentCount)
        
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
    setShowAdminPanel(false)
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

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallPrompt(false)
      }
      setInstallPrompt(null)
    }
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

  // Cash out functions
  const openCashOutModal = (player) => {
    setCashOutPlayer(player)
    setCashOutAmount('')
    setShowCashOutModal(true)
    setShowAdminPanel(false)
  }

  const closeCashOutModal = () => {
    setShowCashOutModal(false)
    setCashOutPlayer(null)
    setCashOutAmount('')
  }

  // 🔥 FIXED: Enhanced cash out processing with better validation
  const processCashOut = async () => {
    console.log('🔍 DEBUG: Starting cash out process');
    console.log('💰 Cash out amount:', cashOutAmount);
    console.log('👤 Cash out player:', cashOutPlayer);
    console.log('🎯 Game stats:', gameStats);
    
    if (!cashOutAmount || !cashOutPlayer) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(cashOutAmount);
    
    if (amount <= 0 || isNaN(amount)) {
      setError('Cash out amount must be a positive number');
      return;
    }
    
    // 🚀 POKER LOGIC: Players can cash out up to total pot (they can win!)
    const totalPot = gameStats.total_pot || 0;
    console.log('🎯 Total pot available:', totalPot);
    
    // Only prevent if amount exceeds TOTAL POT, not player's individual total
    if (amount > totalPot) {
      const errorMsg = `Cannot cash out $${amount.toFixed(2)}. Total pot only has $${totalPot.toFixed(2)}.`;
      console.log('❌ Amount exceeds total pot:', errorMsg);
      setError(errorMsg);
      return;
    }
    
    // Show confirmation if they're winning money
    if (amount > cashOutPlayer.total) {
      const extraAmount = amount - cashOutPlayer.total;
      const confirmMsg = `🎉 ${cashOutPlayer.name} is cashing out $${extraAmount.toFixed(2)} MORE than they put in!\n\nThis means they WON money from other players.\n\nContinue with $${amount.toFixed(2)} cash out?`;
      console.log('🎉 Player winning money:', confirmMsg);
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('🚀 Sending cash out request to API...');
      
      const response = await playerService.createCashOut(cashOutPlayer.id, {
        amount: amount,
        reason: "Player cashed out"
      });
      
      console.log('✅ Cash out API response:', response.data);
      
      // Refresh all data
      await Promise.all([
        loadPlayers(),
        loadGameStats(), 
        loadPendingCashOuts(),
        loadRecentCashOuts()
      ]);
      
      closeCashOutModal();
      
    } catch (err) {
      console.error('❌ CASH OUT ERROR:', err);
      let errorMsg = 'Failed to process cash out';
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NEW: State for cashout payment method selection
  const [showCashOutPaymentModal, setShowCashOutPaymentModal] = useState(false)
  const [selectedCashOut, setSelectedCashOut] = useState(null)
  const [cashOutPaymentMethods, setCashOutPaymentMethods] = useState({})
  
  // 🔥 ENHANCED: Cash out confirmation with payment method selection
  const confirmCashOut = async (cashOutId, playerName, amount) => {
    // Store the cashout details and open payment method modal
    setSelectedCashOut({ id: cashOutId, playerName, amount })
    setCashOutPaymentMethods({ Cash: amount }) // Default to all cash
    setShowCashOutPaymentModal(true)
    setShowAdminPanel(false) // Close admin panel
  }
  
  // 🔥 NEW: Process cashout with payment methods
  const processCashOutWithPayments = async () => {
    if (!selectedCashOut) return
    
    // Validate total matches
    const total = Object.values(cashOutPaymentMethods).reduce((sum, val) => sum + parseFloat(val || 0), 0)
    if (Math.abs(total - selectedCashOut.amount) > 0.01) {
      setError(`Payment methods total ${total.toFixed(2)} doesn't match cashout amount ${selectedCashOut.amount}`)
      return
    }
    
    try {
      setLoading(true)
      await playerService.confirmCashOutWithPayments(selectedCashOut.id, cashOutPaymentMethods)
      
      await loadPlayers()
      await loadGameStats()
      await loadPendingCashOuts()
      await loadRecentTransactions()
      await loadRecentCashOuts()
      
      setShowCashOutPaymentModal(false)
      setSelectedCashOut(null)
      setCashOutPaymentMethods({})
      setError('')
    } catch (err) {
      setError('Failed to confirm cash out')
      console.error('Error confirming cash out:', err)
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
    if (adminAuthenticated) {
      setShowAdminPanel(true)
      loadRecentTransactions()
      loadPendingPayments()
      loadPendingCashOuts()
    } else {
      setShowPinModal(true)
      setPinInput('')
    }
  }
  
  const verifyPin = () => {
    if (pinInput === adminPin) {
      setShowPinModal(false)
      setAdminAuthenticated(true)
      setShowAdminPanel(true)
      loadRecentTransactions()
      loadPendingPayments()
      loadPendingCashOuts()
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

  const loadPendingPayments = async () => {
    try {
      const response = await playerService.getPendingPayments()
      setPendingPayments(response.data)
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
      
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEASD0AAEg9AAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBy6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcFJHfH8N2QQAoUXrTp66hVFApGn+DyvmENBS6T3O/QdCcF')
        audio.volume = 0.3
        audio.play()
      } catch (e) {
        console.log('Audio not supported')
      }
    }
  }

  // Calculate payment method percentages for visual representation
  const totalPayments = Object.values(gameStats.payment_method_breakdown || {})
    .reduce((sum, method) => sum + method.total, 0)

  const paymentMethodsWithPercentage = Object.entries(gameStats.payment_method_breakdown || {})
    .map(([method, data]) => ({
      method,
      ...data,
      percentage: totalPayments > 0 ? (data.total / totalPayments) * 100 : 0
    }))

  // 🔥 FIXED: Only show active players (with money in pot)
  const activePlayers = players.filter(player => player.total > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-6">
        {/* Header with enhanced styling */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="text-6xl animate-pulse">🃏</div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                Degen Poker
              </h1>
              <p className="text-emerald-100 text-lg md:text-xl font-light">Live Game Dashboard</p>
            </div>
          </div>
        </header>
        
        {/* Install Banner */}
        {showInstallPrompt && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 border border-blue-400/30 shadow-lg">
            <div className="text-center">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-white font-bold mb-2">Install Poker Tracker</p>
              <p className="text-blue-100 text-sm mb-4">Add to your home screen for quick access!</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                >
                  Install App
                </button>
                <button 
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-blue-100 hover:text-white px-4 py-2 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Total Pot Section */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 shadow-2xl border border-green-400/20 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative text-center">
              <p className="text-green-100 text-lg md:text-xl font-medium mb-2">💰 Total Pot</p>
              <p className="text-6xl md:text-7xl font-black text-white mb-2 tracking-tight">
                ${gameStats.total_pot?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
              </p>
              <p className="text-green-100/80 text-sm">
                {activePlayers.length} active players • ${gameStats.total_dealer_fees?.toFixed(0) || '0'} in fees
              </p>
            </div>
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-emerald-100 text-sm font-medium mb-1">💸 Cash Outs</p>
            <p className="text-xl font-bold text-red-300">-${gameStats.total_cash_outs?.toFixed(0) || '0'}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-emerald-100 text-sm font-medium mb-1">🎯 Dealer Fees</p>
            <p className="text-xl font-bold text-purple-300">${gameStats.total_dealer_fees?.toFixed(0) || '0'}</p>
          </div>
        </div>

        {/* 🔥 UPDATED: Pot Breakdown (shows money IN and OUT by method) */}
        {paymentMethodsWithPercentage.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center">💰 Pot Breakdown by Payment Method</h3>
            <div className="space-y-3">
              {paymentMethodsWithPercentage.map(({ method, total, count, percentage }) => (
                <div key={method} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100 font-medium text-sm">{method}</span>
                    <span className="text-white font-bold">${total?.toFixed(0) || '0'}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        method === 'Apple Pay' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                        method === 'Cash' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        method === 'Venmo' ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
                        'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-emerald-200">
                    {count} payments • {percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => {
              requestNotificationPermission()
              alert('Host Mode: Notifications enabled!')
            }}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-purple-400/30"
          >
            🔔 Host Mode
          </button>
          <button
            onClick={openQRModal}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-orange-400/30"
          >
            📱 Add Money
          </button>
          <button
            onClick={openAdminPanel}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-red-400/30 relative"
          >
            ⚙️ Host Tools
            {adminAuthenticated && <span className="text-xs ml-1">✓</span>}
            {(pendingPayments.length + pendingCashOuts.length) > 0 && (
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold animate-bounce">
                {pendingPayments.length + pendingCashOuts.length}
              </span>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/40 text-red-100 p-4 rounded-2xl mb-6 text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* 🔥 FIXED: ACTIVE PLAYERS with "committed" instead of "in pot" */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🏆 Active Players</h2>
            <p className="text-emerald-200">({activePlayers.length} players with chips)</p>
          </div>

          <div className="space-y-3">
            {loading && players.length === 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-emerald-200 mt-2">Loading game...</p>
              </div>
            )}

            {activePlayers
              .sort((a, b) => b.total - a.total)
              .map((player, index) => (
              <div
                key={player.id}
                className={`rounded-2xl p-4 transition-all duration-300 border ${
                  index === 0 && activePlayers.length > 1 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-400/40 shadow-lg' 
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`text-xl font-bold w-6 text-center ${
                      index === 0 && activePlayers.length > 1 ? 'text-yellow-400' : 'text-emerald-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{player.name}</span>
                        {index === 0 && activePlayers.length > 1 && <span className="text-yellow-400">👑</span>}
                      </div>
                      <div className="text-sm text-emerald-200">
                        {player.payments?.length > 0 ? (
                          <>
                            <div>💳 {formatPaymentSummary(player)}</div>
                            <div>📊 {player.payments.length} transactions</div>
                          </>
                        ) : (
                          <div className="text-emerald-300">No money added yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${
                      player.total > 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      ${player.total?.toFixed(0) || '0'}
                    </div>
                    {/* 🔥 FIXED: Changed from "in pot" to "committed" */}
                    <div className="text-xs text-emerald-200">committed</div>
                  </div>
                </div>
                
                {/* Cash out button for active players */}
                {player.total > 0 && (
                  <button
                    onClick={() => openCashOutModal(player)}
                    className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-lg transition-all duration-200 text-xs font-medium border border-red-400/30"
                  >
                    💰 Cash Out
                  </button>
                )}
              </div>
            ))}

            {!loading && activePlayers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 animate-bounce">🎲</div>
                <p className="text-white text-xl font-semibold">Game Starting Soon</p>
                <p className="text-emerald-300">Players will appear as they join via QR code</p>
              </div>
            )}
          </div>
        </div>

        {/* 🔥 ENHANCED: Recent Cash Outs with Buy-in Info */}
        {recentCashOuts.length > 0 && (
          <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-6 border border-red-400/30 mb-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-red-300 mb-2">💸 Recent Cash Outs</h2>
              <p className="text-red-200 text-sm">Players who have left the game</p>
            </div>

            <div className="space-y-2">
              {recentCashOuts.slice(0, 5).map((cashOut, index) => {
                const buyInInfo = playerBuyInHistory[cashOut.player_name];
                const profit = buyInInfo ? cashOut.amount - buyInInfo.totalInvested : 0;
                
                return (
                  <div
                    key={cashOut.id}
                    className="flex justify-between items-center p-3 bg-red-500/10 rounded-xl border border-red-400/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold text-sm">#{index + 1}</span>
                      <div>
                        <div className="text-white font-medium">{cashOut.player_name}</div>
                        <div className="text-red-300 text-xs">
                          {new Date(cashOut.timestamp).toLocaleString()}
                        </div>
                        {/* 🔥 NEW: Show original buy-in info */}
                        {buyInInfo && (
                          <div className="text-xs text-red-200 mt-1">
                            Originally bought in: ${buyInInfo.originalAmount} ({buyInInfo.method})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-300 font-bold">-${cashOut.amount?.toFixed(0)}</div>
                      <div className="text-red-400 text-xs">cashed out</div>
                      {/* 🔥 NEW: Show profit/loss */}
                      {buyInInfo && (
                        <div className={`text-xs font-bold mt-1 ${
                          profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {profit > 0 ? `+$${profit.toFixed(0)} 🎉` : 
                           profit < 0 ? `-$${Math.abs(profit).toFixed(0)} 😢` : 
                           'Break even'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🔥 REMOVED: "Players Out of Game" section as requested */}

        {/* All modals remain the same... */}
        
        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-4 text-white">📱 Player Buy-in & Rebuy</h3>
                <p className="text-emerald-200 mb-6">Players scan this for buy-ins or rebuys</p>
                
                {/* QR Code Display */}
                <div className="bg-white p-4 rounded-xl inline-block mb-4">
                  <QRCodeSVG 
                    value={rebuyUrl} 
                    size={200}
                    level="M"
                  />
                </div>
              </div>

              <p className="text-sm text-emerald-300 mb-4 text-center">
                Scan to open: {rebuyUrl}
              </p>

              {/* Recent Rebuys */}
              <div className="text-left">
                <h4 className="font-semibold mb-2 text-white">Recent Rebuys:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentRebuys.length > 0 ? (
                    recentRebuys.map((rebuy, index) => (
                      <div key={index} className="text-sm p-2 bg-white/10 rounded text-emerald-100">
                        <span className="font-medium">{rebuy.player_name}</span> - 
                        ${rebuy.amount} ({rebuy.method})
                        <div className="text-xs text-emerald-300">
                          {new Date(rebuy.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-emerald-300">No recent rebuys</p>
                  )}
                </div>
              </div>

              <button
                onClick={closeQRModal}
                className="mt-6 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* 🔥 ENHANCED: Cash Out Modal with Better Validation */}
        {showCashOutModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">
                Cash Out - {cashOutPlayer?.name}
              </h3>
              
              <div className="mb-4 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <p className="text-blue-200">
                  Player has: <span className="font-bold text-white">${cashOutPlayer?.total?.toFixed(2) || '0.00'}</span> committed
                  <br />
                  Total pot available: <span className="font-bold text-green-300">${gameStats.total_pot?.toFixed(2) || '0.00'}</span>
                  <br />
                  <span className="text-xs text-blue-300">🎉 Players can cash out winnings up to total pot amount</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-emerald-100 font-medium mb-2">
                    Cash Out Amount ($)
                  </label>
                 
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={gameStats.total_pot || 0}
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                  
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => setCashOutAmount((cashOutPlayer?.total || 0).toFixed(2))}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-lg text-sm transition-colors"
                    >
                      My Chips (${(cashOutPlayer?.total || 0).toFixed(2)})
                    </button>
                    <button
                      onClick={() => setCashOutAmount((gameStats.total_pot || 0).toFixed(2))}
                      className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-sm transition-colors border border-green-400/30"
                    >
                      🏆 MAX WIN (${(gameStats.total_pot || 0).toFixed(2)})
                    </button>
                  </div>
                  
                  {/* Show warning if cashing out more than they put in */}
                  {cashOutAmount && parseFloat(cashOutAmount) > (cashOutPlayer?.total || 0) && (
                    <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-xl">
                      <p className="text-yellow-200 text-sm">
                        🎉 <strong>WINNER!</strong> Cashing out ${(parseFloat(cashOutAmount) - (cashOutPlayer?.total || 0)).toFixed(2)} more than invested!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeCashOutModal}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processCashOut}
                  disabled={!cashOutAmount || loading}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {loading ? 'Processing...' : 'Cash Out'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 NEW: Cash Out Payment Method Modal */}
        {showCashOutPaymentModal && selectedCashOut && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">
                💰 How are you paying out?
              </h3>
              
              <div className="mb-4 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <p className="text-blue-200">
                  <strong>{selectedCashOut.playerName}</strong> is cashing out
                  <br />
                  <span className="text-2xl font-bold text-white">${selectedCashOut.amount}</span>
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-emerald-100 text-sm">Split payment across methods if needed:</p>
                
                {['Cash', 'Venmo', 'Apple Pay', 'Zelle'].map(method => (
                  <div key={method} className="flex items-center gap-3">
                    <label className="text-white font-medium w-24">{method}:</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashOutPaymentMethods[method] || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setCashOutPaymentMethods(prev => {
                          if (value === '' || value === '0') {
                            const newMethods = {...prev}
                            delete newMethods[method]
                            return newMethods
                          }
                          return {...prev, [method]: parseFloat(value)}
                        })
                      }}
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                ))}
                
                <div className="pt-3 mt-3 border-t border-white/20">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100 font-medium">Total:</span>
                    <span className={`text-xl font-bold ${
                      Math.abs(Object.values(cashOutPaymentMethods).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - selectedCashOut.amount) < 0.01
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${Object.values(cashOutPaymentMethods).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  {Math.abs(Object.values(cashOutPaymentMethods).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - selectedCashOut.amount) > 0.01 && (
                    <p className="text-red-400 text-sm mt-2">
                      Total must equal ${selectedCashOut.amount}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCashOutPaymentModal(false)
                    setSelectedCashOut(null)
                    setCashOutPaymentMethods({})
                    setShowAdminPanel(true) // Reopen admin panel
                  }}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processCashOutWithPayments}
                  disabled={
                    loading || 
                    Math.abs(Object.values(cashOutPaymentMethods).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - selectedCashOut.amount) > 0.01
                  }
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {loading ? 'Processing...' : 'Confirm Cash Out'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-sm border border-white/20 shadow-2xl">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">🔒 Admin Access</h3>
                <p className="text-emerald-200 mb-6">Enter PIN to access admin panel</p>
                
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyPress={handlePinKeyPress}
                  placeholder="••••"
                  className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 tracking-widest"
                  maxLength="4"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowPinModal(false)
                      setPinInput('')
                    }}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyPin}
                    disabled={pinInput.length !== 4}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                  >
                    Access Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buy-In Modal */}
        {showBuyInModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">
                Buy-In for {selectedPlayer?.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-emerald-100 font-medium mb-2">
                    Amount ($)
                  </label>
                  <input
                    type="tel"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={buyInAmount}
                    onChange={(e) => setBuyInAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <div className="flex gap-2 mt-3">
                    {[100, 300, 500, 1000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBuyInAmount(amount.toString())}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-lg text-sm transition-colors"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-emerald-100 font-medium mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Venmo">Venmo</option>
                    <option value="Apple Pay">Apple Pay</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {buyInAmount && (
                  <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4">
                    <p className="text-yellow-200 text-sm">
                      <strong>Buy-in:</strong> ${buyInAmount}
                      {!selectedPlayer?.payments?.some(p => p.type === 'buy-in') && (
                        <>
                          <br />
                          <strong>Dealer fee:</strong> $35.00 (first buy-in)
                          <br />
                          <strong>To pot:</strong> ${(parseFloat(buyInAmount) - 35).toFixed(2)}
                        </>
                      )}
                      {selectedPlayer?.payments?.some(p => p.type === 'buy-in') && (
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
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processBuyIn}
                  disabled={!buyInAmount || loading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {loading ? 'Processing...' : 'Confirm Buy-In'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panel Modal */}
        {showAdminPanel && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-5xl max-h-[85vh] overflow-hidden border border-white/20 shadow-2xl">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/20">
                <h3 className="text-2xl font-bold text-white">⚙️ Host Control Panel</h3>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="text-gray-400 hover:text-white text-2xl font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto max-h-[70vh]">
                
                {/* 1. PENDING PAYMENTS - TOP PRIORITY */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⏳</span>
                    <h4 className="text-xl font-bold text-white">Pending Payments</h4>
                    <span className="bg-yellow-500/20 text-yellow-200 px-3 py-1 rounded-full text-sm font-medium border border-yellow-400/30">
                      {pendingPayments.length} waiting
                    </span>
                  </div>
                  
                  {pendingPayments.length === 0 ? (
                    <div className="text-center py-6 bg-green-500/20 border border-green-400/30 rounded-xl">
                      <span className="text-3xl">✅</span>
                      <p className="text-green-200 font-medium mt-2">All payments confirmed!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between items-center p-4 border-l-4 border-yellow-400 bg-yellow-500/20 rounded-xl"
                        >
                          <div>
                            <div className="font-bold text-lg text-white">{payment.player_name}</div>
                            <div className="text-yellow-200">
                              ${payment.amount} • {payment.method} • {payment.type}
                              {payment.dealer_fee_applied && ' • $35 fee applied'}
                            </div>
                            <div className="text-sm text-yellow-300">
                              {new Date(payment.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => confirmPayment(
                              payment.player_id,
                              payment.id,
                              payment.player_name,
                              payment.amount
                            )}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-bold transition-colors"
                          >
                            ✅ Confirm
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PENDING CASH OUTS */}
                <div className="mb-8 pb-8 border-b border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">💰</span>
                    <h4 className="text-xl font-bold text-white">Pending Cash Outs</h4>
                    <span className="bg-red-500/20 text-red-200 px-3 py-1 rounded-full text-sm font-medium border border-red-400/30">
                      {pendingCashOuts.length} waiting
                    </span>
                  </div>
                  
                  {pendingCashOuts.length === 0 ? (
                    <div className="text-center py-4 bg-green-500/20 border border-green-400/30 rounded-xl">
                      <span className="text-2xl">✅</span>
                      <p className="text-green-200 font-medium mt-2">No pending cash outs</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingCashOuts.map((cashOut) => (
                        <div
                          key={cashOut.id}
                          className="flex justify-between items-center p-4 border-l-4 border-red-400 bg-red-500/20 rounded-xl"
                        >
                          <div>
                            <div className="font-bold text-lg text-white">{cashOut.player_name}</div>
                            <div className="text-red-200">
                              ${cashOut.amount} cash out request
                            </div>
                            <div className="text-sm text-red-300">
                              {new Date(cashOut.timestamp).toLocaleString()}
                            </div>
                            {cashOut.reason && (
                              <div className="text-sm text-red-300 italic">"{cashOut.reason}"</div>
                            )}
                          </div>
                          <button
                            onClick={() => confirmCashOut(cashOut.id, cashOut.player_name, cashOut.amount)}
                            disabled={loading}
                            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-bold transition-colors"
                          >
                            ✅ Confirm
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. ADD NEW PLAYER */}
                <div className="mb-8 pb-8 border-b border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">👤</span>
                    <h4 className="text-xl font-bold text-white">Add New Player</h4>
                    <span className="text-sm text-emerald-300">(players can also join via QR code)</span>
                  </div>
                  
                  <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        inputMode="text"
                        placeholder="Enter player name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 disabled:opacity-50"
                        autoComplete="given-name"
                        autoCorrect="off"
                        spellCheck="false"
                        autoCapitalize="words"
                      />
                      <button
                        onClick={addPlayer}
                        disabled={loading || !playerName.trim()}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-bold transition-colors"
                      >
                        {loading ? 'Adding...' : '+ Add Player'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. MANUAL BUY-IN */}
                <div className="mb-8 pb-8 border-b border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">💰</span>
                    <h4 className="text-xl font-bold text-white">Manual Buy-In</h4>
                    <span className="text-sm text-emerald-300">(for cash payments & corrections)</span>
                  </div>
                  
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className="flex justify-between items-center p-3 bg-white/10 rounded-xl border border-white/20"
                        >
                          <div>
                            <div className="font-medium text-white">{player.name}</div>
                            <div className="text-sm text-emerald-200">${player.total?.toFixed(2) || '0.00'} committed</div>
                          </div>
                          <button
                            onClick={() => openBuyInModal(player)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            + Add Money
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {players.length === 0 && (
                      <div className="text-center py-4 text-emerald-300">
                        No players in game yet
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. RECENT TRANSACTIONS */}
                <div className="mb-8 pb-8 border-b border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📝</span>
                    <h4 className="text-xl font-bold text-white">Recent Transactions</h4>
                    <span className="bg-gray-500/20 text-gray-200 px-3 py-1 rounded-full text-sm border border-gray-400/30">
                      Last {recentTransactions.length}
                    </span>
                  </div>
                  
                  {recentTransactions.length === 0 ? (
                    <div className="text-center py-6 text-emerald-300">
                      No transactions yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentTransactions.slice(0, 10).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-3 bg-white/5 rounded-xl"
                        >
                          <div>
                            <div className="font-medium text-white">
                              {transaction.player_name} • ${transaction.amount} • {transaction.method}
                              {transaction.status === 'confirmed' && <span className="text-green-400 ml-2">✅</span>}
                            </div>
                            <div className="text-sm text-emerald-200">
                              {transaction.type} • {new Date(transaction.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTransaction(
                              transaction.player_id, 
                              transaction.id, 
                              transaction.player_name, 
                              transaction.amount
                            )}
                            disabled={loading}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. PLAYER MANAGEMENT */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🚨</span>
                    <h4 className="text-xl font-bold text-red-400">Danger Zone</h4>
                    <span className="text-sm text-red-400">(permanent actions)</span>
                  </div>
                  
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4">
                    <div className="space-y-3">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className="flex justify-between items-center p-3 bg-white/10 rounded-xl border border-red-400/30"
                        >
                          <div>
                            <div className="font-medium text-white">{player.name}</div>
                            <div className="text-sm text-emerald-200">
                              ${player.total?.toFixed(2) || '0.00'} committed • {player.payments?.length || 0} transactions
                            </div>
                          </div>
                          <button
                            onClick={() => deletePlayer(
                              player.id,
                              player.name, 
                              player.total?.toFixed(2) || '0.00',
                              player.payments?.length || 0
                            )}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            🗑️ Delete Player
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {players.length === 0 && (
                      <div className="text-center py-4 text-emerald-300">
                        No players to manage
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-emerald-200">
                    <span className="font-medium">{pendingPayments.length}</span> pending payments • 
                    <span className="font-medium"> {pendingCashOuts.length}</span> pending cash outs • 
                    <span className="font-medium"> {players.length}</span> players
                  </div>
                  <button
                    onClick={() => {
                      loadPendingPayments()
                      loadPendingCashOuts()
                      loadRecentTransactions()
                      loadPlayers()
                      loadGameStats()
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    🔄 Refresh All
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

// 🔥 MATH FIX APPLIED - Thu Aug 7 2025
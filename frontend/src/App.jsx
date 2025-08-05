import { useState } from 'react'

function App() {
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState('')

  const addPlayer = () => {
    if (playerName.trim()) {
      setPlayers([...players, {
        id: Date.now(), // Simple ID for now
        name: playerName,
        total: 0
      }])
      setPlayerName('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addPlayer()
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <button
              onClick={addPlayer}
              disabled={!playerName.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Player
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Players ({players.length})</h2>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Pot</p>
              <p className="text-2xl font-bold text-green-600">
                ${players.reduce((sum, p) => sum + p.total, 0)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div>
                  <span className="text-lg font-medium">{player.name}</span>
                  <p className="text-sm text-gray-500">Ready to play</p>
                </div>
                <span className="text-xl font-bold text-green-600">
                  ${player.total.toFixed(2)}
                </span>
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎲</div>
                <p className="text-gray-500 text-lg">No players added yet</p>
                <p className="text-gray-400">Add your first player to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
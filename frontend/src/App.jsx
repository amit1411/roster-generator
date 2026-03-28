import { useState, useEffect, useRef } from "react";
import PlayerInput from "./components/PlayerInput";
import ConfigPanel from "./components/ConfigPanel";
import RosterTable from "./components/RosterTable";
import DownloadCSV from "./components/DownloadCSV";
import { generateRoster } from "./api";

const DEFAULT_PLAYERS = [
  "DG", "Hari", "Ashok", "Jitu", "Satya", "Krupa", "Kishore", "Malli",
  "Chiru", "Vivek", "Dhawan", "Avinash", "Vikram", "Marideva", "Sai",
  "Amit", "Varun", "Phani", "Bhaskar", "Sai Krishna", "Adi", "Bharat",
];

const DEFAULT_PAIRS = [
  ["DG", "Hari"],
  ["Ashok", "Jitu"],
  ["Krupa", "Satya"],
  ["Kishore", "Malli"],
  ["Chiru", "Vivek"],
  ["Avinash", "Dhawan"],
  ["Marideva", "Vikram"],
  ["Amit", "Sai"],
];

export default function App() {
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [fixedPairs, setFixedPairs] = useState(DEFAULT_PAIRS);
  const [config, setConfig] = useState({
    num_courts: 5,
    court_numbers: ["1", "2", "3", "4", "5"],
    rounds: 9,
    limits: { Vikram: 2, Vivek: 3 },
    pair_games: 3,
    pair_start_round: 5,
    max_consecutive_rest: 1,
    seed: null,
  });
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateRoster({
        players,
        fixed_pairs: fixedPairs,
        ...config,
      });
      setRoster(result);
    } catch (e) {
      setError(e.message);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }

  function loadingText() {
    if (elapsed < 3) return "Generating...";
    if (elapsed < 8) return `Generating... (${elapsed}s)`;
    return `Waking up server... (${elapsed}s)`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Badminton Roster</h1>
            <p className="text-sm text-gray-500">Generate balanced doubles matchups</p>
          </div>
          <div className="flex items-center gap-3">
            {roster && <DownloadCSV data={roster} />}
            <button
              onClick={handleGenerate}
              disabled={loading || players.length < 4}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? loadingText() : "Generate Roster"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 space-y-6">
            <PlayerInput
              players={players}
              setPlayers={setPlayers}
              fixedPairs={fixedPairs}
              setFixedPairs={setFixedPairs}
            />
            <ConfigPanel config={config} setConfig={setConfig} players={players} />
          </div>
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-gray-700 font-medium">{loadingText()}</p>
                {elapsed >= 5 && (
                  <p className="text-gray-400 text-sm mt-2">
                    First request may take up to 30s while the server wakes up
                  </p>
                )}
              </div>
            ) : roster ? (
              <RosterTable data={roster} fixedPairs={fixedPairs} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-300 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No roster generated yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Configure players and settings, then click "Generate Roster"
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

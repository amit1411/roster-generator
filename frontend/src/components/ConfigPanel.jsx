import { useState } from "react";

export default function ConfigPanel({ config, setConfig, players }) {
  const [limitPlayer, setLimitPlayer] = useState("");
  const [limitValue, setLimitValue] = useState(2);

  function update(key, value) {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "num_courts") {
        const n = value;
        const old = prev.court_numbers || [];
        if (n > old.length) {
          const extended = [...old];
          for (let i = old.length; i < n; i++) extended.push(String(i + 1));
          next.court_numbers = extended;
        } else {
          next.court_numbers = old.slice(0, n);
        }
      }
      return next;
    });
  }

  function updateCourtNumber(index, value) {
    setConfig((prev) => {
      const nums = [...(prev.court_numbers || [])];
      nums[index] = value;
      return { ...prev, court_numbers: nums };
    });
  }

  function addLimit(e) {
    e.preventDefault();
    if (!limitPlayer) return;
    update("limits", { ...config.limits, [limitPlayer]: limitValue });
    setLimitPlayer("");
  }

  function removeLimit(player) {
    const next = { ...config.limits };
    delete next[player];
    update("limits", next);
  }

  const fields = [
    { key: "num_courts", label: "Courts", min: 1, max: 20 },
    { key: "rounds", label: "Rounds", min: 1, max: 30 },
    { key: "pair_games", label: "Pair Games", min: 1, max: 15 },
    { key: "pair_start_round", label: "Pair Start Round", min: 1, max: 30 },
    { key: "max_consecutive_rest", label: "Max Consec. Rest", min: 1, max: 10 },
  ];

  const courtNumbers = config.court_numbers || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Settings</h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {fields.map(({ key, label, min, max }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              value={config[key]}
              onChange={(e) => update(key, parseInt(e.target.value) || min)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Seed (optional)</label>
          <input
            type="number"
            value={config.seed ?? ""}
            onChange={(e) => update("seed", e.target.value === "" ? null : parseInt(e.target.value))}
            placeholder="Random"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mb-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Court Numbers
        </p>
        <div className="flex flex-wrap gap-2">
          {courtNumbers.map((num, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs text-gray-400">#{i + 1}:</span>
              <input
                type="text"
                value={num}
                onChange={(e) => updateCourtNumber(i, e.target.value)}
                className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Set the actual court numbers at your venue (e.g. 3, 7, 12)
        </p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Consecutive Game Limits
        </p>
        <form onSubmit={addLimit} className="flex gap-2 mb-3">
          <select
            value={limitPlayer}
            onChange={(e) => setLimitPlayer(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select player...</option>
            {players
              .filter((p) => !(p in config.limits))
              .map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
          </select>
          <input
            type="number"
            min={1}
            max={20}
            value={limitValue}
            onChange={(e) => setLimitValue(parseInt(e.target.value) || 1)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add
          </button>
        </form>

        {Object.keys(config.limits).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(config.limits).map(([player, limit]) => (
              <span
                key={player}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700"
              >
                {player}: max {limit}
                <button onClick={() => removeLimit(player)} className="hover:text-red-600 ml-0.5">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

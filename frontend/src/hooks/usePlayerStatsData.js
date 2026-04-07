import { useEffect, useState } from "react";
import { fetchPlayerStats, listPlayerStats } from "../api";
import { normalizePlayerDetail, normalizePlayerSummary } from "./appStateUtils";

export default function usePlayerStatsData({ view }) {
  const [playerStats, setPlayerStats] = useState([]);
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStatsDetail, setPlayerStatsDetail] = useState(null);
  const [playerStatsDetailLoading, setPlayerStatsDetailLoading] = useState(false);
  const [pageError, setPageError] = useState(null);

  useEffect(() => {
    if (view === "player-stats") {
      void loadPlayerStats();
    }
  }, [view]);

  useEffect(() => {
    if (playerStats.length === 0) {
      if (selectedPlayer) {
        setSelectedPlayer(null);
      }
      if (playerStatsDetail) {
        setPlayerStatsDetail(null);
      }
      return;
    }

    if (selectedPlayer && !playerStats.some((player) => player.playerName === selectedPlayer)) {
      setSelectedPlayer(null);
    }
  }, [playerStats, playerStatsDetail, selectedPlayer]);

  useEffect(() => {
    if (view !== "player-stats" || !selectedPlayer) return;
    void loadPlayerStatsDetail(selectedPlayer);
  }, [selectedPlayer, view]);

  async function loadPlayerStats() {
    setPlayerStatsLoading(true);
    setPageError(null);
    try {
      const list = await listPlayerStats();
      setPlayerStats(list.map(normalizePlayerSummary).filter(Boolean));
    } catch (error) {
      setPageError(error.message);
    } finally {
      setPlayerStatsLoading(false);
    }
  }

  async function loadPlayerStatsDetail(playerName) {
    setPlayerStatsDetailLoading(true);
    setPageError(null);
    try {
      const detail = await fetchPlayerStats(playerName);
      setPlayerStatsDetail(normalizePlayerDetail(detail));
    } catch (error) {
      setPageError(error.message);
    } finally {
      setPlayerStatsDetailLoading(false);
    }
  }

  function clearPageError() {
    setPageError(null);
  }

  return {
    playerStats,
    playerStatsLoading,
    selectedPlayer,
    setSelectedPlayer,
    playerStatsDetail,
    playerStatsDetailLoading,
    pageError,
    loadPlayerStats,
    clearPageError,
  };
}

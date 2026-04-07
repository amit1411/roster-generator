import { useEffect, useRef, useState } from "react";
import { fetchPlayerStats, listPlayerStats } from "../api";
import { normalizePlayerDetail, normalizePlayerSummary } from "./appStateUtils";

export default function usePlayerStatsData({ enabled = false, view }) {
  const [playerStats, setPlayerStats] = useState([]);
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStatsDetail, setPlayerStatsDetail] = useState(null);
  const [playerStatsDetailLoading, setPlayerStatsDetailLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const playerStatsRequestId = useRef(0);
  const playerStatsDetailRequestId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      playerStatsRequestId.current += 1;
      playerStatsDetailRequestId.current += 1;
      setPlayerStats([]);
      setPlayerStatsLoading(false);
      setSelectedPlayer(null);
      setPlayerStatsDetail(null);
      setPlayerStatsDetailLoading(false);
      setPageError(null);
      return;
    }
    if (view === "player-stats") {
      void loadPlayerStats();
    }
  }, [enabled, view]);

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
    if (!enabled || view !== "player-stats" || !selectedPlayer) return;
    void loadPlayerStatsDetail(selectedPlayer);
  }, [enabled, selectedPlayer, view]);

  async function loadPlayerStats() {
    if (!enabled) {
      setPlayerStats([]);
      setPageError(null);
      return [];
    }
    const requestId = playerStatsRequestId.current + 1;
    playerStatsRequestId.current = requestId;
    setPlayerStatsLoading(true);
    setPageError(null);
    try {
      const list = await listPlayerStats();
      if (playerStatsRequestId.current !== requestId) {
        return [];
      }
      const normalized = list.map(normalizePlayerSummary).filter(Boolean);
      setPlayerStats(normalized);
      return normalized;
    } catch (error) {
      if (playerStatsRequestId.current === requestId) {
        setPageError(error.message);
      }
      return [];
    } finally {
      if (playerStatsRequestId.current === requestId) {
        setPlayerStatsLoading(false);
      }
    }
  }

  async function loadPlayerStatsDetail(playerName) {
    if (!enabled || !playerName) {
      setPlayerStatsDetail(null);
      return null;
    }
    const requestId = playerStatsDetailRequestId.current + 1;
    playerStatsDetailRequestId.current = requestId;
    setPlayerStatsDetailLoading(true);
    setPageError(null);
    try {
      const detail = await fetchPlayerStats(playerName);
      if (playerStatsDetailRequestId.current !== requestId) {
        return null;
      }
      const normalized = normalizePlayerDetail(detail);
      setPlayerStatsDetail(normalized);
      return normalized;
    } catch (error) {
      if (playerStatsDetailRequestId.current === requestId) {
        setPageError(error.message);
      }
      return null;
    } finally {
      if (playerStatsDetailRequestId.current === requestId) {
        setPlayerStatsDetailLoading(false);
      }
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

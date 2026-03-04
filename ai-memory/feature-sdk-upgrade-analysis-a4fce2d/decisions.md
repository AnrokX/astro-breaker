# Decisions

- Global persistence (getGlobalData/setGlobalData) stays on PersistenceManager.instance - still exists in 0.15.2
- Player persistence moved to player.getPersistedData()/setPersistedData() - synchronous API
- All async->sync conversions done for player data methods (leaderboard + settings managers)
- 5 pre-existing test failures not addressed (mock World type mismatches, missing resetGame method, etc.)
- leaderboardCache used directly in updatePlayerBest instead of awaiting getGlobalLeaderboard (sync context)

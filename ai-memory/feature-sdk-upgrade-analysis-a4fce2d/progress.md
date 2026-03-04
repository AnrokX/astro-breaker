# Progress

- [x] package.json: hytopia ^0.3.18 -> ^0.15.2
- [x] index.ts: modelLoopedAnimations -> modelAnimations with EntityModelAnimationLoopMode
- [x] index.ts: setModelHiddenNodes([]) -> modelHiddenNodes.add() Set API
- [x] index.ts: async->sync for settings and leaderboard player data calls
- [x] leaderboard-manager.ts: PersistenceManager.getPlayerData/setPlayerData -> player.getPersistedData/setPersistedData (sync)
- [x] player-settings-manager.ts: same persistence migration (async->sync)
- [x] block-particle-effects.ts: verified no changes needed (already has RigidBodyType.DYNAMIC)
- [x] projectile-entity.ts: verified no changes needed
- [x] moving-block-entity.ts: verified no changes needed
- [x] Test mocks updated (hytopia.ts)
- [x] leaderboard-manager.test.ts updated and passing
- [x] leaderboard-integration.test.ts updated and passing
- [x] npm install successful
- [x] npx tsc --noEmit: 0 errors in game source code
- [x] Tests: 7 pass, 5 fail (all failures pre-existing, unrelated to SDK upgrade)

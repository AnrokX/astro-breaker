# What They Said

> You can modularize the UI in your game somewhat  
> When ark posts the casino example you will see what I mean but basically make functions out of all of your UI onData, and just swap in and out as needed:
>
> and this when the blackjack game ends  
> Just reload the default ui which has leaderboard and nametags and stuff

---

# Modularizing UI Code in a Casino Game

## Introduction

When developing a game with multiple UI components, it’s essential to modularize UI handling to ensure flexibility and maintainability. This guide demonstrates how to manage UI elements efficiently by swapping interfaces dynamically based on the player's state.

The following example, based on a casino game, shows how UI components are loaded and switched dynamically.

## UI File Structure

The UI is organized into separate HTML files, each representing a different game mode or general UI:

```
ui/
├── blackjack.html
├── default.html
├── poker.html
├── shop.html
└── slots.html
```

- `blackjack.html` – UI for the Blackjack game.
- `default.html` – The main UI that includes the leaderboard and nametags.
- `poker.html` – UI for the Poker game.
- `shop.html` – UI for the in-game shop.
- `slots.html` – UI for the Slot machine.

## Blackjack UI Handling

### **Starting the Blackjack Game**
When a player starts a Blackjack game, the UI is updated accordingly:

```typescript
export class BlackjackManager {
    static getInstance(): BlackjackManager { }

    startGame(player: Player) {
        const game = new BlackjackGame(player);
        this.games.set(player.id, game);

        player.ui.load("ui/blackjack.html"); // Load the Blackjack UI
        player.ui.lockPointer(false);

        const initialState = game.getGameState();
        initialState.playerBalance = this.balanceManager.getBalance(player);
        player.ui.sendData(initialState);

        player.ui.onData = (playerUI: PlayerUI, data: any) => {
            player.ui.lockPointer(false);
            const game = this.games.get(player.id);
            if (!game) return;

            let response = null;
            switch (data.type) {
                case "bet":
                    if (data.betAmount) {
                        // Handle betting logic
                    }
                    break;
            }
        };
    }
}
```

### **Handling Game End**
When the Blackjack game ends, the UI resets back to the default interface:

```typescript
endGame(player: Player) {
    if (this.games.delete(player.id)) {
        player.ui.load("ui/default.html"); // Reload the default UI
        player.ui.lockPointer(true);

        // Trigger a balance update for all players
        this.balanceManager.broadcastBalanceUpdate();
    }
}
```

## **Key Takeaways for UI Modularization**

1. **Separate UI Files**  
   Each game or UI component is stored in a dedicated HTML file. This prevents clutter in a single large UI file.

2. **Dynamic UI Loading**  
   UI elements are swapped dynamically based on the game state using `player.ui.load("ui/blackjack.html")` or `player.ui.load("ui/default.html")`.

3. **Event-Driven UI Handling**  
   The `onData` function processes user interactions, allowing for modular and extendable UI behavior.

4. **Resetting to Default UI**  
   When a game ends, it reverts to the `default.html` UI, ensuring that core UI elements like the leaderboard and nametags remain accessible.

## **Conclusion**

By structuring UI elements this way, you can create a scalable and maintainable UI system for your game. This approach enables easy swapping of different UIs while keeping the game logic clean and modular.

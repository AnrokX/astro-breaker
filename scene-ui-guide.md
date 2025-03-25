# Scene UIs in Hytopia

Scene UIs are created with HTML, CSS and Javascript as UI elements within the game scene itself. They can be positioned spatially, follow entities, and more.

They're incredibly flexible and a fantastic way to add another layer of depth to a game. You can use them to create pretty much anything you can imagine - health bars, status symbols that follow entities, quest direction indicators, and so much more.

## Creating A Scene UI Template & Instance

All Scene UIs start from a template. A template is defined with the hytopiaglobal's `registerSceneUITemplate()` method injected into your .html file when it loads in the game client.

Here's an example of how we can create a Scene UI that displays an updating message above a player.

First, we need to register the Scene UI Template with a unique template id the server can reference to tell the client what kind of scene ui to create. We'll give our template an id of `my-game-message`.

```html
<!-- index.html, SceneUI templates & overlay UI exist here. -->
<!-- Loaded by the server calling something like player.ui.load(`assets/path/to/index.html`) -->

<script>
  // The first argument of registerSceneUITempalte is the 
  // template id assigned to this template. The second argument
  // is the renderer function used to create a new instance from this
  // template.
  //
  // In the renderer function, id is the scene ui elements unique id, 
  // not the template id. onState is a function we can provide an 
  // onState callback to that will be called anytime the specific
  // instance rendered from our template has a state update.
  hytopia.registerSceneUITemplate('my-game-message', (id, onState) => {
    const template = document.getElementById('my-game-message-template');
    const clone = template.content.cloneNode(true);
    
    // caveat here! Because our game message gets appended to the dom
    // when we return it from this function,
    // using clone.querySelector within onState would return null.
    // So, we create a reference variable to the message element (messageElement)
    // we intend to update in onState so that we can still properly 
    // get the element reference.
    const messageElement = clone.querySelector('.message');
    
    // invoked when the server sends initial state or a state
    // update to this specific scene ui instance created from
    // our template.
    onState(state => {
      messageElement.textContent = state.message;
    });
    
    return clone; // important!! We must return an HTMLElement
  });
</script>

<!-- Our overlay UI that's part of all the rest of our UI could go here, etc... -->

<template id="my-game-message-template">
  <div class="my-game-message">
    <p class="message"></p>
  </div>
</template>

<style>
  .my-game-message {
    background: rgba(0, 0, 0, 0.8);
    border-radius: 12px;
    padding: 12px 20px;
    color: white;
    text-align: center;
    position: relative;
    margin-bottom: 15px;
  }

  .my-game-message:after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid rgba(0, 0, 0, 0.8);
  }

  .my-game-message p {
    font-family: Arial, sans-serif;
    user-select: none;
    font-size: 14px;
    margin: 0;
  }
</style>
```

Now that we've defined the Scene UI template, our server can tell the client to create an instance of the SceneUI. 

Let's use our SceneUI to create a message above each player that joins our game, setting the message to their username. Then, every second we'll perform a state update unique to each player's specific Scene UI instance we created, showcasing how we can control individual Scene UI state.

```javascript
world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
  // Load the UI file for the joined player that we created above
  player.ui.load('ui/index.html');

  const playerEntity = new PlayerEntity({
    player,
    name: 'Player',
    modelUri: 'models/players/player.gltf',
    modelLoopedAnimations: [ 'idle' ],
    modelScale: 0.5,
  });

  // Create an instance of our SceneUI by the template
  // id we defined in our .html file
  const messageSceneUI = new SceneUI({
    templateId: 'my-game-message',
    attachedToEntity: playerEntity, // It'll follow our entity
    state: { message: player.username },
    offset: { x: 0, y: 1, z: 0 }, // Offset it up slightly so it's above our head
  });

  // Update the state of this Scene UI instance every second.
  setInterval(() => {
    messageSceneUI.setState({
      message: `${player.username} | ${Math.random() * 100}`,
    });
  }, 1000);

  // Load the Scene UI in the world
  messageSceneUI.load(world);
  
  // Spawn the entity
  playerEntity.spawn(world, { x: 0, y: 10, z: 0 });
});
```

You can also provide other options when creating a new instance of SceneUI for different behaviors. You can find the latest SceneUIOptions API Reference here.

That's it! The result is a message bubble showing the player's username & a random number updating state.

## State Explained

On the server, every Scene UI is represented as an instance of the SceneUI Class. These instances have their own `state` property which is an arbitrary object holding the most recent state specific to that instance. 

This state can be updated by using the `.setState()` method of a SceneUI instance. This method expects an arbitrary object of any shape. It will perform a shallow merge between the values provided to `.setState()` and the existing state object of the instance.

Invoking `.setState()` will also send the state update to the client, invoking the `onState()` callback in our template renderer function defined in our .html file, allowing us to control the logic that changes the visual appearance of the SceneUI in game.

## Removing Scene UIs

You can remove any SceneUI instance from the game through `.unload()`. For example:

```javascript
// ... other code

const messageSceneUI = new SceneUI({
  templateId: 'my-game-message',
  attachedToEntity: playerEntity,
  state: { message: player.username }, // state isn't required, you can also create stateless scene ui.
  offset: { x: 0, y: 1, z: 0 },
});

messageSceneUI.load(world);

setTimeout(() => { // remove our scene UI after 5 seconds
  messageSceneUI.unload();
}, 5000);
```

## SceneUI Interactions, Sending Data From SceneUI To Server

Depending on your game's requirements, you can even make your SceneUI interactable with the player's mouse or for text input within the context of the game scene.

With interactable UI elements, you'll likely want to be able to send data back to the server. in the same way you use `hytopia.sendData()` to send data in our Overlay UI examples, you can also use it to send data from interactions with a Scene UI instance.

Here's an example. Assume we have a button SceneUI template that we create. When a player clicks that button, we want to send data back to the server, telling the server what specific button was clicked.

```html
<script>
  hytopia.registerSceneUITemplate('game-button', (id, onState) => {
    const template = document.getElementById('game-button-template');
    const clone = template.content.cloneNode(true);
    const buttonElement = clone.querySelector('.button');
    
    buttonElement.onclick = () => {
      // Send click event to server
      hytopia.sendData({
        type: 'button-click',
        buttonId: id
      });

      console.log('clicked button!', id);
    };

    return clone;
  });
</script>
```

and then, on our server, we'll listen for that data, and handle it accordingly to retrieve the correct SceneUI instance on the server.

```javascript
player.ui.on(PlayerUIEvent.DATA, ({ playerUI, data }) => {
  console.log('got data from this players UI!', data);
  if (data.type === 'button-click') {
    const buttonId = data.buttonId as number;    
    const sceneUI = world.sceneUIManager.getSceneUIById(buttonId);
    console.log('got scene ui!', sceneUI);
    // do whatever we want for the click.
  }
});
```

When interacting with our button, our `console.log()` in our server code will log the correct instance of the SceneUI for the button that was clicked. 

node_modules\hytopia\docs\server.sceneui.id.md
node_modules\hytopia\docs\server.sceneui.isloaded.md
node_modules\hytopia\docs\server.sceneui.load.md
node_modules\hytopia\docs\server.sceneui.md
node_modules\hytopia\docs\server.sceneui.offset.md
node_modules\hytopia\docs\server.sceneui.position.md
node_modules\hytopia\docs\server.sceneui.setattachedtoentity.md
node_modules\hytopia\docs\server.sceneui.setoffset.md
node_modules\hytopia\docs\server.sceneui.setposition.md
node_modules\hytopia\docs\server.sceneui.setstate.md
node_modules\hytopia\docs\server.sceneui.setviewdistance.md
node_modules\hytopia\docs\server.sceneui.state.md
node_modules\hytopia\docs\server.sceneui.templateid.md
node_modules\hytopia\docs\server.sceneui.unload.md
node_modules\hytopia\docs\server.sceneui.viewdistance.md
node_modules\hytopia\docs\server.sceneui.world.md
node_modules\hytopia\docs\server.sceneuievent.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.load_.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.set_attached_to_entity_.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.set_offset_.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.set_position_.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.set_state_.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.set_view_distance_.md
node_modules\hytopia\docs\server.sceneuieventpayloads._scene_ui.unload_.md
node_modules\hytopia\docs\server.sceneuieventpayloads.md
node_modules\hytopia\docs\server.sceneuimanager.getallentityattachedsceneuis.md
node_modules\hytopia\docs\server.sceneuimanager.getallsceneuis.md
node_modules\hytopia\docs\server.sceneuimanager.getsceneuibyid.md
node_modules\hytopia\docs\server.sceneuimanager.md
node_modules\hytopia\docs\server.sceneuimanager.unloadentityattachedsceneuis.md
node_modules\hytopia\docs\server.sceneuimanager.world.md
node_modules\hytopia\docs\server.sceneuioptions.attachedtoentity.md
node_modules\hytopia\docs\server.sceneuioptions.md
node_modules\hytopia\docs\server.sceneuioptions.offset.md
node_modules\hytopia\docs\server.sceneuioptions.position.md
node_modules\hytopia\docs\server.sceneuioptions.state.md
node_modules\hytopia\docs\server.sceneuioptions.templateid.md
node_modules\hytopia\docs\server.sceneuioptions.viewdistance.md
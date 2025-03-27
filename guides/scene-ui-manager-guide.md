# Scene UI Manager in Hytopia

It's common for some games to have many different Scene UIs loaded into a game at the same time. This can become difficult to track or manage manually, especially if you need to retrieve and perform updates on specific Scene UI instances.

For this, we have the SceneUIManager that provides ways to quickly retrieve, iterate and update loaded Scene UIs in a world.

## Accessing A SceneUIManager

The SceneUIManager is used as a singleton and automatically created for a given world instance.

You can access the Scene UI Manager for a world like this:

```javascript
world.sceneUIManager
```

## Using A SceneUIManager

The SceneUIManager exposes a number of ways to get different types of SceneUI instances loaded in a world. Here's a few examples of how you can use it.

```javascript
// Returns an array of all loaded scene ui
// instances for the world
world.sceneUIManager.getAllSceneUIs();

// Returns an array of all loaded scene ui
// instances attached to the provided entity.
world.sceneUIManager.getAllEntityAttachedSceneUIs(someEntity);
``` 
API REFERENCES

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
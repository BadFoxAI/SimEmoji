import * as config from './config.js';
// Removed updateLayerUI import as it's handled internally by selectTile now
import { showStatusMessage, updateUndoRedoButtons, selectTile, updateSizeUI } from './ui.js'; // Removed updateLayerUI

// --- Game State Variables ---
export let camX = 0; export let camY = 0; export let zoomLevel = 1.0;
// NEW gridData structure: Map<string, { [layer: number]: TileData }>
// TileData = string | { tile: string, size: number, isOrigin: true } | { originX: number, originY: number, isOrigin: false }
export let gridData = new Map();
export let selectedTile = config.DEFAULT_TILE; export let selectedSize = config.DEFAULT_SIZE;
export let currentPlacementLayer = config.getDefaultLayerForTile(config.DEFAULT_TILE); // Layer derived from selected tile
export let currentTool = 'build'; export let undoStack = []; export let redoStack = [];

// --- State Modifiers ---
export function setCamPos(x, y) { camX = x; camY = y; } export function setZoomLevel(level) { zoomLevel = level; }
export function setGridData(dataMap) { gridData = dataMap; }
// When selecting a tile, also update the current placement layer
export function setSelectedTile(tileId) {
    selectedTile = tileId;
    currentPlacementLayer = config.getDefaultLayerForTile(tileId);
}
export function setSelectedSize(size) { selectedSize = Math.max(1, Math.min(size, config.MAX_BUILD_SIZE)); }
// setSelectedLayer is removed
export function setCurrentTool(tool) { currentTool = tool; }

// --- Helper: Get Info for the TOPMOST relevant tile/object at coordinates ---
// Returns null if empty, or an object like:
// { tile, size, layer, isOrigin, originX, originY }
// If the coordinate contains a part of a multi-tile object, it returns the info
// of the object's origin, but with isOrigin: false.
export function getEffectiveTileInfo(gx, gy) {
    const key = `${gx},${gy}`;
    const layerMap = gridData.get(key);
    if (!layerMap) return null; // Nothing at this coordinate

    let topmostLayer = -Infinity;
    let topmostData = null;
    let topmostLayerKey = -1; // Store the key (layer number) of the topmost data

    // Find the highest layer number present at this coordinate
    for (const layerStr in layerMap) {
        const layer = parseInt(layerStr, 10);
        // Ensure layerMap[layer] is not null or undefined before checking layer number
        if (layerMap[layer] && layer > topmostLayer) {
            topmostLayer = layer;
            topmostData = layerMap[layer];
            topmostLayerKey = layer;
        }
    }


    if (topmostData === null || topmostLayer === -Infinity) return null; // No valid data found

    // Now process the data found on the highest layer
    if (typeof topmostData === 'string') {
        // Simple tile string on the highest layer
        return { tile: topmostData, size: 1, layer: topmostLayer, isOrigin: true, originX: gx, originY: gy };
    } else if (typeof topmostData === 'object' && topmostData !== null) {
        if (topmostData.isOrigin) {
            // It's the origin of a multi-tile object on the highest layer
            return {
                tile: topmostData.tile,
                size: topmostData.size || 1,
                layer: topmostLayer, // Use the layer it was found on
                isOrigin: true,
                originX: gx,
                originY: gy
            };
        } else {
            // It's part of a multi-tile object on the highest layer, find the origin
            const originKey = `${topmostData.originX},${topmostData.originY}`;
            const originLayerMap = gridData.get(originKey);
            // IMPORTANT: The origin data MUST exist on the *same layer* as the part
            const originData = originLayerMap ? originLayerMap[topmostLayerKey] : null;

            if (typeof originData === 'object' && originData?.isOrigin) {
                // Return info based on the origin, but mark isOrigin false for this cell
                return {
                    tile: originData.tile,
                    size: originData.size || 1,
                    layer: topmostLayer, // The layer this part exists on
                    isOrigin: false, // This specific cell is not the origin
                    originX: topmostData.originX, // Reference to the actual origin coords
                    originY: topmostData.originY
                };
            } else {
                // Origin data is missing or invalid (perhaps due to partial deletion/undo issues)
                // Treat this part as orphaned/invalid
                console.warn(`Orphaned multi-tile part found at ${gx},${gy}, layer ${topmostLayer} ref ${topmostData.originX},${topmostData.originY}`);
                // Attempt to remove this orphaned part? Or just ignore it for info purposes.
                // Let's ignore it for now to avoid modifying state within a get function.
                return null;
            }
        }
    }

    return null; // Should not happen if topmostData was found, but safety fallback
}


// --- Undo/Redo Logic ---
// actionData = { type: 'place'/'bulldoze', cells: [ { key, oldLayerMap, newLayerMap }, ... ] }
export function performAction(actionData) {
    actionData.cells.forEach(({ key, newLayerMap }) => {
        if (newLayerMap === null || Object.keys(newLayerMap).length === 0) {
            gridData.delete(key); // Remove map entry if new state is empty
        } else {
            gridData.set(key, newLayerMap); // Set the entire layer map object
        }
    });
    undoStack.push(actionData);
    if (undoStack.length > config.MAX_UNDO_STEPS) { undoStack.shift(); }
    redoStack = []; // Clear redo stack
    updateUndoRedoButtons();
    saveGameToLocal(); // Autosave on action
}

export function undo() {
    if (undoStack.length === 0) return;
    const actionData = undoStack.pop();
    // Reverse the action by applying the *old* data
    actionData.cells.forEach(({ key, oldLayerMap }) => {
        if (oldLayerMap === null || Object.keys(oldLayerMap).length === 0) {
            gridData.delete(key); // Restore empty state
        } else {
            gridData.set(key, oldLayerMap); // Restore previous layer map object
        }
    });
    redoStack.push(actionData);
    updateUndoRedoButtons();
    saveGameToLocal(); // Autosave on undo
}

export function redo() {
    if (redoStack.length === 0) return;
    const actionData = redoStack.pop();
    // Re-apply the action by applying the *new* data
    actionData.cells.forEach(({ key, newLayerMap }) => {
         if (newLayerMap === null || Object.keys(newLayerMap).length === 0) {
            gridData.delete(key);
        } else {
            gridData.set(key, newLayerMap);
        }
    });
    undoStack.push(actionData);
    updateUndoRedoButtons();
    saveGameToLocal(); // Autosave on redo
}

// --- Save/Load Logic ---
export function saveGameToLocal() {
    try {
        // Need to handle Map of Objects correctly for JSON
        const gridObject = {};
        gridData.forEach((value, key) => { gridObject[key] = value; });

        const saveData = {
            version: 9, // Match config version
            grid: gridObject, // Save as object
            camera: { x: camX, y: camY }, zoom: zoomLevel,
            selected: selectedTile, selectedSize: selectedSize
            // No need to save currentPlacementLayer, it's derived
        };
        localStorage.setItem(config.SAVE_KEY, JSON.stringify(saveData));
        // console.log("Autosaved to localStorage");
    } catch (error) {
        console.error("LS Save Error:", error);
        showStatusMessage("Error autosaving!", false);
    }
}

export function loadGameFromLocal() {
    const savedString = localStorage.getItem(config.SAVE_KEY);
    let loadedSuccessfully = false;
    gridData = new Map(); // Start fresh

    if (savedString) {
        try {
            const saveData = JSON.parse(savedString);
            const dataVersion = saveData.version || 0;

            if (dataVersion >= 9) { // Load new format (object map)
                 const gridObject = saveData.grid || {};
                 for (const key in gridObject) {
                     if (Object.hasOwnProperty.call(gridObject, key)) {
                         gridData.set(key, gridObject[key]); // Convert back to Map
                     }
                 }
            } else { // Handle older formats (e.g., v6-v8 single item per cell)
                 console.warn(`Loading pre-v9 save format (v${dataVersion}). Converting to layered structure.`);
                 const oldGridArray = saveData.grid || []; // Could be array (v6) or object (v9)
                 const oldGridMap = new Map(oldGridArray); // Convert array format to map if necessary

                 oldGridMap.forEach((value, key) => {
                     if (!value) return; // Skip null/empty entries

                     let layer = config.DEFAULT_LAYER;
                     let tileId = null;
                     let processedData = null; // The data to store for the determined layer

                     if(typeof value === 'string'){
                         tileId = value;
                         layer = config.getDefaultLayerForTile(tileId);
                         processedData = tileId; // Store string directly
                     } else if (typeof value === 'object' && value !== null) {
                        // Assume old format objects store layer directly if available (v6-v8)
                        layer = value.layer ?? config.DEFAULT_LAYER;
                        // Determine tile ID for layer calculation if needed
                        if(value.isOrigin) tileId = value.tile;
                        else { // It's a part, need to look up origin from old map
                           const originData = oldGridMap.get(`${value.originX},${value.originY}`);
                           if(originData?.isOrigin) tileId = originData.tile;
                        }
                        // Ensure derived layer matches object's intended layer if possible
                        layer = value.layer ?? config.getDefaultLayerForTile(tileId);
                        // We store the original object (potentially without layer initially)
                        processedData = value;
                     }

                     if(processedData !== null) {
                         const layerMap = { [layer]: processedData }; // Create new layer map for this cell
                         gridData.set(key, layerMap);
                     }
                 });
            }

            // Load other state
            setCamPos(saveData.camera?.x || 0, saveData.camera?.y || 0);
            setZoomLevel(saveData.zoom || 1.0);
            setSelectedSize(saveData.selectedSize || config.DEFAULT_SIZE);
            selectTile(saveData.selected || config.DEFAULT_TILE); // Sets tile AND its default layer

            showStatusMessage("Game Loaded from Local Storage!", true);
            loadedSuccessfully = true;

        } catch (error) {
            console.error("Error loading game from localStorage:", error);
            showStatusMessage("Error loading local save.", false);
            gridData = new Map(); // Ensure grid is cleared on error
        }
    }

    if (!loadedSuccessfully) {
        // Apply defaults if load failed or no save existed
        gridData = new Map(); setCamPos(0, 0); setZoomLevel(1.0);
        setSelectedSize(config.DEFAULT_SIZE);
        selectTile(config.DEFAULT_TILE); // Sets default tile and layer
        if (!savedString) showStatusMessage("No local save data found.", false);
    }

    // Always update UI and clear history after attempting load
    updateSizeUI();
    // updateLayerUI removed
    undoStack = []; redoStack = []; updateUndoRedoButtons();
    return loadedSuccessfully;
}


export function saveGameToFile() {
    try {
        const gridObject={}; gridData.forEach((v,k)=>{gridObject[k]=v;});
        const saveData={version:9,description:"SimEmoji Save",grid:gridObject,camera:{x:camX,y:camY},zoom:zoomLevel,selected:selectedTile,selectedSize:selectedSize};
        const jsonString=JSON.stringify(saveData,null,2); const blob=new Blob([jsonString],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`simemoji_save_${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showStatusMessage("Game Saved to File!",true); saveGameToLocal();
    }catch(error){console.error("File Save Error:",error); showStatusMessage("Error saving to file.",false);}
}
export function loadGameFromFile(file) {
    if(!file)return; const reader=new FileReader();
    reader.onload=(e)=>{ try{ const jsonString=e.target.result; const saveData=JSON.parse(jsonString); if(!saveData.grid||!saveData.camera||saveData.version!==9){throw new Error("Invalid or incompatible save file format (v9 required).");}
        gridData=new Map(); const gridObject=saveData.grid||{}; for(const key in gridObject){if(Object.hasOwnProperty.call(gridObject,key)){gridData.set(key,gridObject[key]);}}
        setCamPos(saveData.camera.x||0,saveData.camera.y||0); setZoomLevel(saveData.zoom||1.0); setSelectedSize(saveData.selectedSize||config.DEFAULT_SIZE); selectTile(saveData.selected||config.DEFAULT_TILE); showStatusMessage(`Loaded "${file.name}"!`,true); undoStack=[]; redoStack=[]; updateUndoRedoButtons(); saveGameToLocal(); window.dispatchEvent(new Event('stateLoaded'));
    }catch(error){console.error("File Load Error:",error);showStatusMessage(`Error loading file: ${error.message}`,false);}};
    reader.onerror=(e)=>{console.error("FileReader error:",e);showStatusMessage("Error reading file.",false);}; reader.readAsText(file);
}

export function confirmClearSaveData() {
    try {
        localStorage.removeItem(config.SAVE_KEY);
        showStatusMessage("Local save data cleared.", true);
        // Reset Game State
        setGridData(new Map()); setCamPos(0, 0); setZoomLevel(1.0);
        selectTile(config.DEFAULT_TILE); // Resets tile & placementLayer
        setSelectedSize(config.DEFAULT_SIZE); // Use the state function correctly
        setCurrentTool('build');
        undoStack = []; redoStack = []; updateUndoRedoButtons();
        // Signal state change for redraw etc.
        window.dispatchEvent(new Event('stateLoaded'));
    } catch (error) {
        console.error("Error clearing save data:", error);
        showStatusMessage("Error clearing save data.", false);
    }
}

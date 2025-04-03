// --- Configuration ---
export const BASE_GRID_SIZE = 32;
export const WORLD_WIDTH_CELLS = 100;
export const WORLD_HEIGHT_CELLS = 80;
export const PAN_SPEED_FACTOR = 0.5;
export const SAVE_KEY = 'simEmojiSave_v9'; // Keep version unless format changes
export const MAX_ZOOM = 5.0;
export const MIN_ZOOM = 0.2;
export const ZOOM_INCREMENT = 0.15;
export const MAX_UNDO_STEPS = 50;
export const MAX_BUILD_SIZE = 10;

// Layer Config (Simplified)
export const LAYER_GROUND = 0;      // Base terrain
export const LAYER_PATHS = 1;       // Roads, paths, rails ON ground
export const LAYER_FEATURES = 2;    // Objects like trees, rocks, signs ON ground/paths
export const LAYER_BUILDINGS = 3;   // Structures ON ground/paths
export const LAYER_AIR = 4;         // Effects, clouds
// --- Derived ---
export const DEFAULT_LAYER = LAYER_FEATURES;
export const MIN_LAYER = LAYER_GROUND;
export const MAX_LAYER = LAYER_AIR;

// --- Generated Tile Definitions --- (Unchanged)
export const GENERATED_TILES = { 'T_GRASS':{type:'noise',color1:'#5a8b5a',color2:'#6aaa6a',density:0.3}, 'T_WATER_BASE':{type:'color',color:'#699cc0'}, 'T_DIRT':{type:'noise',color1:'#a07040',color2:'#8a6035',density:0.2}, 'T_ROCK_BASE':{type:'color',color:'#888888'}, 'T_SAND':{type:'noise',color1:'#e0d0a0',color2:'#d4c090',density:0.25}, 'T_ASPHALT':{type:'color',color:'#555555'}, 'T_RAIL':{type:'pattern',color1:'#8a6035',color2:'#707070',pattern:'rail'}, 'T_BRICK_PATH':{type:'pattern',color1:'#c08070',color2:'#a06050',pattern:'bricks'} };
export const GENERATED_TILE_IDS = new Set(Object.keys(GENERATED_TILES));

// Tiles considered 'ground' (only allowed on LAYER_GROUND)
export const GROUND_TILES = new Set(['T_GRASS', 'T_DIRT', 'T_SAND', 'T_ROCK_BASE', 'T_WATER_BASE']);
// Tiles considered 'paths' (only allowed on LAYER_PATHS)
export const PATH_TILES = new Set(['T_ASPHALT', 'T_RAIL', 'T_BRICK_PATH', '🛣️', '🛤️']);


// --- Tile Categories (Cleaned - Removed 🏕️ and 🧺) ---
export const TILE_CATEGORIES = {
    "Ground":     ['T_GRASS', 'T_DIRT', 'T_SAND', 'T_ROCK_BASE', 'T_WATER_BASE'],
    "Paths":      ['T_ASPHALT', 'T_RAIL', 'T_BRICK_PATH', '🛣️', '🛤️'],
    "Nature":     ['🌳', '🌲', '🌴', '🌵', '🪨', '🌊', '💧', '⛰️', '🌸', '🌻', '🍄'],
    "Residential":['🏠', '🏡', '🏘️', '🛖', '🏚️'],
    "Commercial": ['🏢', '🏬', '🏪', '🛒', '🏨', '🏦', '🏧', '🍔', '🍕', '☕'],
    "Industrial": ['🏭', '🔧', '⚙️', '🧱', '🪵', '⛏️', '🏗️'],
    "Civic/Services": ['🏛️','🏫','🏥','🏤','⛪','🕌','🕍','⛩️','🏰','🏯','🏟️','🚓','🚑','🚒','⛽','💡','♻️','🛰️'],
    "Vehicles":   ['🚗', '🚕', '🚌', '🚚', '🚛', '🚢', '🚤', '✈️', '🚁', '🚀'],
    "Infrastructure": ['🚧','🚦','🌉','⚓'],
    "Recreation": ['🎡','🎢','🎪','🎭','🏞️','🏖️','⛱️','⛲','⛳','⚽','🏀','🏈','⚾','🎾','🎳','🎣','🏊','🏄'], // Removed 🏕️
    "Farm":       ['🍓', '🍎', '🌽', '🥕', '🥔', '🍅', '🍆', '🐄', '🐖', '🐑', '🐔', '🚜', '🧑‍🌾', '🌾'], // Removed 🧺
    "Markers":    ['🚩', '📍', '⬆️', '➡️', '⬇️', '⬅️', '⛔', '🚫', '🅿️'],
    "Sky/Effects":['⭐', '❓', '☀️', '🌙', '☁️', '⚡', '💥', '💫', '✨', '💯', '💣', '💰', '🗿', '🔥']
};

// --- Default Layer Assignments --- (Unchanged)
export const DEFAULT_TILE_LAYER = { /* ... same as before ... */ "Ground":LAYER_GROUND,"Paths":LAYER_PATHS,"Nature":LAYER_FEATURES,"Residential":LAYER_BUILDINGS,"Commercial":LAYER_BUILDINGS,"Industrial":LAYER_BUILDINGS,"Civic/Services":LAYER_BUILDINGS,"Vehicles":LAYER_FEATURES,"Infrastructure":LAYER_FEATURES,"Recreation":LAYER_BUILDINGS,"Farm":LAYER_FEATURES,"Markers":LAYER_FEATURES,"Sky/Effects":LAYER_AIR,'🧱':LAYER_FEATURES,'🌊':LAYER_FEATURES,'💧':LAYER_FEATURES,'🚧':LAYER_FEATURES,};

// Helper to get the default layer for placing a tile (Unchanged)
export function getDefaultLayerForTile(tileId) { if(!tileId)return DEFAULT_PLACEMENT_LAYER; if(DEFAULT_TILE_LAYER[tileId]!==undefined)return DEFAULT_TILE_LAYER[tileId]; for(const category in TILE_CATEGORIES){if(TILE_CATEGORIES[category].includes(tileId)){return DEFAULT_TILE_LAYER[category]??DEFAULT_PLACEMENT_LAYER;}} console.warn(`No default layer defined for tile: ${tileId}. Using global default: ${DEFAULT_PLACEMENT_LAYER}.`); return DEFAULT_PLACEMENT_LAYER;}

// Defaults (Unchanged)
export const DEFAULT_TILE = 'T_GRASS'; export const DEFAULT_SIZE = 1;

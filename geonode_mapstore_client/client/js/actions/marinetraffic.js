export const LOAD_AIS = "MARINETRAFFIC:LOAD_AIS";
export const MARINE_TRAFFIC_SELECTED_FEATURES = "MARINETRAFFIC:MARINE_TRAFFIC_SELECTED_FEATURES";
export const MARINE_TRAFFIC_SELECTED_FEATURE = "MARINETRAFFIC:MARINE_TRAFFIC_SELECTED_FEATURE";
export const MARINE_TRAFFIC_SEARCH_VESSEL = "MARINETRAFFIC:MARINE_TRAFFIC_SEARCH_VESSEL";
export const MARINE_TRAFFIC_EXTRACT_HISTORY = "MARINETRAFFIC:MARINE_TRAFFIC_EXTRACT_HISTORY";
export const MARINE_TRAFFIC_VESSEL_HISTORY = "MARINETRAFFIC:MARINE_TRAFFIC_VESSEL_HISTORY";
export const MARINE_TRAFFIC_ADD_LAYER_TO_MAP = "MARINETRAFFIC:MARINE_TRAFFIC_ADD_LAYER_TO_MAP";
export const MARINE_TRAFFIC_SET_LOADING = "MARINETRAFFIC:MARINE_TRAFFIC_SET_LOADING";
export const MARINE_TRAFFIC_CLEAR_SELECTION = "MARINETRAFFIC:MARINE_TRAFFIC_CLEAR_SELECTION";

/**
 * Load the marine traffic AIS data into state.
 * @param {object|null} aisData GeoJSON feature collection or null to clear
 */
export const loadAis = (aisData) => ({
    type: LOAD_AIS,
    aisData
});

/**
 * Update the state with the selected features after a map click or search.
 * @param {Array|null} selectedFeatures array of GeoJSON features or null to clear
 */
export const marineTrafficSelectedFeatures = (selectedFeatures) => ({
    type: MARINE_TRAFFIC_SELECTED_FEATURES,
    selectedFeatures
});

/**
 * Update the state with a single selected feature.
 * @param {object|null} selectedFeature GeoJSON feature or null to clear
 */
export const marineTrafficSelectedFeature = (selectedFeature) => ({
    type: MARINE_TRAFFIC_SELECTED_FEATURE,
    selectedFeature
});

/**
 * Trigger a vessel search.
 * @param {object} searchParam search parameter as { attribute, value }
 */
export const searchVessel = (searchParam) => ({
    type: MARINE_TRAFFIC_SEARCH_VESSEL,
    searchParam
});

/**
 * Trigger history extraction for a vessel.
 * @param {object|null} requestParams { identityId, startDate, endDate } or null to clear
 */
export const extractHistory = (requestParams) => ({
    type: MARINE_TRAFFIC_EXTRACT_HISTORY,
    requestParams
});

/**
 * Save extracted vessel track history to state.
 * @param {object|null} trackHistory GeoJSON feature collection or null to clear
 */
export const vesselHistory = (trackHistory) => ({
    type: MARINE_TRAFFIC_VESSEL_HISTORY,
    trackHistory
});

/**
 * Add a vessel extraction layer to the map.
 * @param {object|null} extractionLayer layer descriptor or null to clear
 */
export const addLayerToMap = (extractionLayer) => ({
    type: MARINE_TRAFFIC_ADD_LAYER_TO_MAP,
    extractionLayer
});

/**
 * Set the loading state of the plugin panel.
 * @param {boolean} loading
 */
export const setMarineTrafficLoading = (loading) => ({
    type: MARINE_TRAFFIC_SET_LOADING,
    loading
});

/**
 * Clear the current vessel selection and related state.
 */
export const clearSelection = () => ({
    type: MARINE_TRAFFIC_CLEAR_SELECTION
});

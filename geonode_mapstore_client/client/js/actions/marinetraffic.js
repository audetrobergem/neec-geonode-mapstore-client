export const LOAD_AIS = "MARINETRAFFIC:LOAD_AIS";
export const MARINE_TRAFFIC_SELECTED_FEATURES = "MARINETRAFFIC:MARINE_TRAFFIC_SELECTED_FEATURES";
export const MARINE_TRAFFIC_SELECTED_FEATURE = "MARINETRAFFIC:MARINE_TRAFFIC_SELECTED_FEATURE";
export const MARINE_TRAFFIC_SEARCH_VESSEL = "MARINETRAFFIC:MARINE_TRAFFIC_SEARCH_VESSEL";
export const MARINE_TRAFFIC_EXTRACT_HISTORY = "MARINETRAFFIC:MARINE_TRAFFIC_EXTRACT_HISTORY";
export const MARINE_TRAFFIC_VESSEL_HISTORY = "MARINETRAFFIC:MARINE_TRAFFIC_VESSEL_HISTORY";
export const MARINE_TRAFFIC_ADD_LAYER_TO_MAP = "MARINETRAFFIC:MARINE_TRAFFIC_ADD_LAYER_TO_MAP";
export const MARINE_TRAFFIC_SET_LOADING = "MARINETRAFFIC:MARINE_TRAFFIC_SET_LOADING";
export const MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL = "MARINETRAFFIC:MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL";
export const MARINE_TRAFFIC_SELECT_NEXT_VESSEL = "MARINETRAFFIC:MARINE_TRAFFIC_SELECT_NEXT_VESSEL";
export const MARINE_TRAFFIC_CLEAR_SELECTION = "MARINETRAFFIC:MARINE_TRAFFIC_CLEAR_SELECTION";

/**
* Load the marine traffic layer (AIS) in memory. This will enable the filtering of features and
* a more efficient display of data.
*/
export const loadAis = (aisData) => ({
    type: LOAD_AIS,
    aisData
});

/**
* Update the state with the selected features after clicking on the map. The GetFeatureInfo request
* can return more than one feature. We want to navigate through all the results in the plugin.
* @param {array} selectedFeatures an array of json object received from the getFeatureInfo() function & other info
*/
export const marineTrafficSelectedFeatures = (selectedFeatures) => ({
    type: MARINE_TRAFFIC_SELECTED_FEATURES,
    selectedFeatures
});

/**
* Update the state with the selected feature when it is selected
* @param {object} selectedFeature first json object received from the getFeatureInfo() function & other info
*/
export const marineTrafficSelectedFeature = (selectedFeature) => ({
    type: MARINE_TRAFFIC_SELECTED_FEATURE,
    selectedFeature
});

/**
* Action triggered by the user when clicking on the search button in the search section of the panel.
* @param {object} searchParam search parameter as an object {attribute: value}
*/
export const searchVessel = (searchParam) => ({
    type: MARINE_TRAFFIC_SEARCH_VESSEL,
    searchParam
});

/**
* Action triggered by the user extract a vessel history.
* @param {object} requestParams WFS request parameter as an object (vessel_id, from and to)
*/
export const extractHistory = (requestParams) => ({
    type: MARINE_TRAFFIC_EXTRACT_HISTORY,
    requestParams
});

/**
* Save the extracted vessel track history to the state.
* @param {object} trackHistory WFS features returned from the getFeature request.
*/
export const vesselHistory = (trackHistory) => ({
    type: MARINE_TRAFFIC_VESSEL_HISTORY,
    trackHistory
});

/**
* Add the marine traffic extraction to the map
* @param {object} extractionLayer
*/
export const addLayerToMap = (extractionLayer) => ({
    type: MARINE_TRAFFIC_ADD_LAYER_TO_MAP,
    extractionLayer
});

/**
* Change the loading status
* @param {bool} loading
*/
export const setMarineTrafficLoading = (loading) => ({
    type: MARINE_TRAFFIC_SET_LOADING,
    loading
});

/**
* Select the previous vessel
* @param {object} selectedFeature
*/
export const selectPreviousVessel = (selectedFeature) => ({
    type: MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL,
    selectedFeature
});

/**
* Select the next vessel
* @param {object} selectedFeature
*/
export const selectNextVessel = (selectedFeature) => ({
    type: MARINE_TRAFFIC_SELECT_NEXT_VESSEL,
    selectedFeature
});

/**
* Clear the selected features
*/
export const clearSelection = () => ({
    type: MARINE_TRAFFIC_CLEAR_SELECTION
});

export const SELECT_FEATURES = "ZONEIDENTIFY:SELECT_FEATURES";
export const SELECT_LAYER = "ZONEIDENTIFY:SELECT_LAYER";
export const FORMAT_SELECTION = "ZONEIDENTIFY:FORMAT_SELECTION";
export const HIGHLIGHT_SELECTED_FEATURE = "ZONEIDENTIFY:HIGHLIGHT_SELECTED_FEATURE";
export const ZOOM_TO_SELECTED_FEATURE = "ZONEIDENTIFY:ZOOM_TO_SELECTED_FEATURE";
export const ADD_LAYER_TO_MAP = "ZONEIDENTIFY:ADD_LAYER_TO_MAP";
export const SET_ZONE_IDENTIFY_LOADING = "ZONEIDENTIFY:SET_ZONE_IDENTIFY_LOADING";

/**
* Add the selected features to the state
* @param {string} selectedFeatures
*/
export const selectFeatures = (selectedFeatures) => ({
    type: SELECT_FEATURES,
    selectedFeatures
});

/**
* Add the selected layer to the state
* @param {string} selectedLayer
*/
export const selectLayer = (selectedLayer) => ({
    type: SELECT_LAYER,
    selectedLayer
});

/**
* Format the selection for the Tree view
* @param {string} formattedFeatures
*/
export const formatFeatures = (formattedFeatures) => ({
    type: FORMAT_SELECTION,
    formattedFeatures
});

/**
* Highlight the selected feature
* @param {string} selectedFeature
*/
export const highlightSelectedFeature = (selectedFeature) => ({
    type: HIGHLIGHT_SELECTED_FEATURE,
    selectedFeature
});

/**
* Zoom to the selected feature
* @param {string} selectedFeature
*/
export const zoomToSelectedFeature = (selectedFeature) => ({
    type: ZOOM_TO_SELECTED_FEATURE,
    selectedFeature
});

/**
* Add the selection polygon to the map as a layer.
* @param {string} layer
*/
export const addLayerToMap = (layer) => ({
    type: ADD_LAYER_TO_MAP,
    layer
});

/**
* Change the loading status
*/
export const setZoneIdentifyLoading = (loading) => ({
    type: SET_ZONE_IDENTIFY_LOADING,
    loading
});

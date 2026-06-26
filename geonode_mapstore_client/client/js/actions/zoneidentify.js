export const SELECT_FEATURES = "ZONEIDENTIFY:SELECT_FEATURES";
export const SELECT_LAYER = "ZONEIDENTIFY:SELECT_LAYER";
export const FORMAT_SELECTION = "ZONEIDENTIFY:FORMAT_SELECTION";
export const HIGHLIGHT_SELECTED_FEATURE = "ZONEIDENTIFY:HIGHLIGHT_SELECTED_FEATURE";
export const ZOOM_TO_SELECTED_FEATURE = "ZONEIDENTIFY:ZOOM_TO_SELECTED_FEATURE";
export const ADD_LAYER_TO_MAP = "ZONEIDENTIFY:ADD_LAYER_TO_MAP";
export const SET_ZONE_IDENTIFY_LOADING = "ZONEIDENTIFY:SET_ZONE_IDENTIFY_LOADING";
export const SET_GEOMETRY_COLUMNS = "ZONEIDENTIFY:SET_GEOMETRY_COLUMNS";
export const DESCRIBE_FEATURE_TYPE_ERROR = "ZONEIDENTIFY:DESCRIBE_FEATURE_TYPE_ERROR";

/**
 * Add the selected features to the state
 * @param {Array|null} selectedFeatures
 */
export const selectFeatures = (selectedFeatures) => ({
    type: SELECT_FEATURES,
    selectedFeatures
});

/**
 * Set the selected layer name(s) in the state
 * @param {string|null} selectedLayer
 */
export const selectLayer = (selectedLayer) => ({
    type: SELECT_LAYER,
    selectedLayer
});

/**
 * Store the tree-formatted features in the state
 * @param {Array|null} formattedFeatures
 */
export const formatFeatures = (formattedFeatures) => ({
    type: FORMAT_SELECTION,
    formattedFeatures
});

/**
 * Trigger highlight of a feature geometry on the map
 * @param {Object} selectedFeature - GeoJSON geometry object
 */
export const highlightSelectedFeature = (selectedFeature) => ({
    type: HIGHLIGHT_SELECTED_FEATURE,
    selectedFeature
});

/**
 * Trigger zoom to a feature geometry on the map
 * @param {Object} selectedFeature - GeoJSON geometry object
 */
export const zoomToSelectedFeature = (selectedFeature) => ({
    type: ZOOM_TO_SELECTED_FEATURE,
    selectedFeature
});

/**
 * Add the selection polygon to the map as a permanent layer
 * @param {Object} layer - GeoJSON geometry of the drawn extent
 */
export const addLayerToMap = (layer) => ({
    type: ADD_LAYER_TO_MAP,
    layer
});

/**
 * Set the loading state of the zone identify panel
 * @param {boolean} loading
 */
export const setZoneIdentifyLoading = (loading) => ({
    type: SET_ZONE_IDENTIFY_LOADING,
    loading
});

/**
 * Store the resolved geometry column name for each layer.
 * @param {Object} geometryColumns - map of { [layerName]: geometryColumnName }
 */
export const setGeometryColumns = (geometryColumns) => ({
    type: SET_GEOMETRY_COLUMNS,
    geometryColumns
});

/**
 * Signal that one or more DescribeFeatureType calls failed.
 * @param {string} error
 */
export const describeFeatureTypeError = (error) => ({
    type: DESCRIBE_FEATURE_TYPE_ERROR,
    error
});

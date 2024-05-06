export const SET_SHORELINE_REGION = "SHORELINE:SET_SHORELINE_REGION";
export const UPDATE_SHORELINE_SELECTED_MEDIA_TYPE = "SHORELINE:UPDATE_SHORELINE_SELECTED_MEDIA_TYPE";
export const SHORELINE_FEATURE_INFO_CLICK = "SHORELINE:SHORELINE_FEATURE_INFO_CLICK";
export const SHORELINE_SELECTED_FEATURE = "SHORELINE:SHORELINE_SELECTED_FEATURE";
export const LOAD_SELECTED_MEDIA_DATASET_FEATURES = "SHORELINE:LOAD_SELECTED_MEDIA_DATASET_FEATURES";
export const SELECT_FIRST_MEDIA_FEATURE = "SHORELINE:SELECT_FIRST_MEDIA_FEATURE";
export const SELECT_PREVIOUS_MEDIA_FEATURE = "SHORELINE:SELECT_PREVIOUS_MEDIA_FEATURE";
export const SELECT_NEXT_MEDIA_FEATURE = "SHORELINE:SELECT_NEXT_MEDIA_FEATURE";
export const SELECT_LAST_MEDIA_FEATURE = "SHORELINE:SELECT_LAST_MEDIA_FEATURE";


/**
* edit the selected region name for the shoreline viewer plugin in the state
* @param {string} selectedRegion
*/
export const setShorelineRegion = (selectedRegion) => ({
    type: SET_SHORELINE_REGION,
    selectedRegion
});

/**
* edit the selected media type (photo or video) to display on the map
* @param {string} selectedMediaType
*/
export const updateShorelineSelectedMediaType = (selectedMediaType) => ({
    type: UPDATE_SHORELINE_SELECTED_MEDIA_TYPE,
    selectedMediaType
});

/**
* Carries data needed for Get Feature Info request for the shoreline media layers
* @param {object} point point clicked in this shape {latlng: {lat:1, lng:2}, pixel:{x:33 y:33}, modifiers:{} }
* @param {array} layers the list of layers to query with the namespace
*/
export const shorelineFeatureInfoClick = (point, layers) => ({
    type: SHORELINE_FEATURE_INFO_CLICK,
    point,
    layers
});

/**
* Update the state with the selected feature when it is selected
* @param {object} selectedFeature json object received from the getFeatureInfo() function
* @param {string} selectedFeatureProjection projections corresponding to the query coordinates
*/
export const shorelineSelectedFeature = (selectedFeature, selectedFeatureProjection) => ({
    type: SHORELINE_SELECTED_FEATURE,
    selectedFeature,
    selectedFeatureProjection
});

/**
* Load the features from a media dataset into the state.
* @param {object} selectedMediaDatasetFeatures dict object containing the dataset objects of the selected media layer
*/
export const loadSelectedMediaDatasetFeatures = (selectedMediaDatasetFeatures) => ({
    type: LOAD_SELECTED_MEDIA_DATASET_FEATURES,
    selectedMediaDatasetFeatures
});

/**
* Change the selected media feature for the first in the dataset
*/
export const selectFirstMediaFeature = (selectedFeature) => ({
    type: SELECT_FIRST_MEDIA_FEATURE,
    selectedFeature
});

/**
* Change the selected media feature for the last in the dataset
*/
export const selectLastMediaFeature = (selectedFeature) => ({
    type: SELECT_LAST_MEDIA_FEATURE,
    selectedFeature
});

/**
* Change the selected media feature for the previous in the dataset
*/
export const selectPreviousMediaFeature = (selectedFeature) => ({
    type: SELECT_PREVIOUS_MEDIA_FEATURE,
    selectedFeature
});

/**
* Change the selected media feature for the next in the dataset
*/
export const selectNextMediaFeature = (selectedFeature) => ({
    type: SELECT_NEXT_MEDIA_FEATURE,
    selectedFeature
});

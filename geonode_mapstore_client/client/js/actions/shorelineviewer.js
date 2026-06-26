export const SET_SHORELINE_REGION = "SHORELINE:SET_SHORELINE_REGION";
export const ZOOM_TO_REGION = "SHORELINE:ZOOM_TO_REGION";
export const UPDATE_SHORELINE_SELECTED_MEDIA_TYPE = "SHORELINE:UPDATE_SHORELINE_SELECTED_MEDIA_TYPE";
export const SHORELINE_FEATURE_INFO_CLICK = "SHORELINE:SHORELINE_FEATURE_INFO_CLICK";
export const SHORELINE_SELECTED_FEATURE = "SHORELINE:SHORELINE_SELECTED_FEATURE";
export const SHORELINE_SELECTED_VIDEO = "SHORELINE:SHORELINE_SELECTED_VIDEO";
export const LOAD_SELECTED_MEDIA_DATASET_FEATURES = "SHORELINE:LOAD_SELECTED_MEDIA_DATASET_FEATURES";
export const SELECT_FIRST_MEDIA_FEATURE = "SHORELINE:SELECT_FIRST_MEDIA_FEATURE";
export const SELECT_PREVIOUS_MEDIA_FEATURE = "SHORELINE:SELECT_PREVIOUS_MEDIA_FEATURE";
export const SELECT_NEXT_MEDIA_FEATURE = "SHORELINE:SELECT_NEXT_MEDIA_FEATURE";
export const SELECT_LAST_MEDIA_FEATURE = "SHORELINE:SELECT_LAST_MEDIA_FEATURE";
export const SET_SHORELINE_LOADING = "SHORELINE:SET_SHORELINE_LOADING";
export const SET_SHORELINE_THEMATIC = "SHORELINE:SET_SHORELINE_THEMATIC";
export const UPDATE_VIDEO_TIME = "SHORELINE:UPDATE_VIDEO_TIME";
export const SET_VIDEO_INFORMATIONS = "SHORELINE:SET_VIDEO_INFORMATIONS";
export const UPDATE_VIDEO_INFORMATION = "SHORELINE:UPDATE_VIDEO_INFORMATION";
export const LOAD_VIDEO = "SHORELINE:LOAD_VIDEO";
export const VIDEO_ERROR = "SHORELINE:VIDEO_ERROR";

/**
 * Edit the selected region name for the shoreline viewer plugin in the state.
 * @param {object|null} selectedRegion - the region object or null to clear
 */
export const setShorelineRegion = (selectedRegion) => ({
    type: SET_SHORELINE_REGION,
    selectedRegion
});

/**
 * Zoom to the selected region, or to all regions if none is selected.
 */
export const zoomToRegion = () => ({
    type: ZOOM_TO_REGION
});

/**
 * Edit the selected media type (Photos or Videos) to display on the map.
 * @param {object|null} selectedMediaType
 */
export const updateShorelineSelectedMediaType = (selectedMediaType) => ({
    type: UPDATE_SHORELINE_SELECTED_MEDIA_TYPE,
    selectedMediaType
});

/**
 * Carry data needed for a GetFeatureInfo request for the shoreline media layers.
 * @param {object} point - { latlng: {lat, lng}, pixel: {x, y}, modifiers: {} }
 * @param {string[]} layers - list of layer names to query
 */
export const shorelineFeatureInfoClick = (point, layers) => ({
    type: SHORELINE_FEATURE_INFO_CLICK,
    point,
    layers
});

/**
 * Update the state with the selected feature.
 * @param {object|null} selectedFeature - feature info object or null to clear
 */
export const shorelineSelectedFeature = (selectedFeature) => ({
    type: SHORELINE_SELECTED_FEATURE,
    selectedFeature
});

/**
 * Update the state with the selected video URI.
 * @param {string|null} selectedVideo
 */
export const shorelineSelectedVideo = (selectedVideo) => ({
    type: SHORELINE_SELECTED_VIDEO,
    selectedVideo
});

/**
 * Load all features from a media dataset into the state.
 * @param {object|null} selectedMediaDatasetFeatures - GeoJSON FeatureCollection or null
 */
export const loadSelectedMediaDatasetFeatures = (selectedMediaDatasetFeatures) => ({
    type: LOAD_SELECTED_MEDIA_DATASET_FEATURES,
    selectedMediaDatasetFeatures
});

/**
 * Navigate to the first feature in the media dataset.
 * @param {object} selectedFeature - current feature (used to determine dataset)
 */
export const selectFirstMediaFeature = (selectedFeature) => ({
    type: SELECT_FIRST_MEDIA_FEATURE,
    selectedFeature
});

/**
 * Navigate to the last feature in the media dataset.
 * @param {object} selectedFeature
 */
export const selectLastMediaFeature = (selectedFeature) => ({
    type: SELECT_LAST_MEDIA_FEATURE,
    selectedFeature
});

/**
 * Navigate to the previous feature in the media dataset.
 * @param {object} selectedFeature
 */
export const selectPreviousMediaFeature = (selectedFeature) => ({
    type: SELECT_PREVIOUS_MEDIA_FEATURE,
    selectedFeature
});

/**
 * Navigate to the next feature in the media dataset.
 * @param {object} selectedFeature
 */
export const selectNextMediaFeature = (selectedFeature) => ({
    type: SELECT_NEXT_MEDIA_FEATURE,
    selectedFeature
});

/**
 * Set the loading state of the plugin panel.
 * @param {boolean} loading
 */
export const setShorelineLoading = (loading) => ({
    type: SET_SHORELINE_LOADING,
    loading
});

/**
 * Edit the selected shoreline classification style (thematic).
 * @param {object|null} selectedThematic
 */
export const setShorelineThematic = (selectedThematic) => ({
    type: SET_SHORELINE_THEMATIC,
    selectedThematic
});

/**
 * Change the current video time to select the corresponding point feature.
 * @param {number} videoTime - time in seconds
 */
export const updateVideoTime = (videoTime) => ({
    type: UPDATE_VIDEO_TIME,
    videoTime
});

/**
 * Replace the entire video informations object in the state.
 * @param {object|null} videoInformations
 */
export const setVideoInformations = (videoInformations) => ({
    type: SET_VIDEO_INFORMATIONS,
    videoInformations
});

/**
 * Update a single property of the video informations object.
 * @param {{ name: string, value: any }} videoInformation
 */
export const updateVideoInformation = (videoInformation) => ({
    type: UPDATE_VIDEO_INFORMATION,
    videoInformation
});

/**
 * Trigger loading of a video by file name.
 * @param {string} fileName
 */
export const loadVideo = (fileName) => ({
    type: LOAD_VIDEO,
    fileName
});

/**
 * Dispatch a video error notification.
 * @param {string} uid
 * @param {string} title
 * @param {string} message
 * @param {object} [values]
 */
export const videoError = (uid, title, message, values) => ({
    type: VIDEO_ERROR,
    uid,
    title,
    message,
    values
});

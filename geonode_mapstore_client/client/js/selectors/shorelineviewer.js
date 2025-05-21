import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("shorelineViewer");

/**
 * Gets the selected media type.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the selected media type (Photos or Videos)
 */
export const shorelineViewerRegionsSelector = state => state?.shorelineViewer?.selectedMediaType;

/**
 * Gets the selected region.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the selected region
 */
export const shorelineViewerRegionSelector = state => state?.shorelineViewer?.selectedRegion;

/**
 * Gets the selected thematic.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the selected thematic
 */
export const shorelineViewerThematicSelector = state => state?.shorelineViewer?.selectedThematic;

/**
 * Gets the coordinates of the click action.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the coordinates
 */
export const shorelineClickPointSelector = state => state && state.mapInfo && state.shorelineViewer.clickPoint;

/**
 * Gets the layers that can be queried by the user.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the layers
 */
export const shorelineClickLayerSelector = state => state && state.mapInfo && state.shorelineViewer.clickLayers;

/**
 * Gets selected feature (shoreline segment or media feature).
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the selected feature
 */
export const shorelineSelectedFeature = state => state?.shorelineViewer?.selectedFeature;

/**
 * Gets selected video.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {string} the selected video URL
 */
export const shorelineSelectedVideo = state => state?.shorelineViewer?.selectedVideo;

/**
 * Gets the selected feature in the layer corresponding to the selected media (photo or video) depending on the region.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the layers
 */
export const selectedMediaDatasetFeatures = state => state?.shorelineViewer?.selectedMediaDatasetFeatures;

/**
 * Gets the loading status of the plugin.
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the loading status
 */
export const shorelineLoading = state => state?.shorelineViewer?.loading;

/**
 * Update the video current time
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {int} the video time
 */
export const videoTime = state => state?.shorelineViewer?.videoTime;

/**
 * Update the video informations
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the video information
 */
export const videoInformations = state => state?.shorelineViewer?.videoInformations;

import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("shorelineViewer");

/**
 * Gets the selected media type
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the selected media type (Photos or Videos)
 */
export const shorelineViewerRegionsSelector = state => state?.shorelineViewer?.selectedMediaType;

/**
 * Gets the selected region
 * @memberof selectors.shorelineViewer
 * @param {object} state
 * @returns {object} the selected region
 */
export const shorelineViewerRegionSelector = state => state?.shorelineViewer?.selectedRegion;

export const shorelineClickPointSelector = state => state && state.mapInfo && state.shorelineViewer.clickPoint;
export const shorelineClickLayerSelector = state => state && state.mapInfo && state.shorelineViewer.clickLayers;
export const shorelineSelectedFeature = state => state?.shorelineViewer?.selectedFeature;
export const selectedMediaDatasetFeatures = state => state?.shorelineViewer?.selectedMediaDatasetFeatures;

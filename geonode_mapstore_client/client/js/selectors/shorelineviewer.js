import { createSelector } from 'reselect';
import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("shorelineViewer");

/**
 * Gets the selected media type.
 * @param {object} state
 * @returns {object|null} the selected media type (Photos or Videos)
 */
export const shorelineViewerMediaTypeSelector = (state) =>
    state?.shorelineViewer?.selectedMediaType;

/**
 * Gets the selected region.
 * @param {object} state
 * @returns {object|null}
 */
export const shorelineViewerRegionSelector = (state) =>
    state?.shorelineViewer?.selectedRegion;

/**
 * Gets the selected thematic.
 * @param {object} state
 * @returns {object|null}
 */
export const shorelineViewerThematicSelector = (state) =>
    state?.shorelineViewer?.selectedThematic;

/**
 * Gets the coordinates of the last click action.
 * @param {object} state
 * @returns {object|null}
 */
export const shorelineClickPointSelector = (state) =>
    state?.shorelineViewer?.clickPoint ?? null;

/**
 * Gets the layers that can be queried by the user.
 * @param {object} state
 * @returns {string[]}
 */
export const shorelineClickLayerSelector = (state) =>
    state?.shorelineViewer?.clickLayers ?? [];

/**
 * Gets the full selected feature context object
 * (includes selectedFeature, selectedLayer, selectedFeatureProjection, trigger).
 * @param {object} state
 * @returns {object|null}
 */
export const shorelineSelectedFeatureContextSelector = (state) =>
    state?.shorelineViewer?.selectedFeature;

/**
 * Gets only the GeoJSON feature from the selected feature context.
 * @param {object} state
 * @returns {object|null}
 */
export const shorelineSelectedFeatureSelector = (state) =>
    state?.shorelineViewer?.selectedFeature?.selectedFeature ?? null;

/**
 * Gets the selected layer name from the selected feature context.
 * @param {object} state
 * @returns {string|null}
 */
export const shorelineSelectedLayerSelector = (state) =>
    state?.shorelineViewer?.selectedLayer ?? null;

/**
 * Gets selected video URI.
 * @param {object} state
 * @returns {string|null}
 */
export const shorelineSelectedVideoSelector = (state) =>
    state?.shorelineViewer?.selectedVideo ?? null;

/**
 * Gets the features of the currently loaded media dataset.
 * @param {object} state
 * @returns {object|null} GeoJSON FeatureCollection
 */
export const selectedMediaDatasetFeaturesSelector = (state) =>
    state?.shorelineViewer?.selectedMediaDatasetFeatures ?? null;

/**
 * Gets the loading status of the plugin.
 * @param {object} state
 * @returns {boolean}
 */
export const shorelineLoadingSelector = (state) =>
    state?.shorelineViewer?.loading ?? false;

/**
 * Gets the current video time in seconds.
 * @param {object} state
 * @returns {number|null}
 */
export const videoTimeSelector = (state) =>
    state?.shorelineViewer?.videoTime ?? null;

/**
 * Gets the full video informations object.
 * @param {object} state
 * @returns {object|null}
 */
export const videoInformationsSelector = (state) =>
    state?.shorelineViewer?.videoInformations ?? null;

/**
 * Composed selector: true when plugin is enabled AND a region is selected.
 */
export const shorelineActiveSelector = createSelector(
    enabledSelector,
    shorelineViewerRegionSelector,
    (enabled, selectedRegion) => enabled && !!selectedRegion
);

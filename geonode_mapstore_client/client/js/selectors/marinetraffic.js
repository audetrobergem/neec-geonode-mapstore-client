import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';
import { createSelector } from 'reselect';

export const enabledSelector = createControlEnabledSelector("marineTraffic");

export const aisDataSelector = (state) => state?.marineTraffic?.aisData;
export const selectedFeaturesSelector = (state) => state?.marineTraffic?.selectedFeatures;
export const selectedFeatureSelector = (state) => state?.marineTraffic?.selectedFeature;

// Fixed: was incorrectly pointing to `vesselHistory` — the reducer key is `trackHistory`
export const trackHistorySelector = (state) => state?.marineTraffic?.trackHistory;
export const loadingSelector = (state) => state?.marineTraffic?.loading || false;

/**
 * Derived selector: index of the currently selected feature within the features array.
 * Returns -1 if nothing is selected.
 */
export const selectedFeatureIndexSelector = createSelector(
    [selectedFeaturesSelector, selectedFeatureSelector],
    (features, feature) => {
        if (!features || !feature) return -1;
        return features.findIndex(
            (f) => f.properties.identity_id === feature.properties.identity_id
        );
    }
);

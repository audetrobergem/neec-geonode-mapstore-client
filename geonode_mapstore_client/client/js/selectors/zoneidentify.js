import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("zoneIdentify");

export const zoneidentifySelectedLayer = state => state?.zoneIdentify?.selectedLayer;
export const zoneidentifySelectedFeatures = state => state?.zoneIdentify?.selectedFeatures;
export const zoneidentifyFormattedFeatures = state => state?.zoneIdentify?.formattedFeatures;
export const zoneidentifySelectedFeature = state => state?.zoneIdentify?.selectedFeature;
export const zoneidentifyExtentLayer = state => state?.zoneIdentify?.layer;
export const zoneidentifyLoading = state => state?.zoneIdentify?.loading;

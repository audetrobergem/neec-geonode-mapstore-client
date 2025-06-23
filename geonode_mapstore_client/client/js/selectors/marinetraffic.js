import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("marineTraffic");

export const aisData = state => state?.marineTraffic?.aisData;
export const selectedFeatures = state => state?.marineTraffic?.selectedFeatures;
export const selectedFeature = state => state?.marineTraffic?.selectedFeature;
export const vesselHistory = state => state?.marineTraffic?.vesselHistory;
export const loading = state => state?.marineTraffic?.loading;

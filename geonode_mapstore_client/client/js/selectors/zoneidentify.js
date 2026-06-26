import { createSelector } from 'reselect';
import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';

export const enabledSelector = createControlEnabledSelector("zoneIdentify");

export const zoneIdentifySelectedLayerSelector =
    (state) => state?.zoneIdentify?.selectedLayer;

export const zoneIdentifySelectedFeaturesSelector =
    (state) => state?.zoneIdentify?.selectedFeatures;

export const zoneIdentifyFormattedFeaturesSelector =
    (state) => state?.zoneIdentify?.formattedFeatures;

export const zoneIdentifyLoadingSelector =
    (state) => state?.zoneIdentify?.loading ?? false;

export const zoneIdentifyStyleSelector =
    (state) => mapLayoutValuesSelector(state, { height: true });

export const zoneIdentifyLayersSelector =
    (state) => state?.layers?.flat ?? [];

export const zoneIdentifyCurrentLanguageSelector =
    (state) => state?.locale?.current ?? 'en';

export const zoneIdentifyMessagesSelector =
    (state) => state?.locale?.messages;

export const zoneIdentifyGeometryColumnsSelector =
    (state) => state?.zoneIdentify?.geometryColumns ?? {};

// Composed selector: visible WMS layers that belong to neec_geodb and have no errors
export const zoneIdentifyVisibleWmsLayersSelector = createSelector(
    zoneIdentifyLayersSelector,
    (layers) =>
        layers.filter(
            (layer) =>
                layer.visibility === true &&
                layer.type === "wms" &&
                layer.group !== "background" &&
                layer.name.includes("neec_geodb") &&
                layer.loadingError !== "Error"
        )
);

import Rx from 'rxjs';
import axios from '@mapstore/framework/libs/ajax';
import uuid from 'uuid';

import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import {
    registerEventListener,
    unRegisterEventListener,
    zoomToExtent,
    CLICK_ON_MAP
} from '@mapstore/framework/actions/map';
import { mapLayoutSelector, boundingSidebarRectSelector } from '@mapstore/framework/selectors/maplayout';
import { LayoutSections } from '@js/utils/LayoutUtils';
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';
import { getFeature } from '@mapstore/framework/api/WFS';
import { removeAdditionalLayer, updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import { addLayer, removeLayer } from '@mapstore/framework/actions/layers';
import { projectionSelector } from '@mapstore/framework/selectors/map';
import { updatePointWithGeometricFilter } from '@mapstore/framework/utils/IdentifyUtils';
import { getFeatureInfo } from '@mapstore/framework/api/identify';
import { error, warning } from '@mapstore/framework/actions/notifications';

import {
    addLayerToMap,
    extractHistory,
    loadAis,
    LOAD_AIS,
    setMarineTrafficLoading,
    MARINE_TRAFFIC_ADD_LAYER_TO_MAP,
    MARINE_TRAFFIC_CLEAR_SELECTION,
    MARINE_TRAFFIC_EXTRACT_HISTORY,
    MARINE_TRAFFIC_SEARCH_VESSEL,
    MARINE_TRAFFIC_SELECTED_FEATURE,
    MARINE_TRAFFIC_SELECTED_FEATURES,
    marineTrafficSelectedFeature,
    marineTrafficSelectedFeatures,
    vesselHistory
} from '@js/actions/marinetraffic';

// ─── Constants ────────────────────────────────────────────────────────────────

const AIS_LAYER_NAME = 'neec_geodb:marine_traffic_ca';
const AIS_LAYER_ID = 'marine-traffic';
const MAP_LAYOUT = { left: { sm: 300, md: 500, lg: 600 }, right: { md: 550 }, bottom: { sm: 30 } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a WMS GetFeatureInfo request params object.
 */
const buildGetFeatureInfoParams = ({ accessToken, mapExtent, mapSize, point }) => {
    const mapBbox = [
        mapExtent.bounds.minx,
        mapExtent.bounds.miny,
        mapExtent.bounds.maxx,
        mapExtent.bounds.maxy
    ].join(',');

    return {
        service: 'WMS',
        version: '1.1.1',
        request: 'GetFeatureInfo',
        info_format: 'application/json',
        feature_count: 10,
        layers: AIS_LAYER_NAME,
        query_layers: AIS_LAYER_NAME,
        access_token: accessToken,
        bbox: mapBbox,
        srs: mapExtent.crs,
        x: String(parseInt(point.pixel.x, 10)),
        y: String(parseInt(point.pixel.y, 10)),
        height: String(mapSize.height),
        width: String(mapSize.width)
    };
};

/**
 * Build the WMS layer descriptor added when the plugin opens.
 */
const buildAisWmsLayer = ({ geoserverUrl, accessToken }) => ({
    id: AIS_LAYER_ID,
    type: 'wms',
    url: `${geoserverUrl}wms`,
    name: AIS_LAYER_NAME,
    format: 'image/png8',
    tiled: false,
    singleTile: true,
    params: { access_token: accessToken },
    title: {
        "default": 'RESTRICTED Marine traffic (AIS)',
        en: 'RESTRICTED Marine traffic (AIS)',
        fr: 'Traffic maritime (SIA) RESTREINT'
    },
    visibility: true,
    enableInteractiveLegend: true,
    expanded: true,
    refresh: 60000,
    maxResolution: 2445.98490512564,
    localizedLayerStyles: true,
    style: 'marine_traffic_plugin'
});

// ─── Epics ────────────────────────────────────────────────────────────────────

/**
 * Override the map layout right offset when the marine traffic panel is open,
 * so that map controls are not obscured by the panel.
 */
export const gnUpdateMarineTrafficMapLayoutEpic = (action$, store) =>
    action$
        .ofType(UPDATE_MAP_LAYOUT)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .filter(({ source }) => source !== LayoutSections.PANEL)
        .map(({ layout }) => {
            const state = store.getState();
            const boundingSidebarRect = boundingSidebarRectSelector(state);
            const drawerOpen = !!state?.controls?.drawer?.enabled;
            const leftOverride = drawerOpen ? { left: MAP_LAYOUT.left.sm } : {};

            return {
                ...updateMapLayout({
                    ...mapLayoutSelector(state),
                    ...layout,
                    right: MAP_LAYOUT.right.md,
                    ...leftOverride,
                    boundingMapRect: {
                        ...(layout?.boundingMapRect ?? {}),
                        right: MAP_LAYOUT.right.md,
                        ...leftOverride
                    },
                    boundingSidebarRect: {
                        ...boundingSidebarRect,
                        ...layout.boundingSidebarRect
                    }
                }),
                source: LayoutSections.PANEL // prevent infinite loop
            };
        });

/**
 * When the plugin panel is opened:
 * - Fetch AIS identity data (vessel list for search autocomplete)
 * - Disable the default GetFeatureInfo click handler
 * - Register our own click listener
 * - Add the AIS WMS layer
 *
 * Filters specifically on `enabled === true` (boolean) to avoid triggering on close.
 */
export const openMarineTrafficPluginEpic = (action$, store) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter(
            (action) =>
                action.control === 'marineTraffic' &&
                action.property === 'enabled' &&
                action.value === true
        )
        .switchMap(() => {
            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;

            const wfsParams = {
                service: 'WFS',
                version: '1.1.0',
                request: 'GetFeature',
                outputFormat: 'application/json',
                access_token: accessToken,
                propertyName: 'identity_id,identity_name,mmsi,imo'
            };

            return Rx.Observable.fromPromise(
                getFeature(`${geoserverUrl}wfs`, AIS_LAYER_NAME, wfsParams)
            )
                .switchMap((resp) => {
                    const commonActions = [
                        purgeMapInfoResults(),
                        hideMapinfoMarker(),
                        toggleMapInfoState(),
                        registerEventListener('click', 'marineTraffic')
                    ];

                    // GeoServer returns an HTML error page as a string on auth/config errors
                    if (typeof resp.data === 'string') {
                        return Rx.Observable.of(
                            ...commonActions,
                            error({
                                uid: 'aisDataLoadingError',
                                title: 'marineTraffic.notifications.error',
                                message: 'marineTraffic.notifications.aisDataLoadingError',
                                action: { label: 'marineTraffic.notifications.close' },
                                position: 'tr',
                                autoDismiss: 0
                            })
                        );
                    }

                    return Rx.Observable.of(
                        ...commonActions,
                        addLayer(buildAisWmsLayer({ geoserverUrl, accessToken })),
                        loadAis(resp.data)
                    );
                })
                .catch((err) =>
                    Rx.Observable.of(
                        setMarineTrafficLoading(false),
                        error({
                            uid: 'aisDataLoadingError',
                            title: 'marineTraffic.notifications.error',
                            message: err.message || 'marineTraffic.notifications.aisDataLoadingError',
                            action: { label: 'marineTraffic.notifications.close' },
                            position: 'tr',
                            autoDismiss: 0
                        })
                    )
                );
        });

/**
 * When the plugin panel is closed:
 * - Re-enable the default GetFeatureInfo click handler
 * - Unregister our click listener
 * - Remove all layers and additional layers created by the plugin
 * - Reset plugin state
 */
export const closeMarineTrafficPluginEpic = (action$) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter(
            (action) =>
                action.control === 'marineTraffic' &&
                action.property === 'enabled' &&
                action.value === false
        )
        .switchMap(() =>
            Rx.Observable.of(
                removeAdditionalLayer({ owner: 'marineTraffic' }),
                removeLayer(AIS_LAYER_ID),
                loadAis(null),
                extractHistory(null),
                marineTrafficSelectedFeatures(null),
                marineTrafficSelectedFeature(null),
                vesselHistory(null),
                addLayerToMap(null),
                setMarineTrafficLoading(false),
                toggleMapInfoState(),
                unRegisterEventListener('click', 'marineTraffic')
            )
        );

/**
 * Handle map clicks when the plugin is active.
 * Issues a WMS GetFeatureInfo request and dispatches the features found.
 */
export const clickOnMapEpic = (action$, store) =>
    action$
        .ofType(CLICK_ON_MAP)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .switchMap(({ point }) => {
            const state = store.getState();
            const projection = projectionSelector(state);
            const updatedPoint = updatePointWithGeometricFilter(point, projection);

            // Guard: the WMS layer may not be present if it failed to load
            const wmsLayer = state.layers?.flat?.find((l) => l.id === AIS_LAYER_ID);
            if (!wmsLayer?.url) return Rx.Observable.empty();

            const params = buildGetFeatureInfoParams({
                accessToken: state.security?.user?.info?.access_token,
                mapExtent: state.map.present.bbox,
                mapSize: state.map.present.size,
                point: updatedPoint
            });

            return getFeatureInfo(wmsLayer.url, params, AIS_LAYER_NAME)
                .switchMap((response) => {
                    if (response.features?.length > 0) {
                        return Rx.Observable.of(
                            marineTrafficSelectedFeatures(response.features)
                        );
                    }
                    return Rx.Observable.empty();
                })
                .catch(() => Rx.Observable.empty());
        });

/**
 * When a list of features is selected, automatically select the first one.
 */
export const selectedFeaturesEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SELECTED_FEATURES)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            const first = Array.isArray(action.selectedFeatures)
                ? action.selectedFeatures[0]
                : action.selectedFeatures; // null passthrough

            return Rx.Observable.of(marineTrafficSelectedFeature(first));
        });

/**
 * Search for a vessel by attribute/value and zoom to it on the map.
 */
export const searchVesselEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SEARCH_VESSEL)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;

            const wfsParams = {
                service: 'WFS',
                version: '1.1.0',
                request: 'GetFeature',
                outputFormat: 'application/json',
                access_token: accessToken,
                CQL_FILTER: `${action.searchParam.attribute} = '${action.searchParam.value}'`
            };

            return Rx.Observable.fromPromise(
                getFeature(`${geoserverUrl}wfs`, AIS_LAYER_NAME, wfsParams)
            )
                .switchMap((resp) => {
                    const features = resp.data?.features;
                    if (!features?.length) {
                        return Rx.Observable.of(
                            warning({
                                uid: 'searchNoResult',
                                title: 'marineTraffic.notifications.warning',
                                message: 'marineTraffic.notifications.noVesselFound',
                                action: { label: 'marineTraffic.notifications.close' },
                                position: 'tr',
                                autoDismiss: 5
                            })
                        );
                    }

                    const feature = features[0];
                    const extent = [
                        feature.properties.lon,
                        feature.properties.lat,
                        feature.properties.lon,
                        feature.properties.lat
                    ];

                    return Rx.Observable.of(
                        marineTrafficSelectedFeatures(features),
                        zoomToExtent(extent, 'EPSG:4326', 15)
                    );
                })
                .catch((err) =>
                    Rx.Observable.of(
                        error({
                            uid: 'searchVesselError',
                            title: 'marineTraffic.notifications.error',
                            message: err.message || 'marineTraffic.notifications.searchError',
                            action: { label: 'marineTraffic.notifications.close' },
                            position: 'tr',
                            autoDismiss: 0
                        })
                    )
                );
        });

/**
 * When a single feature is selected, update the map's additional overlay layer
 * to highlight it with the directional AIS icon.
 */
export const selectedFeatureEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SELECTED_FEATURE)
        .filter((action) => !!action.selectedFeature)
        .switchMap((action) => {
            const state = store.getState();
            const { lon, lat, course } = action.selectedFeature.properties;

            return Rx.Observable.of(
                vesselHistory(null),
                updateAdditionalLayer(
                    'marine-traffic-selected-feature',
                    'marineTraffic',
                    'overlay',
                    {
                        id: 'marine-traffic-selected-feature',
                        name: 'marine-traffic-selected-feature',
                        type: 'vector',
                        features: [
                            {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: action.selectedFeature.geometry.type,
                                    coordinates: [lon, lat]
                                }
                            }
                        ],
                        style: {
                            format: 'geostyler',
                            body: {
                                rules: [
                                    {
                                        symbolizers: [
                                            {
                                                kind: 'Icon',
                                                size: 24,
                                                image: `${state.gnsettings?.geonodeUrl}static/mapstore/symbols/ais-selected.png`,
                                                rotate: course
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                )
            );
        });

/**
 * Fetch vessel navigation history from the GeoNode proxy endpoint.
 * Errors from axios are caught and shown as notifications.
 */
export const extractHistoryEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_EXTRACT_HISTORY)
        .filter((action) => !!action.requestParams)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const { identityId, startDate, endDate } = action.requestParams;
            const url = `${state.gnsettings?.geonodeUrl}marine-traffic-proxy/${identityId}&${startDate}&${endDate}`;

            return Rx.Observable.defer(() => axios.get(url))
                .switchMap((response) => {
                    if (!response.data?.features?.length) {
                        return Rx.Observable.of(
                            warning({
                                uid: 'warningMessage',
                                title: 'marineTraffic.notifications.warning',
                                message: 'marineTraffic.notifications.warningMessage',
                                action: { label: 'marineTraffic.notifications.close' },
                                position: 'tr',
                                autoDismiss: 0
                            })
                        );
                    }

                    return Rx.Observable.of(vesselHistory(response.data));
                })
                .catch((err) =>
                    Rx.Observable.of(
                        error({
                            uid: 'extractHistoryError',
                            title: 'marineTraffic.notifications.error',
                            message: err.message || 'marineTraffic.notifications.extractHistoryError',
                            action: { label: 'marineTraffic.notifications.close' },
                            position: 'tr',
                            autoDismiss: 0
                        })
                    )
                );
        });

/**
 * Add the vessel history extraction as a permanent vector layer on the map.
 */
export const addVesselExtractionToMapEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_ADD_LAYER_TO_MAP)
        .filter((action) => !!action.extractionLayer)
        .switchMap((action) => {
            const state = store.getState();
            const geonodeUrl = state.gnsettings?.geonodeUrl;

            const geojsonFeatures = action.extractionLayer.features.map((feature, index) => ({
                ...feature,
                properties: {
                    ...feature.properties,
                    id: index + 1,
                    meta_data: undefined // strip large metadata field
                }
            }));

            const extractionLayer = {
                id: `marineTraffic:${uuid()}`,
                title: action.extractionLayer.layerTitle,
                type: 'vector',
                features: geojsonFeatures,
                style: {
                    format: 'geostyler',
                    body: {
                        rules: [
                            {
                                symbolizers: [
                                    {
                                        kind: 'Icon',
                                        size: 15,
                                        image: `${geonodeUrl}static/mapstore/symbols/ais.png`,
                                        rotate: {
                                            name: 'property',
                                            args: ['course']
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },
                visibility: true,
                invalidFeatures: null
            };

            return Rx.Observable.of(addLayer(extractionLayer));
        });

/**
 * Show loading indicator when the plugin open action is dispatched.
 * Specifically filtered to the open event only (value === true).
 */
export const marineTrafficStartLoadingEpic = (action$) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter(
            (action) =>
                action.control === 'marineTraffic' &&
                action.property === 'enabled' &&
                action.value === true
        )
        .mapTo(setMarineTrafficLoading(true));

/**
 * Hide loading indicator once AIS data has been loaded into state.
 */
export const marineTrafficStopLoadingEpic = (action$, store) =>
    action$
        .ofType(LOAD_AIS)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .mapTo(setMarineTrafficLoading(false));

/**
 * Clear the vessel selection: remove the highlight overlay and reset state.
 * The MARINE_TRAFFIC_CLEAR_SELECTION reducer also resets state fields directly,
 * but we still need the side-effect of removing the additional layer from the map.
 */
export const removeSelectionEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_CLEAR_SELECTION)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .mapTo(removeAdditionalLayer({ owner: 'marineTraffic' }));

export default {
    gnUpdateMarineTrafficMapLayoutEpic,
    openMarineTrafficPluginEpic,
    closeMarineTrafficPluginEpic,
    clickOnMapEpic,
    selectedFeaturesEpic,
    searchVesselEpic,
    selectedFeatureEpic,
    extractHistoryEpic,
    addVesselExtractionToMapEpic,
    marineTrafficStartLoadingEpic,
    marineTrafficStopLoadingEpic,
    removeSelectionEpic
};

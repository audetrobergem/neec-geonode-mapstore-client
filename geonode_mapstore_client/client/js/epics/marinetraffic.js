/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import axios from '@mapstore/framework/libs/ajax';
import uuid from "uuid";
import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import { registerEventListener, unRegisterEventListener, zoomToExtent, CLICK_ON_MAP } from '@mapstore/framework/actions/map';
import { mapLayoutSelector, boundingSidebarRectSelector } from '@mapstore/framework/selectors/maplayout';
import { getConfigProp } from "@mapstore/framework/utils/ConfigUtils";
import { LayoutSections } from "@js/utils/LayoutUtils";
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';
import { getFeature } from '@mapstore/framework/api/WFS';
import { removeAdditionalLayer, updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import { addLayer, LAYER_LOAD } from '@mapstore/framework/actions/layers';
import {
    addLayerToMap,
    loadAis,
    setMarineTrafficLoading,
    extractHistory,
    MARINE_TRAFFIC_ADD_LAYER_TO_MAP,
    MARINE_TRAFFIC_EXTRACT_HISTORY,
    MARINE_TRAFFIC_SEARCH_VESSEL,
    MARINE_TRAFFIC_SELECTED_FEATURE,
    marineTrafficSelectedFeatures,
    marineTrafficSelectedFeature,
    vesselHistory,
    MARINE_TRAFFIC_SELECTED_FEATURES,
    MARINE_TRAFFIC_SELECT_NEXT_VESSEL,
    MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL
} from '@js/actions/marinetraffic';
import { projectionSelector } from '@mapstore/framework/selectors/map';
import { updatePointWithGeometricFilter } from "@mapstore/framework/utils/IdentifyUtils";
import { getFeatureInfo } from '@mapstore/framework/api/identify';
import { error, warning } from '@mapstore/framework/actions/notifications';

/**
 * Override the layout to get the correct right offset when the data catalog is open
 */
export const gnUpdateMarineTrafficMapLayoutEpic = (action$, store) =>
    action$
        .ofType(UPDATE_MAP_LAYOUT)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .filter(({ source }) => {
            return source !== LayoutSections.PANEL;
        })
        .map(({ layout }) => {
            const mapLayout = getConfigProp('mapLayout') || { left: { sm: 300, md: 500, lg: 600 }, right: { md: 658 }, bottom: { sm: 30 } };
            const boundingSidebarRect = boundingSidebarRectSelector(store.getState());
            const left = !!store.getState()?.controls?.drawer?.enabled ? mapLayout.left.sm : null;
            const action = updateMapLayout({
                ...mapLayoutSelector(store.getState()),
                ...layout,
                right: mapLayout.right.md,
                ...(left && {left}),
                boundingMapRect: {
                    ...(layout?.boundingMapRect || {}),
                    right: mapLayout.right.md,
                    ...(left && {left})
                },
                boundingSidebarRect: {
                    ...boundingSidebarRect,
                    ...layout.boundingSidebarRect
                }
            });
            return { ...action, source: LayoutSections.PANEL }; // add an argument to avoid infinite loop.
        });

/**
 * This function is triggered when the user opens the plugin. It disables the entity identification tool
 * and registers a click event listener, enabling control of the user's click action.
 * @param {external:Observable} action$ manages `SET_CONTROL_PROPERTY`
 * @returns {external:Observable} `PURGE_MAPINFO_RESULTS`, `HIDE_MAPINFO_MARKER`, `TOGGLE_MAPINFO_STATE`,
 * `REGISTER_EVENT_LISTENER`, `UPDATE_ADDITIONAL_LAYER`
 */
export const openMarineTrafficPluginEpic = (action$, store) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "marineTraffic")
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const requestUrl = `${geoserverUrl}wfs`;
            let wfsParams = {
                service: "WFS",
                version: "1.1.0",
                request: "GetFeature",
                outputFormat: "application/json",
                access_token: accessToken,
                propertyName: "identity_id,identity_name,mmsi,imo"
            };
            return Rx.Observable.fromPromise(getFeature(requestUrl, "neec_geodb:marine_traffic_ca", wfsParams))
                .switchMap((resp) => {
                    if (typeof resp.data === "string") {
                        return Rx.Observable.of(
                            purgeMapInfoResults(),
                            hideMapinfoMarker(),
                            toggleMapInfoState(),
                            registerEventListener('click', 'marineTraffic'),
                            error({
                                uid: "aisDataLoadingError",
                                title: "marineTraffic.notifications.error",
                                message: "marineTraffic.notifications.aisDataLoadingError",
                                action: {
                                    label: "marineTraffic.notifications.close"
                                },
                                position: "tr",
                                autoDismiss: 0
                            })
                        );
                    }

                    return Rx.Observable.of(
                        purgeMapInfoResults(),
                        hideMapinfoMarker(),
                        toggleMapInfoState(),
                        registerEventListener('click', 'marineTraffic'),
                        updateAdditionalLayer(
                            "marine-traffic-layer",
                            "marineTraffic",
                            'overlay',
                            {
                                type: "wms",
                                url: `${geoserverUrl}wms`,
                                name: "neec_geodb:marine_traffic_ca",
                                format: "image/png8",
                                singleTile: true,
                                params: {
                                    access_token: accessToken
                                }
                            }
                        ),
                        loadAis(resp.data)
                    );

                });
        });

/**
 * This function is triggered when the user closes the plugin. The identification tool is reactivated
 * and the click event listener is removed. All additional layers created by the plugin are removed
 * and several state variables are set no null.
 * @param {external:Observable} action$ manages `SET_CONTROL_PROPERTY`
 * @returns {external:Observable} `REMOVE_ADDITIONAL_LAYER`, `TOGGLE_MAPINFO_STATE`, `UNREGISTER_EVENT_LISTENER`
 */
export const closeMarineTrafficPluginEpic = (action$) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "marineTraffic")
        .filter((action) => action.property === "enabled" && action.value === false)
        .switchMap(() => {
            return Rx.Observable.of(
                removeAdditionalLayer({ owner: "marineTraffic" }),
                loadAis(null),
                extractHistory(null),
                marineTrafficSelectedFeatures(null),
                marineTrafficSelectedFeature(null),
                vesselHistory(null),
                addLayerToMap(null),
                toggleMapInfoState(),
                unRegisterEventListener('click', 'shorelineViewer')
            );
        });

/**
 * This function is triggered when the user clicks on the map to identify the
 * features located at the point clicked by the user.
 * @param {external:Observable} action$ manages `CLICK_ON_MAP`
 * @returns {external:Observable} `MARINE_TRAFFIC_SELECTED_FEATURE`
 */
export const clickOnMapEpic = (action$, store) =>
    action$
        .ofType(CLICK_ON_MAP)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap(({ point }) => {
            const state = store.getState();
            const marineTrafficLayer = "neec_geodb:marine_traffic_ca";
            const projection = projectionSelector(store.getState());
            const updatedPoint = updatePointWithGeometricFilter(point, projection);
            const accessToken = state.security?.user?.info?.access_token;
            const mapExtent = state.map.present.bbox;
            const mapSize = state.map.present.size;
            const url = state.additionallayers.filter(
                (additionalLayer) => additionalLayer.id.includes("marine-traffic-layer"))[0].options.url;
            if (url) {
                const mapBbox = [
                    mapExtent.bounds.minx,
                    mapExtent.bounds.miny,
                    mapExtent.bounds.maxx,
                    mapExtent.bounds.maxy
                ];
                const x = parseInt(updatedPoint.pixel.x, 10);
                const y = parseInt(updatedPoint.pixel.y, 10);
                const params = {
                    service: "WMS",
                    version: "1.1.1",
                    request: "GetFeatureInfo",
                    info_format: "application/json",
                    feature_count: 10,
                    layers: marineTrafficLayer,
                    query_layers: marineTrafficLayer,
                    access_token: accessToken,
                    bbox: `${mapBbox}`,
                    srs: `${mapExtent.crs}`,
                    x: `${x}`,
                    y: `${y}`,
                    height: `${mapSize.height}`,
                    width: `${mapSize.width}`
                };
                return getFeatureInfo(url, params, marineTrafficLayer)
                    .switchMap((response) => {
                        if (response.features.length > 0) {
                            return Rx.Observable.of(
                                marineTrafficSelectedFeatures(response.features)
                            );
                        }
                        return Rx.Observable.empty();
                    });
            }
            return Rx.Observable.empty();
        });

/**
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_SELECTED_FEATURES`
 * @returns {external:Observable} `MARINE_TRAFFIC_SELECTED_FEATURE`
 */
export const selectedFeaturesEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SELECTED_FEATURES)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            if (Array.isArray(action.selectedFeatures)) {
                return Rx.Observable.of(
                    marineTrafficSelectedFeature(action.selectedFeatures[0])
                );
            }

            return Rx.Observable.of(
                marineTrafficSelectedFeature(action.selectedFeatures)
            );

        });

/**
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_SEARCH_VESSEL`
 * @returns {external:Observable} `MARINE_TRAFFIC_SELECTED_FEATURE`, `ZOOM_TO_EXTENT`
 */
export const searchVesselEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SEARCH_VESSEL)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const requestUrl = `${geoserverUrl}wfs`;
            let wfsParams = {
                service: "WFS",
                version: "1.1.0",
                request: "GetFeature",
                outputFormat: "application/json",
                access_token: accessToken,
                CQL_FILTER: `${action.searchParam.attribute} = '${action.searchParam.value}'`
            };
            return Rx.Observable.fromPromise(getFeature(requestUrl, "neec_geodb:marine_traffic_ca", wfsParams))
                .switchMap((resp) => {
                    const feature = resp.data.features[0];
                    const featureExtent = [feature.properties.lon, feature.properties.lat, feature.properties.lon, feature.properties.lat];
                    return Rx.Observable.of(
                        marineTrafficSelectedFeatures(resp.data.features),
                        zoomToExtent(featureExtent, "EPSG:4326", 15)
                    );
                });
        });

/**
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_SELECTED_FEATURE`
 * @returns {external:Observable} `UPDATE_ADDITIONAL_FEATURE`
 */
export const selectedFeatureEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SELECTED_FEATURE)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            return Rx.Observable.of(
                vesselHistory(null),
                updateAdditionalLayer(
                    "marine-traffic-selected-feature",
                    "marineTraffic",
                    'overlay',
                    {
                        id: "marine-traffic-selected-feature",
                        name: "marine-traffic-selected-feature",
                        type: "vector",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: action.selectedFeature.geometry.type,
                                    coordinates: [
                                        action.selectedFeature.properties.lon,
                                        action.selectedFeature.properties.lat
                                    ]
                                }
                            }
                        ],
                        style: {
                            format: "geostyler",
                            body: {
                                rules: [
                                    {
                                        symbolizers: [
                                            {
                                                kind: "Icon",
                                                size: 24,
                                                image: `${state.gnsettings?.geonodeUrl}static/mapstore/symbols/ais-selected.png`,
                                                rotate: action.selectedFeature.properties.course
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
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_EXTRACT_HISTORY`
 * @returns {external:Observable} `MARINE_TRAFFIC_VESSEL_HISTORY`
 */
export const extractHistoryEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_EXTRACT_HISTORY)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const requestParams = action.requestParams;
            return Rx.Observable.fromPromise(
                axios.get(`${state.gnsettings?.geonodeUrl}marine-traffic-proxy/${requestParams.identityId}&${requestParams.startDate}&${requestParams.endDate}`)
                    .catch(response => {
                        return (
                            error({
                                uid: "extractHistoryError",
                                title: "marineTraffic.notifications.error",
                                message: response.originalError.message,
                                action: {
                                    label: "marineTraffic.notifications.close"
                                },
                                position: "tr",
                                autoDismiss: 0
                            })
                        );
                    })
            )
                .switchMap((response) => {
                    if (response.data.features.length > 0) {
                        return Rx.Observable.of(
                            vesselHistory(response.data)
                        );
                    }

                    return Rx.Observable.of(
                        warning(
                            {
                                uid: "warningMessage",
                                title: "marineTraffic.notifications.warning",
                                message: "marineTraffic.notifications.warningMessage",
                                action: {
                                    label: "marineTraffic.notifications.close"
                                },
                                position: "tr",
                                autoDismiss: 0
                            }
                        )
                    );


                });
        });

/**
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_ADD_LAYER_TO_MAP`
 * @returns {external:Observable} `ADD_LAYER`
 */
export const addVesselExtractionToMapEpic = (action$) =>
    action$
        .ofType(MARINE_TRAFFIC_ADD_LAYER_TO_MAP)
        .filter((action) => action.extractionLayer)
        .switchMap((action) => {
            const extentLayer = {
                id: "marineTraffic:" + uuid(),
                title: action.extractionLayer.layerTitle,
                type: "vector",
                features: action.extractionLayer.features,
                style: {
                    format: "geostyler",
                    body: {
                        rules: [
                            {
                                symbolizers: [
                                    {
                                        kind: "Icon",
                                        size: 15,
                                        image: `${state.gnsettings?.geonodeUrl}static/mapstore/symbols/ais.png`,
                                        rotate: {
                                            name: "property",
                                            args: [
                                                "course"
                                            ]
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
            return Rx.Observable.of(
                addLayer(extentLayer)
            );
        });

/**
 * This function is triggered when the loading of a layer displayed from the shoreline viewer
 * plugin begins. It displays a loader in the plugin panel.
 * @param {external:Observable} action$ manages `LAYER_LOADING`
 * @returns {external:Observable} `SET_SHORELINE_LOADING`
 */
export const marineTrafficStartLoadingEpic = (action$, store) =>
    action$
        .ofType(UPDATE_MAP_LAYOUT)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .switchMap(() => {
            return Rx.Observable.of(
                setMarineTrafficLoading(true)
            );
        });

/**
 * This function is triggered when the loading of a layer displayed from the shoreline viewer
 * plugin ends. It hides a loader in the plugin panel.
 * @param {external:Observable} action$ manages `LAYER_LOADING`
 * @returns {external:Observable} `SET_SHORELINE_LOADING`
 */
export const marineTrafficStopLoadingEpic = (action$, store) =>
    action$
        .ofType(LAYER_LOAD)
        .filter(() => store.getState()?.controls?.marineTraffic?.enabled)
        .filter((action) => !action.layerId)
        .switchMap(() => {
            return Rx.Observable.of(
                setMarineTrafficLoading(false)
            );
        });

/**
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL`
 * @returns {external:Observable} `MARINE_TRAFFIC_SELECTED_FEATURE`
 */
export const selectedPreviousFeatureEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            return Rx.Observable.of(
                marineTrafficSelectedFeature(action.selectedFeature)
            );
        });

/**
 *
 * @param {external:Observable} action$ manages `MARINE_TRAFFIC_SELECT_NEXT_VESSEL`
 * @returns {external:Observable} `MARINE_TRAFFIC_SELECTED_FEATURE`
 */
export const selectedNextFeatureEpic = (action$, store) =>
    action$
        .ofType(MARINE_TRAFFIC_SELECT_NEXT_VESSEL)
        .filter(() => store.getState().controls?.marineTraffic?.enabled)
        .switchMap((action) => {
            return Rx.Observable.of(
                marineTrafficSelectedFeature(action.selectedFeature)
            );
        });

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
    selectedPreviousFeatureEpic,
    selectedNextFeatureEpic
};

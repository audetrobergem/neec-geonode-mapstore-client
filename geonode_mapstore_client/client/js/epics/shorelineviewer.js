/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import axios from '@mapstore/framework/libs/ajax';

import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import { registerEventListener, unRegisterEventListener, zoomToExtent, CLICK_ON_MAP } from '@mapstore/framework/actions/map';
import { LAYER_LOAD, LAYER_LOADING } from '@mapstore/framework/actions/layers';
import { removeAdditionalLayer, updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';
import { error } from '@mapstore/framework/actions/notifications';
import {
    setShorelineRegion,
    updateShorelineSelectedMediaType,
    shorelineFeatureInfoClick,
    shorelineSelectedFeature,
    loadSelectedMediaDatasetFeatures,
    setShorelineLoading,
    setShorelineThematic,
    setVideoInformations,
    SET_SHORELINE_REGION,
    loadVideo,
    UPDATE_SHORELINE_SELECTED_MEDIA_TYPE,
    SHORELINE_FEATURE_INFO_CLICK,
    SHORELINE_SELECTED_FEATURE,
    SELECT_FIRST_MEDIA_FEATURE,
    SELECT_PREVIOUS_MEDIA_FEATURE,
    SELECT_NEXT_MEDIA_FEATURE,
    SELECT_LAST_MEDIA_FEATURE,
    SET_SHORELINE_THEMATIC,
    ZOOM_TO_REGION,
    VIDEO_ERROR,
    UPDATE_VIDEO_INFORMATION,
    LOAD_VIDEO
} from "@js/actions/shorelineviewer";
import { getFeatureInfo } from '@mapstore/framework/api/identify';
import { getFeature } from '@mapstore/framework/api/WFS';
import { projectionSelector } from '@mapstore/framework/selectors/map';
import { mapLayoutSelector, boundingSidebarRectSelector } from '@mapstore/framework/selectors/maplayout';
import { getConfigProp } from "@mapstore/framework/utils/ConfigUtils";
import { LayoutSections } from "@js/utils/LayoutUtils";
import { updatePointWithGeometricFilter } from "@mapstore/framework/utils/IdentifyUtils";
import { reproject } from '@mapstore/framework/utils/CoordinatesUtils';
import {
    extractRegionsBbox,
    extractBboxFromGeometry,
    generateExtentLayer
} from '@js/utils/ShorelineViewerUtils';

const selectionStyle = {
    format: "geostyler",
    body: {
        rules: [
            {
                filter: ['==', 'geomType', 'point'],
                name: "Selected Point",
                symbolizers: [
                    {
                        kind: "Mark",
                        color: '#33eeff',
                        fillOpacity: 0.5,
                        strokeColor: '#33eeff',
                        strokeOpacity: 0.9,
                        radius: 11
                    }
                ]
            },
            {
                filter: [ '==', 'geomType', 'line' ],
                name: "Selected Line",
                symbolizers: [
                    {
                        kind: "Line",
                        color: '#33eeff',
                        opacity: 0.5,
                        width: 11
                    }
                ]
            }
        ]
    }
};

let videoStyle = {
    format: "geostyler",
    body: {
        rules: [
            {
                symbolizers: [
                    {
                        kind: "Icon",
                        size: 32
                    }
                ]
            }
        ]
    }
};

const extentStyle = {
    format: "geostyler",
    body: {
        rules: [
            {
                filter: [ '==', 'type', 'project' ],
                "symbolizers": [
                    {
                        kind: "Fill",
                        outlineWidth: 2,
                        outlineOpacity: 1,
                        outlineColor: '#6a0ced'
                    }
                ]
            },
            {
                filter: [ '==', 'type', 'region' ],
                symbolizers: [
                    {
                        kind: "Fill",
                        outlineWidth: 3,
                        outlineOpacity: 1,
                        outlineColor: '#007d4d'
                    }
                ]
            }
        ]
    }
};

/**
* @module epics/shorelineviewer
*/

/**
 * Override the layout to get the correct right offset when the data catalog is open
 */
export const gnUpdateShorelineViewerMapLayoutEpic = (action$, store) =>
    action$
        .ofType(UPDATE_MAP_LAYOUT)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
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
 * and registers a click event listener, enabling control of the user's click action. It can also be used
 * to add the extent layer for the various regions.
 * @param {external:Observable} action$ manages `SET_CONTROL_PROPERTY`
 * @returns {external:Observable} `PURGE_MAPINFO_RESULTS`, `HIDE_MAPINFO_MARKER`, `TOGGLE_MAPINFO_STATE`,
 *                                `REGISTER_EVENT_LISTENER`, `UPDATE_ADDITIONAL_LAYER`
 */
export const openShorelineViewerEpic = (action$, store) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "shorelineViewer")
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const shorelineViewerConfig = state.localConfig.plugins.map_viewer.find(({ name }) => name === "ShorelineViewer");
            return Rx.Observable.of(
                purgeMapInfoResults(),
                hideMapinfoMarker(),
                toggleMapInfoState(),
                registerEventListener('click', 'shorelineViewer'),
                updateAdditionalLayer(
                    "shoreline-viewer-extents",
                    "ShorelineViewer",
                    'overlay',
                    {
                        id: "shoreline-viewer-extents",
                        name: "shoreline-viewer-extents",
                        type: "vector",
                        features: shorelineViewerConfig.cfg.regions.map(region => ({
                            type: "Feature",
                            properties: {"type": "region"},
                            geometry: {
                                type: "Polygon",
                                coordinates: [[
                                    [region.extent[0], region.extent[1]],
                                    [region.extent[0], region.extent[3]],
                                    [region.extent[2], region.extent[3]],
                                    [region.extent[2], region.extent[1]],
                                    [region.extent[0], region.extent[1]]
                                ]]
                            }
                        })),
                        disableResolutionLimits: false,
                        minResolution: 611.49622628141,
                        style: extentStyle
                    }
                )
            );
        });

/**
 * This function is triggered when the user closes the plugin. The identification tool is reactivated
 * and the click event listener is removed. All additional layers created by the plugin are removed
 * and several state variables are set no null.
 * @param {external:Observable} action$ manages `SET_CONTROL_PROPERTY`
 * @returns {external:Observable} `REMOVE_ADDITIONAL_LAYER`, `SET_SHORELINE_REGION`, `SET_SHORELINE_THEMATIC`,
 *                                `UPDATE_SHORELINE_SELECTED_MEDIA_TYPE`, `SHORELINE_SELECTED_FEATURE`,
 *                                `SET_VIDEO_INFORMATIONS`, `LOAD_SELECTED_MEDIA_DATASET_FEATURES`
 *                                `TOGGLE_MAPINFO_STATE`, `UNREGISTER_EVENT_LISTENER`
 */
export const closeShorelineViewerEpic = (action$) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "shorelineViewer")
        .filter((action) => action.property === "enabled" && action.value === false)
        .switchMap(() => {
            return Rx.Observable.of(
                removeAdditionalLayer({ owner: "ShorelineViewer" }),
                setShorelineRegion(null),
                setShorelineThematic(null),
                updateShorelineSelectedMediaType(null),
                shorelineSelectedFeature(null),
                setVideoInformations(null),
                loadSelectedMediaDatasetFeatures(null),
                toggleMapInfoState(),
                unRegisterEventListener('click', 'shorelineViewer')
            );
        });

/**
 * This function is triggered when the user clicks the zoom button on the region. The map will
 * be centered and zoomed in on the selected region's extent polygon if a region is selected.
 * If no region is selected, the map will be centered on all regions.
 * @param {external:Observable} action$ manages `ZOOM_TO_REGION`
 * @returns {external:Observable} `ZOOM_TO_EXTENT`
 */
export const zoomToSelectedRegionEpic = (action$, store) =>
    action$
        .ofType(ZOOM_TO_REGION)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const selectedRegion = state.shorelineViewer.selectedRegion;
            if (selectedRegion) {
                return Rx.Observable.of(
                    zoomToExtent(selectedRegion.extent, "EPSG:4326")
                );
            }

            const shorelineViewerConfig = state.localConfig.plugins.map_viewer.find(({ name }) => name === "ShorelineViewer");
            return Rx.Observable.of(
                zoomToExtent(extractRegionsBbox(shorelineViewerConfig.cfg.regions), "EPSG:4326")

            );

        });

/**
 * This function is triggered when the user selects a region from the drop-down list. The shoreline classification
 * layer is displayed using the theme selected by the user. The additional selected entity and shoreline layers
 * already present are also removed from the map, and certain status variables are set to null.
 * @param {external:Observable} action$ manages `SET_SHORELINE_REGION`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE`, `UPDATE_SHORELINE_SELECTED_MEDIA_TYPE`,
 *                                `SET_SHORELINE_THEMATIC`, `REMOVE_ADDITIONAL_LAYER`, `UPDATE_ADDITIONAL_LAYER`
 */
export const zoomToSelectedShorelineRegionEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_REGION)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap(
            (action) => {
                const state = store.getState();
                const accessToken = state.security?.user?.info?.access_token;
                const geoserverUrl = state.gnsettings?.geoserverUrl;
                const selectedThematic = state.shorelineViewer.selectedThematic ? state.shorelineViewer.selectedThematic : action.selectedRegion.thematics[0];
                return Rx.Observable.of(
                    shorelineSelectedFeature(null),
                    updateShorelineSelectedMediaType(null),
                    setShorelineThematic(selectedThematic),
                    removeAdditionalLayer({ id: "shoreline-viewer-selected-feature" }),
                    removeAdditionalLayer({ id: "shoreline-classification-layer" }),
                    updateAdditionalLayer(
                        "shoreline-classification-layer",
                        "ShorelineViewer",
                        "overlay",
                        {
                            type: "wms",
                            url: `${geoserverUrl}wms`,
                            name: action.selectedRegion.shorelineClassificationDataset,
                            format: "image/png8",
                            singleTile: true,
                            params: {
                                access_token: accessToken,
                                STYLES: selectedThematic.thematicName
                            }
                        }
                    )
                );
            }
        );

/**
 * This function is triggered when the user clicks on the map. It lists the selected layers
 * that can be used to identify the features located at the point clicked by the user.
 * @param {external:Observable} action$ manages `CLICK_ON_MAP`
 * @returns {external:Observable} `SHORELINE_FEATURE_INFO_CLICK`
 */
export const selectShorelineFeatureEpic = (action$, store) =>
    action$
        .ofType(CLICK_ON_MAP)
        .filter(() => store.getState().controls?.shorelineViewer?.enabled)
        .switchMap(({ point }) => {
            const queryLayers = [];
            store.getState().additionallayers.map(additionalLayer => {
                if (additionalLayer.id === "shoreline-classification-layer") {
                    queryLayers.push(additionalLayer.options.name);
                } else if (additionalLayer.id.includes("shoreline-media-layer-wms")) {
                    const layerList = additionalLayer.options.name.split(",");
                    layerList.map(layer => queryLayers.unshift(layer));
                }
            });

            if (queryLayers) {
                const projection = projectionSelector(store.getState());
                const updatedPoint = updatePointWithGeometricFilter(point, projection);
                return Rx.Observable.of(
                    shorelineFeatureInfoClick(updatedPoint, queryLayers)
                );
            }
            return Rx.Observable.empty();

        });

/**
 * This function is triggered when a user clicks on the map. A request GetFeatureInfo
 * request is sent to the GeoServer to select the entity corresponding to the click
 * location. If an entity is selected, we trigger the SHORELINE_SELECTED_FEATURE
 * action to display the selected entity on the map. We also trigger the
 * LOAD_SELECTED_MEDIA_DATASET_FEATURES action when the selected layer is a photo or
 * video layer and the data has not yet been loaded into memory (the first click on the map).
 *
 * @param {external:Observable} action$ manages `SHORELINE_FEATURE_INFO_CLICK`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE` & `LOAD_SELECTED_MEDIA_DATASET_FEATURES`
 */
export const getShorelineFeatureInfoClickEpic = (action$, store) =>
    action$
        .ofType(SHORELINE_FEATURE_INFO_CLICK)
        .filter((action) => action.layers && action.layers.length > 0)
        .switchMap(({ point, layers }) => {
            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const mapExtent = state.map.present.bbox;
            const mapSize = state.map.present.size;
            const mapProjection = state.map.present.projection;
            const url = state.additionallayers.filter(
                (additionalLayer) => additionalLayer.options.name.includes(layers[0]))[0].options.url;
            if (url) {
                const mapBbox = [
                    mapExtent.bounds.minx,
                    mapExtent.bounds.miny,
                    mapExtent.bounds.maxx,
                    mapExtent.bounds.maxy
                ];
                const x = parseInt(point.pixel.x, 10);
                const y = parseInt(point.pixel.y, 10);
                const params = {
                    service: "WMS",
                    version: "1.1.1",
                    request: "GetFeatureInfo",
                    info_format: "application/json",
                    layers: `${layers}`,
                    query_layers: `${layers}`,
                    access_token: accessToken,
                    bbox: `${mapBbox}`,
                    srs: `${mapExtent.crs}`,
                    x: `${x}`,
                    y: `${y}`,
                    height: `${mapSize.height}`,
                    width: `${mapSize.width}`
                };
                return getFeatureInfo(url, params, layers)
                    .switchMap((response) => {
                        if (response.features.length > 0) {
                            const selectedLayer = response.features[0].id.substring(0, response.features[0].id.indexOf("."));
                            const feature = response.features[0];
                            // Entities in the shoreline classification layer don't need to be loaded into memory, as we don't
                            // navigate from one entity to another, unlike photos and videos.
                            if (state.shorelineViewer.selectedRegion.shorelineClassificationDataset.includes(selectedLayer)) {
                                return Rx.Observable.of(
                                    shorelineSelectedFeature({
                                        selectedFeature: feature,
                                        selectedLayer: selectedLayer,
                                        selectedFeatureProjection: mapProjection,
                                        trigger: "SHORELINE_FEATURE_INFO_CLICK"
                                    })
                                );
                            } else if (state.shorelineViewer.selectedMediaDatasetFeatures && state.shorelineViewer.selectedMediaDatasetFeatures.features[0].id.includes(selectedLayer)) {
                                // For photos, we first load all the entities in the layer. We need all the entities for navigation between
                                // photos to work properly. We don't load photos a second time when the layer is already loaded.
                                if (state.shorelineViewer.selectedMediaType.name === "Photos") {
                                    return Rx.Observable.of(
                                        shorelineSelectedFeature({
                                            selectedFeature: feature,
                                            selectedLayer: selectedLayer,
                                            selectedFeatureProjection: mapProjection,
                                            trigger: "SHORELINE_FEATURE_INFO_CLICK"
                                        })
                                    );
                                }

                                // For videos, a point layer can contain over a hundred thousand entities, which takes a considerable
                                // amount of time to load. We add a CQL filter to limit the entities returned to those in the
                                // corresponding file. We don't load entities a second time when the user clicks a point belonging to
                                // the same file a second time.
                                if (state.shorelineViewer.selectedMediaDatasetFeatures.features[0].properties.filename === feature.properties.filename) {
                                    return Rx.Observable.of(
                                        shorelineSelectedFeature({
                                            selectedFeature: feature,
                                            selectedLayer: selectedLayer,
                                            selectedFeatureProjection: mapProjection,
                                            trigger: "SHORELINE_FEATURE_INFO_CLICK"
                                        })
                                    );
                                }

                            }

                            const geoserverUrl = state.gnsettings?.geoserverUrl;
                            const requestUrl = `${geoserverUrl}wfs`;
                            let wfsParams = {
                                service: "WFS",
                                version: "1.1.0",
                                request: "GetFeature",
                                outputFormat: "application/json",
                                access_token: accessToken
                            };
                            if (state.shorelineViewer.selectedMediaType.name === "Videos") {
                                wfsParams.CQL_FILTER = `filename = '${feature.properties.filename}'`;
                            }
                            return Rx.Observable.fromPromise(getFeature(requestUrl, selectedLayer, wfsParams))
                                .switchMap((resp) => {
                                    return Rx.Observable.of(
                                        loadSelectedMediaDatasetFeatures(resp.data),
                                        shorelineSelectedFeature({
                                            selectedFeature: feature,
                                            selectedLayer: selectedLayer,
                                            selectedFeatureProjection: mapProjection,
                                            trigger: "SHORELINE_FEATURE_INFO_CLICK"
                                        })
                                    );
                                });

                        }
                        return Rx.Observable.empty();
                    });
            }
            return Rx.Observable.empty();
        });

/**
 * This function is triggered when an entity is selected, either by the user or automatically during
 * video playback. Subsequent actions depend on the type of media selected and the action trigger
 * (user action or video playback).
 * @param {external:Observable} action$ manages `SHORELINE_SELECTED_FEATURE`
 * @returns {external:Observable} `UPDATE_ADDITIONAL_LAYER`, `ZOOM_TO_EXTENT`, `LOAD_VIDEO`
 */
export const selectMediaFeatureEpic = (action$, store) =>
    action$
        .ofType(SHORELINE_SELECTED_FEATURE)
        .filter((action) => action.selectedFeature)
        .filter(() => store.getState().shorelineViewer?.selectedFeature)
        .switchMap((action) => {
            const state = store.getState();
            const selectedMediaType = state.shorelineViewer?.selectedMediaType?.name;
            const selectedRegion = state.shorelineViewer.selectedRegion;
            const featureCoordinates = action.selectedFeature.selectedFeature.geometry.coordinates;
            const featureGeometry = action.selectedFeature.selectedFeature.geometry;
            let featureExtent;
            let coordinates;
            let featureProperties;
            if (featureGeometry.type === "MultiLineString") {
                const projectedLine = [];
                featureGeometry.coordinates[0].filter((coords) => {
                    const projectedPoint = reproject(coords, action.selectedFeature.selectedFeatureProjection, "EPSG:4326");
                    projectedLine.push(projectedPoint);
                });
                featureExtent = extractBboxFromGeometry(projectedLine);
                coordinates = [projectedLine.map((coords) => [coords.x, coords.y])];
                featureProperties = {"geomType": "line"};
            } else if (featureGeometry.type === "Point") {
                const projectedPoint = reproject(featureCoordinates, action.selectedFeature.selectedFeatureProjection, "EPSG:4326");
                coordinates = [projectedPoint.x, projectedPoint.y];
                featureProperties = {"geomType": "point"};
                featureExtent = [coordinates[0], coordinates[1], coordinates[0], coordinates[1]];
            }

            if (selectedMediaType && selectedMediaType === "Videos" && selectedRegion.videoDatasets.some(layer => layer.datasetName === action.selectedFeature.selectedLayer)) {
                videoStyle.body.rules[0].symbolizers[0].image = `${state.gnsettings?.geonodeUrl}static/mapstore/symbols/video-position.png`;
                // Uncomment the following line to display the correct symbol for the video position in dev mode.
                // videoStyle.body.rules[0].symbolizers[0].image = `https://localhost:8081/static/mapstore/symbols/video-position.png`;
                if (action.selectedFeature.selectedFeature.properties.cog) {
                    videoStyle.body.rules[0].symbolizers[0].rotate = action.selectedFeature.selectedFeature.properties.cog;
                }
                if (action.selectedFeature.trigger === "UPDATE_VIDEO_INFORMATION") {
                    return Rx.Observable.of(
                        updateAdditionalLayer(
                            "shoreline-viewer-selected-feature",
                            "ShorelineViewer",
                            'overlay',
                            {
                                id: "shoreline-viewer-selected-feature",
                                name: "shoreline-viewer-selected-feature",
                                type: "vector",
                                features: [
                                    {
                                        type: "Feature",
                                        properties: {},
                                        geometry: {
                                            type: featureGeometry.type,
                                            coordinates: coordinates
                                        }
                                    }
                                ],
                                style: videoStyle
                            }
                        )
                    );
                }
                return Rx.Observable.of(
                    updateAdditionalLayer(
                        "shoreline-viewer-selected-feature",
                        "ShorelineViewer",
                        'overlay',
                        {
                            id: "shoreline-viewer-selected-feature",
                            name: "shoreline-viewer-selected-feature",
                            type: "vector",
                            features: [
                                {
                                    type: "Feature",
                                    properties: {},
                                    geometry: {
                                        type: featureGeometry.type,
                                        coordinates: coordinates
                                    }
                                }
                            ],
                            style: videoStyle
                        }
                    ),
                    zoomToExtent(featureExtent, "EPSG:4326", 15),
                    loadVideo(action.selectedFeature.selectedFeature.properties.filename)
                );
            }
            if (state.shorelineViewer.videoInformations && selectedRegion.shorelineClassificationDataset.includes(action.selectedFeature.selectedLayer)) {
                return Rx.Observable.of(
                    setVideoInformations(null),
                    updateAdditionalLayer(
                        "shoreline-viewer-selected-feature",
                        "ShorelineViewer",
                        'overlay',
                        {
                            id: "shoreline-viewer-selected-feature",
                            name: "shoreline-viewer-selected-feature",
                            type: "vector",
                            features: [
                                {
                                    type: "Feature",
                                    properties: featureProperties,
                                    geometry: {
                                        type: featureGeometry.type,
                                        coordinates: coordinates
                                    }
                                }
                            ],
                            style: selectionStyle
                        }
                    ),
                    zoomToExtent(featureExtent, "EPSG:4326", 14)
                );
            }
            return Rx.Observable.of(
                updateAdditionalLayer(
                    "shoreline-viewer-selected-feature",
                    "ShorelineViewer",
                    'overlay',
                    {
                        id: "shoreline-viewer-selected-feature",
                        name: "shoreline-viewer-selected-feature",
                        type: "vector",
                        features: [
                            {
                                type: "Feature",
                                properties: featureProperties,
                                geometry: {
                                    type: featureGeometry.type,
                                    coordinates: coordinates
                                }
                            }
                        ],
                        style: selectionStyle
                    }
                ),
                zoomToExtent(featureExtent, "EPSG:4326", 14)
            );
        });

/**
 * This function is triggered when the user selects a media type from the plugin interface.
 * There are three possible scenarios:
 *
 *     - First, the user selects a media type for the first time: Everything should
 *       be loaded normally in this case.
 *     - Secondly, the user selects the same media type that is currently selected:
 *       Everything must be removed from the map in this scenario.
 *     - Finally, the user selects another media type: Variables relating to the
 *       previous media type must be removed from the state and new ones added.
 *
 * @param {external:Observable} action$ manages `UPDATE_SHORELINE_SELECTED_MEDIA_TYPE`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE`, `SET_VIDEO_INFORMATIONS`,
 *                                `REMOVE_ADDITIONAL_LAYER`, `UPDATE_ADDITIONAL_LAYER`,
 *                                `LOAD_SELECTED_MEDIA_DATASET_FEATURES`
 */
export const displayShorelineMediaLayerEpic = (action$, store) =>
    action$
        .ofType(UPDATE_SHORELINE_SELECTED_MEDIA_TYPE)
        .switchMap((action) => {
            if (action.selectedMediaType) {
                const state = store.getState();
                const layerList = (action.selectedMediaType.name === "Photos") ? state.shorelineViewer.selectedRegion.photoDatasets : state.shorelineViewer.selectedRegion.videoDatasets;
                const features = generateExtentLayer(layerList);
                let layerName = layerList.map(layer => layer.datasetName);
                const accessToken = state.security?.user?.info?.access_token;
                const geoserverUrl = state.gnsettings?.geoserverUrl;
                return Rx.Observable.of(
                    shorelineSelectedFeature(null),
                    setVideoInformations(null),
                    removeAdditionalLayer({ id: "shoreline-viewer-selected-feature" }),
                    removeAdditionalLayer({ id: "shoreline-media-layer-wms" }),
                    updateAdditionalLayer(
                        "shoreline-media-layer-bbox",
                        "ShorelineViewer",
                        'overlay',
                        {
                            id: "shoreline-media-layer-bbox",
                            name: "shoreline-media-layer-bbox",
                            type: "vector",
                            features: features,
                            disableResolutionLimits: false,
                            minResolution: 152.8740565703525,
                            style: extentStyle
                        }
                    ),
                    updateAdditionalLayer(
                        "shoreline-media-layer-wms",
                        "ShorelineViewer",
                        "overlay",
                        {
                            layerId: "shoreline-media-layer-wms",
                            type: "wms",
                            url: `${geoserverUrl}wms`,
                            name: layerName.toString(),
                            format: "image/png8",
                            singleTile: true,
                            params: {
                                access_token: accessToken
                            },
                            disableResolutionLimits: false,
                            maxResolution: 152.8740565703525
                        }
                    )
                );
            }

            // We can disable the selected media type when the user clicks on the media type
            // already selected in the plugin's menu bar.
            return Rx.Observable.of(
                removeAdditionalLayer({ id: "shoreline-viewer-selected-feature" }),
                removeAdditionalLayer({ id: "shoreline-media-layer-bbox" }),
                removeAdditionalLayer({ id: "shoreline-media-layer-wms" }),
                shorelineSelectedFeature(null),
                setVideoInformations(null),
                loadSelectedMediaDatasetFeatures(null)
            );
        });

/**
 * This function is triggered when the user clicks on the button to go to the first point of a
 * photo layer. The first photo is returned as the selected media.
 * @param {external:Observable} action$ manages `SELECT_FIRST_MEDIA_FEATURE`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE`
 */
export const selectFirstMediaFeatureEpic = (action$, store) =>
    action$
        .ofType(SELECT_FIRST_MEDIA_FEATURE)
        .switchMap(() => {
            const state = store.getState();
            const firstMediaFeature = state.shorelineViewer?.selectedMediaDatasetFeatures?.features[0];
            const selectedLayer = state.shorelineViewer.selectedLayer;
            return Rx.Observable.of(
                shorelineSelectedFeature({
                    selectedFeature: firstMediaFeature,
                    selectedLayer: selectedLayer,
                    selectedFeatureProjection: "EPSG:4269",
                    trigger: "SELECT_FIRST_MEDIA_FEATURE"
                })
            );
        });

/**
 * This function is triggered when the user clicks on the button to go to the previous point of a
 * photo layer. The previous photo is returned as the selected media.
 * @param {external:Observable} action$ manages `SELECT_FIRST_MEDIA_FEATURE`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE`
 */
export const selectPreviousMediaFeatureEpic = (action$, store) =>
    action$
        .ofType(SELECT_PREVIOUS_MEDIA_FEATURE)
        .switchMap((action) => {
            const state = store.getState();
            const mediaFeatures = state.shorelineViewer?.selectedMediaDatasetFeatures?.features;
            const selectedFeatureName = action.selectedFeature.properties.name;
            const selectedFeatureIndex = mediaFeatures.findIndex((x) => x.properties.name === selectedFeatureName);
            const previousMediaFeature = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features[selectedFeatureIndex - 1];
            const selectedLayer = state.shorelineViewer.selectedLayer;
            return Rx.Observable.of(
                shorelineSelectedFeature({
                    selectedFeature: previousMediaFeature,
                    selectedLayer: selectedLayer,
                    selectedFeatureProjection: "EPSG:4269",
                    trigger: "SELECT_PREVIOUS_MEDIA_FEATURE"
                })
            );
        });

/**
 * This function is triggered when the user clicks on the button to go to the next point of a
 * photo layer. The next photo is returned as the selected media.
 * @param {external:Observable} action$ manages `SELECT_FIRST_MEDIA_FEATURE`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE`
 */
export const selectNextMediaFeatureEpic = (action$, store) =>
    action$
        .ofType(SELECT_NEXT_MEDIA_FEATURE)
        .switchMap((action) => {
            const state = store.getState();
            const mediaFeatures = state.shorelineViewer?.selectedMediaDatasetFeatures?.features;
            const selectedFeatureName = action.selectedFeature.properties.name;
            const selectedFeatureIndex = mediaFeatures.findIndex((x) => x.properties.name === selectedFeatureName);
            const nextMediaFeature = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features[selectedFeatureIndex + 1];
            const selectedLayer = state.shorelineViewer.selectedLayer;
            return Rx.Observable.of(
                shorelineSelectedFeature({
                    selectedFeature: nextMediaFeature,
                    selectedLayer: selectedLayer,
                    selectedFeatureProjection: "EPSG:4269",
                    trigger: "SELECT_NEXT_MEDIA_FEATURE"
                })
            );
        });

/**
 * This function is triggered when the user clicks on the button to go to the last point of a
 * photo layer. The last photo is returned as the selected media.
 * @param {external:Observable} action$ manages `SELECT_FIRST_MEDIA_FEATURE`
 * @returns {external:Observable} `SHORELINE_SELECTED_FEATURE`
 */
export const selectLastMediaFeatureEpic = (action$, store) =>
    action$
        .ofType(SELECT_LAST_MEDIA_FEATURE)
        .switchMap(() => {
            const state = store.getState();
            const mediaFeatures = state.shorelineViewer?.selectedMediaDatasetFeatures?.features;
            const lastMediaFeature = mediaFeatures[mediaFeatures.length - 1];
            const selectedLayer = state.shorelineViewer.selectedLayer;
            return Rx.Observable.of(
                shorelineSelectedFeature({
                    selectedFeature: lastMediaFeature,
                    selectedLayer: selectedLayer,
                    selectedFeatureProjection: "EPSG:4269",
                    trigger: "SELECT_LAST_MEDIA_FEATURE"
                })
            );
        });

/**
 * This function is triggered when the loading of a layer displayed from the shoreline viewer
 * plugin begins. It displays a loader in the plugin panel.
 * @param {external:Observable} action$ manages `LAYER_LOADING`
 * @returns {external:Observable} `SET_SHORELINE_LOADING`
 */
export const shorelineStartLoadingEpic = (action$, store) =>
    action$
        .ofType(LAYER_LOADING)
        .filter(() => store.getState().controls?.shorelineViewer?.enabled)
        .filter((action) => !action.layerId)
        .switchMap(() => {
            const state = store.getState();
            if (state.shorelineViewer.videoInformations && state.shorelineViewer.videoInformations.status === "play") {
                return Rx.Observable.of(
                    setShorelineLoading(false)
                );
            }
            return Rx.Observable.of(
                setShorelineLoading(true)
            );

        });

/**
 * This function is triggered when the loading of a layer displayed from the shoreline viewer
 * plugin ends. It hides a loader in the plugin panel.
 * @param {external:Observable} action$ manages `LAYER_LOADING`
 * @returns {external:Observable} `SET_SHORELINE_LOADING`
 */
export const shorelineStopLoadingEpic = (action$, store) =>
    action$
        .ofType(LAYER_LOAD)
        .filter(() => store.getState().controls?.shorelineViewer?.enabled)
        .filter((action) => !action.layerId)
        .switchMap(() => {
            return Rx.Observable.of(
                setShorelineLoading(false)
            );
        });

/**
 * This function is triggered when the user selects a new theme for the shoreline classification
 * layer. The new symbology is then applied to the layer.
 * @param {external:Observable} action$ manages `SET_SHORELINE_THEMATIC`
 * @returns {external:Observable} `REMOVE_ADDITIONAL_LAYER`, `UPDATE_ADDITIONAL_LAYER`
 */
export const changeShorelineThematicEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_THEMATIC)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap(
            (action) => {
                const state = store.getState();
                const accessToken = state.security?.user?.info?.access_token;
                const geoserverUrl = state.gnsettings?.geoserverUrl;
                return Rx.Observable.of(
                    removeAdditionalLayer({ id: "shoreline-classification-layer" }),
                    updateAdditionalLayer(
                        "shoreline-classification-layer",
                        "ShorelineViewer",
                        "overlay",
                        {
                            type: "wms",
                            url: `${geoserverUrl}wms`,
                            name: state.shorelineViewer.selectedRegion.shorelineClassificationDataset,
                            format: "image/png8",
                            singleTile: true,
                            params: {
                                access_token: accessToken,
                                STYLES: action.selectedThematic.thematicName
                            }
                        }
                    )
                );
            }
        );

/**
 * This function is triggered when a point in a video layer is selected. It loads the corresponding video
 * from the Vimeo API. Once loaded, it initiates the videoInformations state variable with the video's
 * initial information (file name, time in video and URI).
 * @param {external:Observable} action$ manages `LOAD_VIDEO`
 * @returns {external:Observable} `SET_VIDEO_INFORMATIONS`, `ERROR`
 */
export const loadVideoEpic = (action$, store) =>
    action$
        .ofType(LOAD_VIDEO)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const selectedFeature = state.shorelineViewer.selectedFeature;
            const videoInformation = state.shorelineViewer.videoInformations;
            if (!videoInformation || action.fileName !== videoInformation.fileName) {
                return Rx.Observable.fromPromise(
                    axios.get(`${state.gnsettings?.geonodeUrl}vimeo_proxy/${action.fileName}`)
                        .catch(response => {
                            return (
                                error({
                                    uid: "loadVideoError",
                                    title: "shorelineViewer.notifications.error",
                                    message: response.originalError.message,
                                    action: {
                                        label: "shorelineViewer.notifications.close"
                                    },
                                    position: "tr",
                                    autoDismiss: 0
                                })
                            );
                        })
                )
                    .switchMap((response) => {
                        return Rx.Observable.of(
                            setVideoInformations(
                                {
                                    fileName: action.fileName,
                                    time: selectedFeature.selectedFeature.properties.time,
                                    videoUri: response.data
                                }
                            )
                        );
                    });
            } else if (videoInformation && action.fileName === videoInformation.fileName && selectedFeature.selectedFeature.properties.time !== videoInformation.time) {
                videoInformation.time = selectedFeature.selectedFeature.properties.time;
                let element = document.getElementsByTagName("video")[0];
                element.currentTime = selectedFeature.selectedFeature.properties.time;
                return Rx.Observable.of(
                    setVideoInformations(videoInformation)
                );
            }
            return Rx.Observable.empty();
        });

/**
 * This function is triggered when a video setting is changed (video name, play time, etc.). The actions taken
 * depend on the parameter modified.
 * @param {external:Observable} action$ manages `UPDATE_VIDEO_INFORMATION`
 * @returns {external:Observable} `SET_PRINT_PROPERTIES`, `SET_PRINT_EXTENT`, `GET_COORDINATES_SYSTEMS`, `ERROR`
 */
export const updateVideoInformationEpic = (action$, store) =>
    action$
        .ofType(UPDATE_VIDEO_INFORMATION)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const selectedLayer = state.shorelineViewer.selectedFeature.selectedLayer;
            state.shorelineViewer.videoInformations[`${action.videoInformation.name}`] = action.videoInformation.value;

            if (action.videoInformation.name === "time") {
                const selectedFeature = state.shorelineViewer.selectedFeature;
                const nextFeature = state.shorelineViewer.selectedMediaDatasetFeatures.features.filter((feature) => {
                    return feature.properties.filename === selectedFeature.selectedFeature.properties.filename && feature.properties.time === action.videoInformation.value;
                });
                if (nextFeature[0]) {
                    if (action.videoInformation.value > state.shorelineViewer.videoInformations.duration) {
                        return (
                            error({
                                uid: "videoDurationError",
                                title: "shorelineViewer.notifications.error",
                                message: "shorelineViewer.notifications.durationError",
                                action: {
                                    label: "shorelineViewer.notifications.close"
                                },
                                position: "tr",
                                autoDismiss: 0
                            })
                        );
                    }

                    return Rx.Observable.of(
                        setVideoInformations(state.shorelineViewer.videoInformations),
                        shorelineSelectedFeature({
                            selectedFeature: nextFeature[0],
                            selectedLayer: selectedLayer,
                            selectedFeatureProjection: "EPSG:3857",
                            trigger: "UPDATE_VIDEO_INFORMATION"
                        })
                    );

                }

                return Rx.Observable.empty();

            } else if (action.videoInformation.name === "status") {
                return Rx.Observable.of(
                    setVideoInformations(state.shorelineViewer.videoInformations)
                );
            }
            return Rx.Observable.empty();
        });

/**
 * This function displays an error message following an error during the process.
 * @param {external:Observable} action$ manages `VIDEO_ERROR`
 * @returns {external:Observable} `ERROR`
 */
export const videoErrorEpic = (action$) =>
    action$
        .ofType(VIDEO_ERROR)
        .switchMap((action) => {
            return Rx.Observable.of(
                error({
                    uid: action.uid,
                    title: action.title,
                    message: action.message,
                    action: {
                        label: "sensitivitymapping.notifications.close"
                    },
                    values: action.values,
                    position: "tr",
                    autoDismiss: 0
                })
            );
        });

export default {
    gnUpdateShorelineViewerMapLayoutEpic,
    openShorelineViewerEpic,
    zoomToSelectedRegionEpic,
    closeShorelineViewerEpic,
    zoomToSelectedShorelineRegionEpic,
    selectShorelineFeatureEpic,
    getShorelineFeatureInfoClickEpic,
    selectMediaFeatureEpic,
    displayShorelineMediaLayerEpic,
    selectFirstMediaFeatureEpic,
    selectPreviousMediaFeatureEpic,
    selectNextMediaFeatureEpic,
    selectLastMediaFeatureEpic,
    shorelineStartLoadingEpic,
    shorelineStopLoadingEpic,
    changeShorelineThematicEpic,
    loadVideoEpic,
    updateVideoInformationEpic,
    videoErrorEpic
};

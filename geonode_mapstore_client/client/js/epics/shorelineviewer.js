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
import { mapLayoutSelector, boundingSidebarRectSelector } from '@mapstore/framework/selectors/maplayout';
import { getConfigProp } from "@mapstore/framework/utils/ConfigUtils";
import { LayoutSections } from "@js/utils/LayoutUtils";
import {
    setShorelineRegion,
    updateShorelineSelectedMediaType,
    shorelineFeatureInfoClick,
    shorelineSelectedFeature,
    loadSelectedMediaDatasetFeatures,
    setShorelineLoading,
    setShorelineThematic,
    SET_SHORELINE_REGION,
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
    setVideoInformations,
    LOAD_VIDEO,
    loadVideo
} from "@js/actions/shorelineviewer";
import { registerEventListener, unRegisterEventListener, zoomToExtent, CLICK_ON_MAP, CHANGE_MAP_VIEW } from '@mapstore/framework/actions/map';
import { LAYER_LOAD, LAYER_LOADING } from '@mapstore/framework/actions/layers';
import { removeAdditionalLayer, updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import { updatePointWithGeometricFilter } from "@mapstore/framework/utils/IdentifyUtils";
import { projectionSelector } from '@mapstore/framework/selectors/map';
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';
import { getFeatureInfo } from '@mapstore/framework/api/identify';
import { reproject } from '@mapstore/framework/utils/CoordinatesUtils';
import { getFeature } from '@mapstore/framework/api/WFS';
import { extractRegionsBbox, extractBboxFromGeometry, DEFAULT_LINE_STYLE, DEFAULT_POINT_STYLE, generateExtentLayer } from '@js/utils/ShorelineViewerUtils';
import { error } from '@mapstore/framework/actions/notifications';

export const VIDEO_STYLE = {
    "format": "geostyler",
    "body": {
        "name": "Selected Video Feature",
        "rules": [
            {
                "name": "Selected Video Feature",
                "symbolizers": [
                    {
                        "kind": "Icon",
                        "size": 32
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
export const gnUpdateShorelineViewerMapLayoutEpic = (action$, store) => action$.ofType(UPDATE_MAP_LAYOUT)
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

export const openShorelineViewerEpic = (action$, store) => action$.ofType(SET_CONTROL_PROPERTY)
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
                        properties: {},
                        geometry: {
                            type: "Polygon",
                            coordinates: [[
                                [region.extent[0], region.extent[1]],
                                [region.extent[0], region.extent[3]],
                                [region.extent[2], region.extent[3]],
                                [region.extent[2], region.extent[1]],
                                [region.extent[0], region.extent[1]]
                            ]]
                        },
                        style: {
                            weight: 3,
                            color: '#007d4d',
                            opacity: 0.8,
                            fillColor: '#007d4d',
                            fillOpacity: 0
                        }
                    }))
                }
            )
            // zoomToExtent(extractRegionsBbox(shorelineViewerConfig.cfg.regions), "EPSG:4326")
        );
    });

export const zoomToSelectedRegionEpic = (action$, store) => action$.ofType(ZOOM_TO_REGION)
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

export const closeShorelineViewerEpic = (action$) => action$.ofType(SET_CONTROL_PROPERTY)
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

export const zoomToSelectedShorelineRegionEpic = (action$, store) => action$.ofType(SET_SHORELINE_REGION)
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
                // zoomToExtent(action.selectedRegion.extent, "EPSG:4326")
            );
        }
    );

export const selectShorelineFeatureEpic = (action$, store) => action$.ofType(CLICK_ON_MAP)
    .filter(() => store.getState().controls?.shorelineViewer?.enabled)
    .switchMap(({ point }) => {
        const queryLayers = [];
        store.getState().additionallayers.map(additionalLayer => {
            if (additionalLayer.id === "shoreline-classification-layer") {
                queryLayers.push(additionalLayer.options.name);
            } else if (additionalLayer.id.includes("shoreline-media-layer")) {
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

export const getShorelineFeatureInfoClickEpic = (action$, store) => action$.ofType(SHORELINE_FEATURE_INFO_CLICK)
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
                        const geoserverUrl = state.gnsettings?.geoserverUrl;
                        const requestUrl = `${geoserverUrl}wfs`;
                        const wfsParams = {
                            service: "WFS",
                            version: "1.1.0",
                            request: "GetFeature",
                            outputFormat: "application/json",
                            access_token: accessToken
                        };
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

export const selectMediaFeatureEpic = (action$, store) => action$.ofType(SHORELINE_SELECTED_FEATURE)
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
        let featureStyle;
        if (featureGeometry.type === "MultiLineString") {
            const projectedLine = [];
            featureGeometry.coordinates[0].filter((coords) => {
                const projectedPoint = reproject(coords, action.selectedFeature.selectedFeatureProjection, "EPSG:4326");
                projectedLine.push(projectedPoint);
            });
            featureExtent = extractBboxFromGeometry(projectedLine);
            coordinates = [projectedLine.map((coords) => [coords.x, coords.y])];
            featureStyle = DEFAULT_LINE_STYLE;
        } else if (featureGeometry.type === "Point") {
            const projectedPoint = reproject(featureCoordinates, action.selectedFeature.selectedFeatureProjection, "EPSG:4326");
            coordinates = [projectedPoint.x, projectedPoint.y];
            featureStyle = DEFAULT_POINT_STYLE;
            featureExtent = [coordinates[0], coordinates[1], coordinates[0], coordinates[1]];
        }

        if (selectedMediaType && selectedMediaType === "Videos" && selectedRegion.videoDatasets.some(layer => layer.datasetName === action.selectedFeature.selectedLayer)) {
            let videoStyle = VIDEO_STYLE;
            videoStyle.body.rules[0].symbolizers[0].image = `${state.gnsettings?.geonodeUrl}static/mapstore/symbols/video-position.png`;
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
                                properties: {},
                                geometry: {
                                    type: featureGeometry.type,
                                    coordinates: coordinates
                                },
                                style: featureStyle
                            }
                        ]
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
                            properties: {},
                            geometry: {
                                type: featureGeometry.type,
                                coordinates: coordinates
                            },
                            style: featureStyle
                        }
                    ]
                }
            ),
            zoomToExtent(featureExtent, "EPSG:4326", 14)
        );
    });

/**
 *
 * @param {external:Observable} action$ manages `UPDATE_SHORELINE_SELECTED_MEDIA_TYPE`
 * @returns {external:Observable} ``
 */
export const displayShorelineMediaLayerEpic = (action$, store) =>
    action$.ofType(UPDATE_SHORELINE_SELECTED_MEDIA_TYPE)
        .switchMap((action) => {
            if (action.selectedMediaType) {
                const state = store.getState();
                const layerList = (action.selectedMediaType.name === "Photos") ? state.shorelineViewer.selectedRegion.photoDatasets : state.shorelineViewer.selectedRegion.videoDatasets;
                const zoomLevel = state.map.present.zoom;
                // Displaying several layers at the same time can be demanding for the server.
                // We therefore return an extent polygon for each layer of the selected media,
                // rather than the WMS, when the zoom level is below 10.
                if (zoomLevel < 10) {
                    const features = generateExtentLayer(layerList);
                    if (state.additionallayers.some((additionalLayer) => additionalLayer.id === "shoreline-media-layer-wms")) {
                        return Rx.Observable.of(
                            removeAdditionalLayer({ id: "shoreline-media-layer-wms" }),
                            updateAdditionalLayer(
                                "shoreline-media-layer-bbox",
                                "ShorelineViewer",
                                'overlay',
                                {
                                    id: "shoreline-viewer-selected-feature",
                                    name: "shoreline-viewer-selected-feature",
                                    type: "vector",
                                    features: features,
                                    style: {
                                        "format": "geostyler",
                                        "body": {
                                            "name": "Project Extents",
                                            "rules": [
                                                {
                                                    "name": "Project Extents",
                                                    "symbolizers": [
                                                        {
                                                            kind: "Fill",
                                                            outlineWidth: 2,
                                                            outlineOpacity: 1,
                                                            outlineColor: '#6a0ced'
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            )
                        );
                    }
                    return Rx.Observable.of(
                        updateAdditionalLayer(
                            "shoreline-media-layer-bbox",
                            "ShorelineViewer",
                            'overlay',
                            {
                                id: "shoreline-viewer-selected-feature",
                                name: "shoreline-viewer-selected-feature",
                                type: "vector",
                                features: features,
                                style: {
                                    "format": "geostyler",
                                    "body": {
                                        "name": "Project Extents",
                                        "rules": [
                                            {
                                                "name": "Project Extents",
                                                "symbolizers": [
                                                    {
                                                        kind: "Fill",
                                                        outlineWidth: 2,
                                                        outlineOpacity: 1,
                                                        outlineColor: '#6a0ced'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        )
                    );
                }

                let layerName = layerList.map(layer => layer.datasetName);
                const accessToken = state.security?.user?.info?.access_token;
                const geoserverUrl = state.gnsettings?.geoserverUrl;
                if (state.additionallayers.some((additionalLayer) => additionalLayer.id === "shoreline-media-layer-bbox")) {
                    return Rx.Observable.of(
                        removeAdditionalLayer({ id: "shoreline-media-layer-bbox" }),
                        updateAdditionalLayer(
                            "shoreline-media-layer-wms",
                            "ShorelineViewer",
                            "overlay",
                            {
                                layerId: "shoreline-viewer-selected-feature",
                                type: "wms",
                                url: `${geoserverUrl}wms`,
                                name: layerName.toString(),
                                format: "image/png8",
                                singleTile: true,
                                params: {
                                    access_token: accessToken
                                }
                            }
                        )
                    );
                }
                return Rx.Observable.of(
                    updateAdditionalLayer(
                        "shoreline-media-layer-wms",
                        "ShorelineViewer",
                        "overlay",
                        {
                            layerId: "shoreline-viewer-selected-feature",
                            type: "wms",
                            url: `${geoserverUrl}wms`,
                            name: layerName.toString(),
                            format: "image/png8",
                            singleTile: true,
                            params: {
                                access_token: accessToken
                            }
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

        }
        );

export const selectFirstMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_FIRST_MEDIA_FEATURE)
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

export const selectPreviousMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_PREVIOUS_MEDIA_FEATURE)
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

export const selectNextMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_NEXT_MEDIA_FEATURE)
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

export const selectLastMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_LAST_MEDIA_FEATURE)
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

export const shorelineStartLoadingEpic = (action$, store) => action$.ofType(LAYER_LOADING)
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

export const shorelineStopLoadingEpic = (action$, store) => action$.ofType(LAYER_LOAD)
    .filter(() => store.getState().controls?.shorelineViewer?.enabled)
    .filter((action) => !action.layerId)
    .switchMap(() => {
        return Rx.Observable.of(
            setShorelineLoading(false)
        );
    });

export const changeShorelineThematicEpic = (action$, store) => action$.ofType(SET_SHORELINE_THEMATIC)
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
 * This action is triggered when a point in a video layer is selected. It loads the corresponding video
 * from the Vimeo API. Once loaded, it initiates the videoInformations state variable with the video's
 * initial information (file name, time in video and URI).
 * @param {external:Observable} action$ manages `LOAD_VIDEO`
 * @returns {external:Observable} `SET_VIDEO_INFORMATIONS`
 */
export const loadVideoEpic = (action$, store) =>
    action$.ofType(LOAD_VIDEO)
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
 * @returns {external:Observable} `SET_PRINT_PROPERTIES`, `SET_PRINT_EXTENT`, `GET_COORDINATES_SYSTEMS`
 */
export const updateVideoInformationEpic = (action$, store) =>
    action$.ofType(UPDATE_VIDEO_INFORMATION)
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
    action$.ofType(VIDEO_ERROR)
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

/**
 * This function is triggered when there is a change to the map view. We capture this action
 * to refresh the project extent layer. The display varies according to the zoom level of
 * the map: the bbox is displayed when the zoom level is below 10, and the WMS when the zoom
 * level is above 10.
 * @param {external:Observable} action$ manages `CHANGE_MAP_VIEW`
 * @returns {external:Observable} `UPDATE_SHORELINE_SELECTED_MEDIA_TYPE`
 */
export const changeMapViewEpic = (action$, store) =>
    action$.ofType(CHANGE_MAP_VIEW)
        .filter(() => store.getState()?.shorelineViewer?.selectedMediaType)
        .switchMap((action) => {
            const state = store.getState();
            const previousZoomLevel = state.map.past[state.map.past.length - 1].zoom;
            if (action.zoom !== previousZoomLevel) {
                return Rx.Observable.of(
                    updateShorelineSelectedMediaType(state.shorelineViewer.selectedMediaType)
                );
            }
            return Rx.Observable.empty();
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
    videoErrorEpic,
    changeMapViewEpic
};

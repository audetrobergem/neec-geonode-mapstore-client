/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import { mapLayoutSelector } from '@mapstore/framework/selectors/maplayout';
import { getConfigProp } from "@mapstore/framework/utils/ConfigUtils";
import { LayoutSections } from "@js/utils/LayoutUtils";
import {
    setShorelineRegion,
    updateShorelineSelectedMediaType,
    shorelineFeatureInfoClick,
    shorelineSelectedFeature,
    loadSelectedMediaDatasetFeatures,
    setShorelineLoading,
    SET_SHORELINE_REGION,
    UPDATE_SHORELINE_SELECTED_MEDIA_TYPE,
    SHORELINE_FEATURE_INFO_CLICK,
    SHORELINE_SELECTED_FEATURE,
    SELECT_FIRST_MEDIA_FEATURE,
    SELECT_PREVIOUS_MEDIA_FEATURE,
    SELECT_NEXT_MEDIA_FEATURE,
    SELECT_LAST_MEDIA_FEATURE
} from "@js/actions/shorelineviewer";
import { registerEventListener, unRegisterEventListener, zoomToExtent, CLICK_ON_MAP } from '@mapstore/framework/actions/map';
import { LAYER_LOAD, LAYER_LOADING } from '@mapstore/framework/actions/layers';
import { removeAdditionalLayer, updateAdditionalLayer, UPDATE_ADDITIONAL_LAYER } from '@mapstore/framework/actions/additionallayers';
import { updatePointWithGeometricFilter } from "@mapstore/framework/utils/IdentifyUtils";
import { projectionSelector } from '@mapstore/framework/selectors/map';
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';
import { getFeatureInfo } from '@mapstore/framework/api/identify';
import { reproject } from '@mapstore/framework/utils/CoordinatesUtils';
import { getFeature } from '@mapstore/framework/api/WFS';
import { extractRegionsBbox, extractBboxFromGeometry, DEFAULT_LINE_STYLE, DEFAULT_POINT_STYLE } from '@js/utils/ShorelineViewerUtils';

/**
* @module epics/shorelineviewer
*/

/**
 * Override the layout to get the correct right offset when the data catalog is open
 */
export const gnUpdateShorelineViewerMapLayoutEpic = (action$, store) => action$.ofType(UPDATE_MAP_LAYOUT, SET_CONTROL_PROPERTY)
    .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
    .filter(({ source }) => {
        return source !== LayoutSections.PANEL;
    })
    .map(({ layout }) => {
        const mapLayout = getConfigProp('mapLayout') || { left: { sm: 300, md: 500, lg: 600 }, right: { md: 658 }, bottom: { sm: 30 } };
        const action = updateMapLayout({
            ...mapLayoutSelector(store.getState()),
            ...layout,
            right: mapLayout.right.md,
            boundingMapRect: {
                ...(layout?.boundingMapRect || {}),
                right: mapLayout.right.md
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
            ),
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
            updateShorelineSelectedMediaType(null),
            shorelineSelectedFeature(null),
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
            return Rx.Observable.of(
                shorelineSelectedFeature(null),
                updateShorelineSelectedMediaType(null),
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
                        params: {
                            access_token: accessToken
                        }
                    }
                ),
                zoomToExtent(action.selectedRegion.extent, "EPSG:4326")
            );
        }
    );

export const selectShorelineFeatureEpic = (action$, store) => action$.ofType(CLICK_ON_MAP)
    .filter(() => store.getState().controls?.shorelineViewer?.enabled)
    .switchMap(({ point }) => {
        const queryLayers = [];
        for (const layer of store.getState().additionallayers) {
            if (layer.id === "shoreline-classification-layer" || layer.id === "shoreline-media-layer") {
                queryLayers.push(layer.options.name);
            }
        }
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
            (additionalLayer) => additionalLayer.options.name === layers[0])[0].options.url;
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
                .map((response) => shorelineSelectedFeature(response.features[0], mapProjection));
        }
        return Rx.Observable.empty();
    });

export const selectMediaFeatureEpic = (action$, store) => action$.ofType(SHORELINE_SELECTED_FEATURE)
    .filter((action) => action.selectedFeature)
    .filter(() => store.getState().shorelineViewer?.selectedFeature)
    .switchMap((action) => {
        const featureCoordinates = action.selectedFeature.geometry.coordinates;
        const featureGeometry = action.selectedFeature.geometry;
        let featureExtent;
        let coordinates;
        let featureStyle;
        if (featureGeometry.type === "MultiLineString") {
            const projectedLine = [];
            featureGeometry.coordinates[0].filter((coords) => {
                const projectedPoint = reproject(coords, action.selectedFeatureProjection, "EPSG:4326");
                projectedLine.push(projectedPoint);
            });
            featureExtent = extractBboxFromGeometry(projectedLine);
            coordinates = [projectedLine.map((coords) => [coords.x, coords.y])];
            featureStyle = DEFAULT_LINE_STYLE;
        } else if (featureGeometry.type === "Point") {
            const projectedPoint = reproject(featureCoordinates, action.selectedFeatureProjection, "EPSG:4326");
            coordinates = [projectedPoint.x, projectedPoint.y];
            featureStyle = DEFAULT_POINT_STYLE;
            featureExtent = [coordinates[0], coordinates[1], coordinates[0], coordinates[1]];
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

export const displayShorelineMediaLayerEpic = (action$, store) => action$.ofType(UPDATE_SHORELINE_SELECTED_MEDIA_TYPE)
    .filter((action) => action.selectedMediaType)
    .switchMap(
        (action) => {
            const state = store.getState();
            const layerName = (action.selectedMediaType.name === "Photos") ? state.shorelineViewer.selectedRegion.photoDataset : state.shorelineViewer.selectedRegion.videoLayerName;
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            return Rx.Observable.of(
                removeAdditionalLayer({ id: "shoreline-viewer-selected-feature" }),
                shorelineSelectedFeature(null),
                updateAdditionalLayer(
                    "shoreline-media-layer",
                    "ShorelineViewer",
                    "overlay",
                    {
                        layerId: "shoreline-viewer-selected-feature",
                        type: "wms",
                        url: `${geoserverUrl}wms`,
                        name: layerName,
                        format: "image/png8",
                        params: {
                            access_token: accessToken
                        }
                    }
                )
            );
        }
    );

export const loadSelectedMediaDatasetFeaturesEpic = (action$, store) => action$.ofType(UPDATE_ADDITIONAL_LAYER)
    .filter(() => store.getState().controls?.shorelineViewer?.enabled)
    .filter((action) => action.id === "shoreline-media-layer")
    .filter(() => store.getState().shorelineViewer?.selectedMediaType.name === "Photos")
    .switchMap(() => {
        const state = store.getState();
        const accessToken = state.security?.user?.info?.access_token;
        const shorelineMediaLayer = store.getState().additionallayers.filter((layer) => layer.id === "shoreline-media-layer")[0];
        const geoserverUrl = state.gnsettings?.geoserverUrl;
        const requestUrl = `${geoserverUrl}wfs`;
        const params = {
            service: "WFS",
            version: "1.1.0",
            request: "GetFeature",
            outputFormat: "application/json",
            sortBy: "name",
            access_token: accessToken
        };
        return Rx.Observable.fromPromise(getFeature(requestUrl, shorelineMediaLayer.options.name, params))
            .map((response) => loadSelectedMediaDatasetFeatures(response.data));
    });

export const selectFirstMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_FIRST_MEDIA_FEATURE)
    .switchMap(() => {
        const firstMediaFeature = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features[0];
        return Rx.Observable.of(
            shorelineSelectedFeature(firstMediaFeature, "EPSG:4269")
        );
    });

export const selectPreviousMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_PREVIOUS_MEDIA_FEATURE)
    .switchMap((action) => {
        const mediaFeatures = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features;
        const selectedFeatureName = action.selectedFeature.properties.name;
        const selectedFeatureIndex = mediaFeatures.findIndex((x) => x.properties.name === selectedFeatureName);
        const previousMediaFeature = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features[selectedFeatureIndex - 1];
        return Rx.Observable.of(
            shorelineSelectedFeature(previousMediaFeature, "EPSG:4269")
        );
    });

export const selectNextMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_NEXT_MEDIA_FEATURE)
    .switchMap((action) => {
        const mediaFeatures = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features;
        const selectedFeatureName = action.selectedFeature.properties.name;
        const selectedFeatureIndex = mediaFeatures.findIndex((x) => x.properties.name === selectedFeatureName);
        const nextMediaFeature = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features[selectedFeatureIndex + 1];
        return Rx.Observable.of(
            shorelineSelectedFeature(nextMediaFeature, "EPSG:4269")
        );
    });

export const selectLastMediaFeatureEpic = (action$, store) => action$.ofType(SELECT_LAST_MEDIA_FEATURE)
    .switchMap(() => {
        const mediaFeatures = store.getState().shorelineViewer?.selectedMediaDatasetFeatures?.features;
        const lastMediaFeature = mediaFeatures[mediaFeatures.length - 1];
        return Rx.Observable.of(
            shorelineSelectedFeature(lastMediaFeature, "EPSG:4269")
        );
    });

export const shorelineStartLoadingEpic = (action$, store) => action$.ofType(LAYER_LOADING)
    .filter(() => store.getState().controls?.shorelineViewer?.enabled)
    .filter((action) => !action.layerId)
    .switchMap(() => {
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

export default {
    gnUpdateShorelineViewerMapLayoutEpic,
    openShorelineViewerEpic,
    closeShorelineViewerEpic,
    zoomToSelectedShorelineRegionEpic,
    selectShorelineFeatureEpic,
    getShorelineFeatureInfoClickEpic,
    selectMediaFeatureEpic,
    displayShorelineMediaLayerEpic,
    loadSelectedMediaDatasetFeaturesEpic,
    selectFirstMediaFeatureEpic,
    selectPreviousMediaFeatureEpic,
    selectNextMediaFeatureEpic,
    selectLastMediaFeatureEpic,
    shorelineStartLoadingEpic,
    shorelineStopLoadingEpic
};

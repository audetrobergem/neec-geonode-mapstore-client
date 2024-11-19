/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import bbox from '@turf/bbox';
import uuid from "uuid";
import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import { changeDrawingStatus, CHANGE_DRAWING_STATUS } from '@mapstore/framework/actions/draw';
import { selectFeatures, selectLayer, formatFeatures, setZoneIdentifyLoading, SELECT_FEATURES, HIGHLIGHT_SELECTED_FEATURE, ZOOM_TO_SELECTED_FEATURE, ADD_LAYER_TO_MAP, FORMAT_SELECTION} from '@js/actions/zoneidentify';
import { mapLayoutSelector, boundingSidebarRectSelector } from '@mapstore/framework/selectors/maplayout';
import { getConfigProp } from "@mapstore/framework/utils/ConfigUtils";
import { LayoutSections } from "@js/utils/LayoutUtils";
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';
import { getFeature } from '@mapstore/framework/api/WFS';
import { zoomToExtent } from '@mapstore/framework/actions/map';
import { removeAdditionalLayer, updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import { addLayer } from '@mapstore/framework/actions/layers';
import { reproject } from '@mapstore/framework/utils/CoordinatesUtils';

/**
* @module epics/shorelineviewer
*/

export const POINT_STYLE = {
    radius: 10,
    weight: 3,
    color: '#33eeff',
    opacity: 1,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

export const LINE_STYLE = {
    weight: 8,
    color: '#33eeff',
    opacity: 0.8,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

export const POLY_STYLE = {
    weight: 3,
    color: '#33eeff',
    opacity: 0.8,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

/**
 * Override the layout to get the correct right offset when the data catalog is open
 */
export const gnUpdateZoneIdentifyMapLayoutEpic = (action$, store) => action$.ofType(UPDATE_MAP_LAYOUT)
    .filter(() => store.getState()?.controls?.zoneIdentify?.enabled)
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


export const openZoneIdentifyEpic = (action$, store) => action$.ofType(SET_CONTROL_PROPERTY)
    .filter((action) => action.control === "zoneIdentify")
    .filter(() => store.getState()?.controls?.zoneIdentify?.enabled)
    .switchMap(() => {
        return Rx.Observable.of(
            purgeMapInfoResults(),
            hideMapinfoMarker(),
            toggleMapInfoState(),
            selectFeatures(null),
            selectLayer("visible_layers"),
            formatFeatures(null)
        );
    });


export const closeZoneIdentifyEpic = (action$) => action$.ofType(SET_CONTROL_PROPERTY)
    .filter((action) => action.control === "zoneIdentify")
    .filter((action) => action.property === "enabled" && action.value === false)
    .switchMap(() => {
        return Rx.Observable.of(
            toggleMapInfoState(),
            selectFeatures(null),
            selectLayer(null),
            formatFeatures(null),
            removeAdditionalLayer({ owner: "ZoneIdentify" }),
            changeDrawingStatus("clean", "", "zoneIdentify", [], {})
        );
    });

export const getFeaturesInfoClickEpic = (action$, store) => action$.ofType(CHANGE_DRAWING_STATUS)
    .filter((action) => action.owner === "zoneIdentify" && action.status === "stop")
    .switchMap(({ features }) => {
        const state = store.getState();
        let layerNames;
        if (state.zoneIdentify.selectedLayer === "visible_layers") {
            const layerList = state.layers.flat.filter((layer) => 
                layer.visibility === true && 
                layer.type === "wms" && 
                layer.group !== "background" &&
                layer.name.includes("neec_geodb") &&
                layer.loadingError !== "Error"
            );
            layerNames = layerList.map((layer) => layer.name);
        } else {
            layerNames = state.zoneIdentify.selectedLayer;
        }
        const accessToken = state.security?.user?.info?.access_token;
        const mapProjection = state.map.present.projection;
        const geoserverUrl = state.gnsettings?.geoserverUrl;
        const requestUrl = `${geoserverUrl}wfs`;

        const params = {
            service: "WFS",
            version: "1.1.0",
            request: "GetFeature",
            outputFormat: "application/json",
            bbox: features[0].extent.join(',') + ',' + mapProjection,
            access_token: accessToken
        };
        return Rx.Observable.fromPromise(getFeature(requestUrl, layerNames.toString(), params))
            .map((response) => selectFeatures(response.data.features));
    });

export const cleanSelectionEpic = (action$) => action$.ofType(CHANGE_DRAWING_STATUS)
    .filter((action) => action.owner === "zoneIdentify" && action.status === "clean")
    .switchMap(() => {
        return Rx.Observable.of(
            selectFeatures(null),
            formatFeatures(null),
            removeAdditionalLayer({ owner: "ZoneIdentify" })
        );
    });


export const convertFeaturesForTreeEpic = (action$, store) => action$.ofType(SELECT_FEATURES)
    .filter((action) => action.selectedFeatures != null)
    .switchMap((action) => {
        const state = store.getState();
        const selectedFeatures = action.selectedFeatures;
        const layerList = state.layers.flat.filter((layer) => layer.visibility === true && layer.type === "wms" && layer.group !== "background");
        const formattedSelectedFeatures = [];
        let i = 1;
        layerList.forEach((layer) => {
            let j = 1;
            const layerName = layer.name.split(":")[1];
            const layerTitle = layer.title;
            const children = [];
            selectedFeatures.forEach((feature) => {
                if (feature.id.includes(layerName)) {
                    let featureTitle;
                    if (state.locale.current === "en-US") {
                        featureTitle = feature.properties.label_en && feature.properties.label_en !== null ? feature.properties.label_en : feature.properties.name_en;
                    } else {
                        featureTitle = feature.properties.label_fr && feature.properties.label_fr !== null ? feature.properties.label_fr : feature.properties.name_fr;
                    }
                    const child = {
                        id: i + "-" + j,
                        title: featureTitle,
                        geometry: feature.geometry,
                        properties: feature.properties
                    };
                    j ++;
                    children.push(child);
                }
            });
            if (children.length > 0) {
                const parent = {
                    id: i,
                    name: layerName,
                    title: layerTitle,
                    children: children
                };
                i ++;
                formattedSelectedFeatures.push(parent);
            }
        });
        return Rx.Observable.of(
            formatFeatures(formattedSelectedFeatures)
        );
    });

export const highlightSelectedFeatureEpic = (action$) => action$.ofType(HIGHLIGHT_SELECTED_FEATURE)
    .switchMap((action) => {
        let style;
        if (["Point", "POINT", "MultiPoint"].includes(action.selectedFeature.type)) {
            style = POINT_STYLE;
        } else if (["LINE", "Line", "MultiLineString"].includes(action.selectedFeature.type)) {
            style = LINE_STYLE;
        } else if (["POLYGON", "Polygon", "MultiPolygon"].includes(action.selectedFeature.type)) {
            style = POLY_STYLE;
        }
        return Rx.Observable.of(
            updateAdditionalLayer(
                "zone-identify-selected-feature",
                "ZoneIdentify",
                'overlay',
                {
                    id: "zone-identify-selected-feature",
                    name: "zone-identify-selected-feature",
                    type: "vector",
                    features: [
                        {
                            type: "Feature",
                            properties: {},
                            geometry: {
                                type: action.selectedFeature.type,
                                coordinates: action.selectedFeature.coordinates
                            },
                            style: style
                        }
                    ]
                }
            )
        );
    });

export const zoomToSelectedFeatureEpic = (action$) => action$.ofType(ZOOM_TO_SELECTED_FEATURE)
    .switchMap((action) => {
        return Rx.Observable.of(
            zoomToExtent(bbox(action.selectedFeature), "EPSG:4326", 17)
        );
    });

export const addExtentToMapEpic = (action$) => action$.ofType(ADD_LAYER_TO_MAP)
    .switchMap((action) => {
        const extentLayer = {
            "id": "zoneidentify:" + uuid(),
            "title": "Query Extent",
            "type": "vector",
            "features": [
                {
                    "type": "Feature",
                    "id": uuid(),
                    "properties": {
                        "name": "Query Extent"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [action.layer.coordinates[0].map((coordinates) => reproject(coordinates, "EPSG:3857", "EPSG:4326"))
                            .map((coordinates) => [coordinates.x, coordinates.y])]
                    }
                }
            ],
            "style": {
                "format": "geostyler",
                "body": {
                    "rules": [
                        {
                            "name": "Query Extent",
                            "symbolizers": [
                                {
                                    "symbolizerId": "d4f18121-501f-11ef-952e-5f52f1343b22",
                                    "kind": "Fill",
                                    "color": "#eb0951",
                                    "fillOpacity": 0.1,
                                    "outlineColor": "#eb0951",
                                    "outlineWidth": 2,
                                    "msClassificationType": "both"
                                }
                            ]
                        }
                    ]
                }
            },
            "visibility": true,
            "invalidFeatures": null
        };
        return Rx.Observable.of(
            addLayer(extentLayer)
        );
    });

export const zoneIdentifyStartLoadingEpic = (action$) => action$.ofType(CHANGE_DRAWING_STATUS)
    .filter((action) => action.owner === "zoneIdentify" && action.status === "stop")
    .switchMap(() => {
        return Rx.Observable.of(
            setZoneIdentifyLoading(true)
        );
    });
export const zoneIdentifyStopLoadingEpic = (action$, store) => action$.ofType(FORMAT_SELECTION)
    .filter(() => store.getState().controls?.zoneIdentify?.enabled)
    .switchMap(() => {
        return Rx.Observable.of(
            setZoneIdentifyLoading(false)
        );
    });

export default {
    gnUpdateZoneIdentifyMapLayoutEpic,
    openZoneIdentifyEpic,
    closeZoneIdentifyEpic,
    getFeaturesInfoClickEpic,
    cleanSelectionEpic,
    convertFeaturesForTreeEpic,
    highlightSelectedFeatureEpic,
    zoomToSelectedFeatureEpic,
    addExtentToMapEpic,
    zoneIdentifyStartLoadingEpic,
    zoneIdentifyStopLoadingEpic
};

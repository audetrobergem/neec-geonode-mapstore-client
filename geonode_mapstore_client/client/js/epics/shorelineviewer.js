import Rx from 'rxjs';
import axios from '@mapstore/framework/libs/ajax';

import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import {
    registerEventListener,
    unRegisterEventListener,
    zoomToExtent,
    CLICK_ON_MAP
} from '@mapstore/framework/actions/map';
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
    loadVideo,
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
    LOAD_VIDEO,
    SET_SHORELINE_LABELS_VISIBLE,
    SET_SHORELINE_VALIDATION_VISIBLE
} from '@js/actions/shorelineviewer';
import { getFeatureInfo } from '@mapstore/framework/api/identify';
import { getFeature } from '@mapstore/framework/api/WFS';
import { projectionSelector } from '@mapstore/framework/selectors/map';
import { mapLayoutSelector, boundingSidebarRectSelector } from '@mapstore/framework/selectors/maplayout';
import { LayoutSections } from '@js/utils/LayoutUtils';
import { updatePointWithGeometricFilter } from '@mapstore/framework/utils/IdentifyUtils';
import { reproject } from '@mapstore/framework/utils/CoordinatesUtils';
import {
    extractRegionsBbox,
    extractBboxFromGeometry,
    generateExtentLayer
} from '@js/utils/ShorelineViewerUtils';

// ---------------------------------------------------------------------------
// Shared style definitions (module-level constants, never mutated)
// ---------------------------------------------------------------------------

const selectionStyle = {
    format: 'geostyler',
    body: {
        rules: [
            {
                filter: ['==', 'geomType', 'point'],
                name: 'Selected Point',
                symbolizers: [
                    {
                        kind: 'Mark',
                        color: '#33eeff',
                        fillOpacity: 0.5,
                        strokeColor: '#33eeff',
                        strokeOpacity: 0.9,
                        radius: 11
                    }
                ]
            },
            {
                filter: ['==', 'geomType', 'line'],
                name: 'Selected Line',
                symbolizers: [
                    {
                        kind: 'Line',
                        color: '#33eeff',
                        opacity: 0.5,
                        width: 11
                    }
                ]
            }
        ]
    }
};

const extentStyle = {
    format: 'geostyler',
    body: {
        rules: [
            {
                filter: ['==', 'type', 'project'],
                symbolizers: [
                    {
                        kind: 'Fill',
                        outlineWidth: 2,
                        outlineOpacity: 1,
                        outlineColor: '#6a0ced'
                    }
                ]
            },
            {
                filter: ['==', 'type', 'region'],
                symbolizers: [
                    {
                        kind: 'Fill',
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
 * Build a video-position style with the correct static asset URL and optional
 * COG (course over ground) rotation. Returns a new object each time so the
 * module-level constant is never mutated.
 * @param {string} geonodeUrl
 * @param {number} [cog]
 */
const buildVideoStyle = (geonodeUrl, cog) => ({
    format: 'geostyler',
    body: {
        rules: [
            {
                symbolizers: [
                    {
                        kind: 'Icon',
                        size: 32,
                        image: `${geonodeUrl}static/mapstore/symbols/video-position.png`,
                        ...(cog !== undefined && cog !== null ? { rotate: cog } : {})
                    }
                ]
            }
        ]
    }
});

// ---------------------------------------------------------------------------
// Helper: build the WMS additional-layer options object
// ---------------------------------------------------------------------------
const buildWmsLayerOptions = (geoserverUrl, layerName, stylesParam, accessToken) => ({
    type: 'wms',
    url: `${geoserverUrl}wms`,
    name: layerName,
    format: 'image/png8',
    singleTile: true,
    params: {
        access_token: accessToken,
        ...(stylesParam ? { STYLES: stylesParam } : {})
    }
});

// ---------------------------------------------------------------------------
// Helper: build a vector additional-layer options object for a selected feature
// ---------------------------------------------------------------------------
const buildVectorSelectionLayer = (featureGeometry, coordinates, properties, style) => ({
    id: 'shoreline-viewer-selected-feature',
    name: 'shoreline-viewer-selected-feature',
    type: 'vector',
    features: [
        {
            type: 'Feature',
            properties,
            geometry: {
                type: featureGeometry.type,
                coordinates
            }
        }
    ],
    style
});

/**
 * @module epics/shorelineviewer
 */

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Override the map layout to reserve space for the right-hand panel while
 * the ShorelineViewer is open.
 */
export const gnUpdateShorelineViewerMapLayoutEpic = (action$, store) =>
    action$
        .ofType(UPDATE_MAP_LAYOUT)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .filter(({ source }) => source !== LayoutSections.PANEL)
        .map(({ layout }) => {
            const mapLayout = {
                left: { sm: 300, md: 500, lg: 600 },
                right: { md: 550 },
                bottom: { sm: 30 }
            };
            const state = store.getState();
            const boundingSidebarRect = boundingSidebarRectSelector(state);
            const left = state?.controls?.drawer?.enabled
                ? mapLayout.left.sm
                : null;
            const action = updateMapLayout({
                ...mapLayoutSelector(state),
                ...layout,
                right: mapLayout.right.md,
                ...(left && { left }),
                boundingMapRect: {
                    ...(layout?.boundingMapRect || {}),
                    right: mapLayout.right.md,
                    ...(left && { left })
                },
                boundingSidebarRect: {
                    ...boundingSidebarRect,
                    ...layout.boundingSidebarRect
                }
            });
            return { ...action, source: LayoutSections.PANEL };
        });

// ---------------------------------------------------------------------------
// Open / close
// ---------------------------------------------------------------------------

/**
 * When the plugin opens: disable the standard identify tool, register the
 * click listener, and add the region-extent overlay layer.
 */
export const openShorelineViewerEpic = (action$, store) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === 'shorelineViewer')
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const shorelineViewerConfig = state.localConfig.plugins.map_viewer
                .find(({ name }) => name === 'ShorelineViewer');

            const regionFeatures = shorelineViewerConfig.cfg.regions.map((region) => ({
                type: 'Feature',
                properties: { type: 'region' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [region.extent[0], region.extent[1]],
                        [region.extent[0], region.extent[3]],
                        [region.extent[2], region.extent[3]],
                        [region.extent[2], region.extent[1]],
                        [region.extent[0], region.extent[1]]
                    ]]
                }
            }));

            return Rx.Observable.of(
                purgeMapInfoResults(),
                hideMapinfoMarker(),
                toggleMapInfoState(),
                registerEventListener('click', 'shorelineViewer'),
                updateAdditionalLayer(
                    'shoreline-viewer-extents',
                    'ShorelineViewer',
                    'overlay',
                    {
                        id: 'shoreline-viewer-extents',
                        name: 'shoreline-viewer-extents',
                        type: 'vector',
                        features: regionFeatures,
                        disableResolutionLimits: false,
                        minResolution: 611.49622628141,
                        style: extentStyle
                    }
                )
            );
        });

/**
 * When the plugin closes: re-enable identify, remove all plugin layers, and
 * reset all relevant state slices to null / defaults.
 */
export const closeShorelineViewerEpic = (action$) =>
    action$
        .ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === 'shorelineViewer')
        .filter((action) => action.property === 'enabled' && action.value === false)
        .switchMap(() =>
            Rx.Observable.of(
                removeAdditionalLayer({ owner: 'ShorelineViewer' }),
                setShorelineRegion(null),
                setShorelineThematic(null),
                updateShorelineSelectedMediaType(null),
                shorelineSelectedFeature(null),
                setVideoInformations(null),
                loadSelectedMediaDatasetFeatures(null),
                toggleMapInfoState(),
                unRegisterEventListener('click', 'shorelineViewer')
            )
        );

// ---------------------------------------------------------------------------
// Zoom
// ---------------------------------------------------------------------------

/**
 * Zoom to the selected region, or to the bounding box of all regions when
 * none is selected.
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
                    zoomToExtent(selectedRegion.extent, 'EPSG:4326')
                );
            }

            const shorelineViewerConfig = state.localConfig.plugins.map_viewer
                .find(({ name }) => name === 'ShorelineViewer');
            return Rx.Observable.of(
                zoomToExtent(
                    extractRegionsBbox(shorelineViewerConfig.cfg.regions),
                    'EPSG:4326'
                )
            );
        });

// ---------------------------------------------------------------------------
// Region selection
// ---------------------------------------------------------------------------

/**
 * When a region is selected: reset transient state and display the shoreline
 * classification WMS layer using the current (or default) thematic style.
 */
export const zoomToSelectedShorelineRegionEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_REGION)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            // null means "clear region" – nothing to display
            if (!action.selectedRegion) {
                return Rx.Observable.empty();
            }
            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const selectedThematic = state.shorelineViewer.selectedThematic
                ?? action.selectedRegion.thematics[0];

            return Rx.Observable.of(
                shorelineSelectedFeature(null),
                updateShorelineSelectedMediaType(null),
                setShorelineThematic(selectedThematic),
                removeAdditionalLayer({ id: 'shoreline-viewer-selected-feature' }),
                removeAdditionalLayer({ id: 'shoreline-classification-layer' }),
                updateAdditionalLayer(
                    'shoreline-classification-layer',
                    'ShorelineViewer',
                    'overlay',
                    buildWmsLayerOptions(
                        geoserverUrl,
                        action.selectedRegion.shorelineClassificationDataset,
                        selectedThematic.thematicName,
                        accessToken
                    )
                )
            );
        });

// ---------------------------------------------------------------------------
// Map click → GetFeatureInfo
// ---------------------------------------------------------------------------

/**
 * Intercept map clicks while the plugin is active and dispatch a
 * SHORELINE_FEATURE_INFO_CLICK with the relevant queryable layers.
 *
 * Layer priority (first in array = queried first, wins on hit):
 *   1. Validation layer  (when visible)
 *   2. Media layers      (when a media type is active)
 *   3. Classification layer
 */
export const selectShorelineFeatureEpic = (action$, store) =>
    action$
        .ofType(CLICK_ON_MAP)
        .filter(() => store.getState().controls?.shorelineViewer?.enabled)
        .switchMap(({ point }) => {
            const state = store.getState();
            const validationLayers = [];
            const mediaLayers = [];
            const classificationLayers = [];

            state.additionallayers.forEach((additionalLayer) => {
                if (additionalLayer.id === 'shoreline-validation-layer') {
                    // Validation has highest priority – goes first
                    validationLayers.push(additionalLayer.options.name);
                } else if (additionalLayer.id === 'shoreline-classification-layer') {
                    classificationLayers.push(additionalLayer.options.name);
                } else if (additionalLayer.id.includes('shoreline-media-layer-wms')) {
                    additionalLayer.options.name
                        .split(',')
                        .forEach((layer) => mediaLayers.push(layer));
                }
            });

            // Build the ordered list: validation → media → classification
            const queryLayers = [
                ...validationLayers,
                ...mediaLayers,
                ...classificationLayers
            ];

            if (queryLayers.length === 0) {
                return Rx.Observable.empty();
            }

            const projection = projectionSelector(state);
            const updatedPoint = updatePointWithGeometricFilter(point, projection);
            return Rx.Observable.of(
                shorelineFeatureInfoClick(updatedPoint, queryLayers)
            );
        });

/**
 * Perform the WMS GetFeatureInfo request and, when a feature is found,
 * dispatch SHORELINE_SELECTED_FEATURE (and optionally load all dataset
 * features for navigation).
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

            const matchingLayer = state.additionallayers.find(
                (l) => l.options.name.includes(layers[0])
            );
            const url = matchingLayer?.options?.url;

            if (!url) {
                return Rx.Observable.empty();
            }

            const mapBbox = [
                mapExtent.bounds.minx,
                mapExtent.bounds.miny,
                mapExtent.bounds.maxx,
                mapExtent.bounds.maxy
            ];

            const params = {
                service: 'WMS',
                version: '1.1.1',
                request: 'GetFeatureInfo',
                info_format: 'application/json',
                layers: layers.join(','),
                query_layers: layers.join(','),
                access_token: accessToken,
                bbox: mapBbox.join(','),
                srs: mapExtent.crs,
                x: String(Math.round(point.pixel.x)),
                y: String(Math.round(point.pixel.y)),
                height: String(mapSize.height),
                width: String(mapSize.width)
            };

            return getFeatureInfo(url, params, layers)
                .switchMap((response) => {
                    if (!response.features || response.features.length === 0) {
                        return Rx.Observable.empty();
                    }

                    const feature = response.features[0];
                    const selectedLayer = feature.id.substring(
                        0,
                        feature.id.indexOf('.')
                    );
                    const svState = state.shorelineViewer;

                    const makeSelectedFeatureAction = () =>
                        shorelineSelectedFeature({
                            selectedFeature: feature,
                            selectedLayer,
                            selectedFeatureProjection: mapProjection,
                            trigger: 'SHORELINE_FEATURE_INFO_CLICK'
                        });

                    // ---- Validation layer (highest priority) ----
                    if (
                        svState.selectedRegion?.shorelineValidationDataset
                            ?.includes(selectedLayer)
                    ) {
                        return Rx.Observable.of(makeSelectedFeatureAction());
                    }

                    // ---- Shoreline classification layer ----
                    if (
                        svState.selectedRegion.shorelineClassificationDataset
                            .includes(selectedLayer)
                    ) {
                        return Rx.Observable.of(makeSelectedFeatureAction());
                    }

                    // ---- Media layer – data already in memory ----
                    const loadedFeatures = svState.selectedMediaDatasetFeatures;
                    if (
                        loadedFeatures &&
                        loadedFeatures.features[0]?.id?.includes(selectedLayer)
                    ) {
                        const isPhotos =
                            svState.selectedMediaType?.name === 'Photos';
                        const isSameVideoFile =
                            loadedFeatures.features[0].properties.filename ===
                            feature.properties.filename;

                        if (isPhotos || isSameVideoFile) {
                            return Rx.Observable.of(makeSelectedFeatureAction());
                        }
                    }

                    // ---- Media layer – need to fetch dataset features ----
                    const geoserverUrl = state.gnsettings?.geoserverUrl;
                    const wfsParams = {
                        service: 'WFS',
                        version: '1.1.0',
                        request: 'GetFeature',
                        outputFormat: 'application/json',
                        access_token: accessToken,
                        ...(svState.selectedMediaType?.name === 'Videos'
                            ? { CQL_FILTER: `filename = '${feature.properties.filename}'` }
                            : {})
                    };

                    return Rx.Observable.fromPromise(
                        getFeature(`${geoserverUrl}wfs`, selectedLayer, wfsParams)
                    )
                        .switchMap((resp) =>
                            Rx.Observable.of(
                                loadSelectedMediaDatasetFeatures(resp.data),
                                makeSelectedFeatureAction()
                            )
                        )
                        .catch((err) =>
                            Rx.Observable.of(
                                error({
                                    uid: 'getFeatureError',
                                    title: 'shorelineViewer.notifications.error',
                                    message: err.message,
                                    autoDismiss: 0,
                                    position: 'tr'
                                })
                            )
                        );
                })
                .catch((err) =>
                    Rx.Observable.of(
                        error({
                            uid: 'getFeatureInfoError',
                            title: 'shorelineViewer.notifications.error',
                            message: err.message,
                            autoDismiss: 0,
                            position: 'tr'
                        })
                    )
                );
        });

// ---------------------------------------------------------------------------
// Feature selection → map update
// ---------------------------------------------------------------------------

/**
 * When a feature is selected (by click or video playback), update the
 * selection overlay layer and optionally zoom / load a video.
 *
 * Coordinate handling:
 * - Features coming from a WMS GetFeatureInfo click arrive in the map's
 *   current projection (e.g. EPSG:3857) and need reprojecting to EPSG:4326.
 * - Features coming from a WFS GetFeature response (navigation, initial
 *   dataset load) are already in EPSG:4326 and must NOT be reprojected.
 * - We detect which case we are in by comparing selectedFeatureProjection
 *   to 'EPSG:4326'. When they match, we skip reproject().
 */
export const selectMediaFeatureEpic = (action$, store) =>
    action$
        .ofType(SHORELINE_SELECTED_FEATURE)
        .filter((action) => !!action.selectedFeature)
        .filter(() => !!store.getState().shorelineViewer?.selectedFeature)
        .switchMap((action) => {
            const state = store.getState();
            const { selectedMediaType, selectedRegion, videoInformations } =
                state.shorelineViewer;
            const mediaTypeName = selectedMediaType?.name;
            const featureGeometry =
                action.selectedFeature.selectedFeature.geometry;
            const featureCoordinates = featureGeometry.coordinates;
            const featureProjection =
                action.selectedFeature.selectedFeatureProjection;

            // Only reproject when the source CRS is not already EPSG:4326.
            // WFS responses come back in EPSG:4326; WMS GetFeatureInfo
            // responses come back in the map projection (e.g. EPSG:3857).
            const needsReprojection =
                featureProjection &&
                featureProjection.toUpperCase() !== 'EPSG:4326';

            // ---- Normalise geometry to EPSG:4326 ----
            let coordinates;
            let featureExtent;
            let featureProperties;

            if (featureGeometry.type === 'MultiLineString') {
                const rawCoords = featureGeometry.coordinates[0];
                const projectedLine = needsReprojection
                    ? rawCoords.map((coords) =>
                        reproject(coords, featureProjection, 'EPSG:4326')
                    )
                    : rawCoords.map((coords) => ({ x: coords[0], y: coords[1] }));

                featureExtent = extractBboxFromGeometry(projectedLine);
                coordinates = [projectedLine.map((c) => [c.x, c.y])];
                featureProperties = { geomType: 'line' };

            } else if (featureGeometry.type === 'Point') {
                let x; let y;
                if (needsReprojection) {
                    const projectedPoint = reproject(
                        featureCoordinates,
                        featureProjection,
                        'EPSG:4326'
                    );
                    x = projectedPoint.x;
                    y = projectedPoint.y;
                } else {
                    // Coordinates are already [lng, lat] in EPSG:4326
                    x = featureCoordinates[0];
                    y = featureCoordinates[1];
                }
                coordinates = [x, y];
                featureProperties = { geomType: 'point' };
                featureExtent = [x, y, x, y];
            }

            const isVideoLayer =
                mediaTypeName === 'Videos' &&
                selectedRegion.videoDatasets.some(
                    (l) => l.datasetName === action.selectedFeature.selectedLayer
                );

            // ---- Video layer ----
            if (isVideoLayer) {
                const cog =
                    action.selectedFeature.selectedFeature.properties.cog;
                const videoStyle = buildVideoStyle(
                    state.gnsettings?.geonodeUrl,
                    cog
                );
                const overlayActions = [
                    updateAdditionalLayer(
                        'shoreline-viewer-selected-feature',
                        'ShorelineViewer',
                        'overlay',
                        buildVectorSelectionLayer(
                            featureGeometry,
                            coordinates,
                            {},
                            videoStyle
                        )
                    )
                ];

                // Triggered by video time-update: only move the marker, no zoom
                if (action.selectedFeature.trigger === 'UPDATE_VIDEO_INFORMATION') {
                    return Rx.Observable.of(...overlayActions);
                }

                return Rx.Observable.of(
                    ...overlayActions,
                    zoomToExtent(featureExtent, 'EPSG:4326', 15),
                    loadVideo(
                        action.selectedFeature.selectedFeature.properties.filename
                    )
                );
            }

            // ---- Shoreline classification layer (clear active video) ----
            if (
                videoInformations &&
                selectedRegion.shorelineClassificationDataset.includes(
                    action.selectedFeature.selectedLayer
                )
            ) {
                return Rx.Observable.of(
                    setVideoInformations(null),
                    updateAdditionalLayer(
                        'shoreline-viewer-selected-feature',
                        'ShorelineViewer',
                        'overlay',
                        buildVectorSelectionLayer(
                            featureGeometry,
                            coordinates,
                            featureProperties,
                            selectionStyle
                        )
                    ),
                    zoomToExtent(featureExtent, 'EPSG:4326', 14)
                );
            }

            // ---- Default (photo or classification without active video) ----
            return Rx.Observable.of(
                updateAdditionalLayer(
                    'shoreline-viewer-selected-feature',
                    'ShorelineViewer',
                    'overlay',
                    buildVectorSelectionLayer(
                        featureGeometry,
                        coordinates,
                        featureProperties,
                        selectionStyle
                    )
                ),
                zoomToExtent(featureExtent, 'EPSG:4326', 14)
            );
        });

// ---------------------------------------------------------------------------
// Media type toggle
// ---------------------------------------------------------------------------

/**
 * When the user toggles a media type (Photos / Videos):
 * - If activating: add the coverage bbox layer and the WMS point layer.
 * - If deactivating (null): remove all media layers and reset related state.
 */
export const displayShorelineMediaLayerEpic = (action$, store) =>
    action$
        .ofType(UPDATE_SHORELINE_SELECTED_MEDIA_TYPE)
        .switchMap((action) => {
            if (!action.selectedMediaType) {
                return Rx.Observable.of(
                    removeAdditionalLayer({ id: 'shoreline-viewer-selected-feature' }),
                    removeAdditionalLayer({ id: 'shoreline-media-layer-bbox' }),
                    removeAdditionalLayer({ id: 'shoreline-media-layer-wms' }),
                    shorelineSelectedFeature(null),
                    setVideoInformations(null),
                    loadSelectedMediaDatasetFeatures(null)
                );
            }

            const state = store.getState();
            const isPhotos = action.selectedMediaType.name === 'Photos';
            const layerList = isPhotos
                ? state.shorelineViewer.selectedRegion.photoDatasets
                : state.shorelineViewer.selectedRegion.videoDatasets;
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const layerNames = layerList.map((l) => l.datasetName).join(',');

            return Rx.Observable.of(
                shorelineSelectedFeature(null),
                setVideoInformations(null),
                removeAdditionalLayer({ id: 'shoreline-viewer-selected-feature' }),
                removeAdditionalLayer({ id: 'shoreline-media-layer-wms' }),
                updateAdditionalLayer(
                    'shoreline-media-layer-bbox',
                    'ShorelineViewer',
                    'overlay',
                    {
                        id: 'shoreline-media-layer-bbox',
                        name: 'shoreline-media-layer-bbox',
                        type: 'vector',
                        features: generateExtentLayer(layerList),
                        disableResolutionLimits: false,
                        minResolution: 152.8740565703525,
                        style: extentStyle
                    }
                ),
                updateAdditionalLayer(
                    'shoreline-media-layer-wms',
                    'ShorelineViewer',
                    'overlay',
                    {
                        layerId: 'shoreline-media-layer-wms',
                        ...buildWmsLayerOptions(
                            geoserverUrl,
                            layerNames,
                            null,
                            accessToken
                        ),
                        disableResolutionLimits: false,
                        maxResolution: 152.8740565703525
                    }
                )
            );
        });

// ---------------------------------------------------------------------------
// Photo navigation
// ---------------------------------------------------------------------------

/**
 * Shared factory for the four photo-navigation epics.
 *
 * The source projection for WFS features is read from the map state so we
 * never have to hardcode a CRS string. `selectMediaFeatureEpic` will then
 * reproject from that CRS to EPSG:4326 before placing the marker.
 *
 * @param {string}   actionType       - the action type this epic listens to
 * @param {Function} getTargetFeature - (action, features) => feature | null
 */
const makeNavigationEpic = (actionType, getTargetFeature) => (action$, store) =>
    action$
        .ofType(actionType)
        .switchMap((action) => {
            const state = store.getState();
            const features =
                state.shorelineViewer?.selectedMediaDatasetFeatures?.features;
            const selectedLayer = state.shorelineViewer.selectedLayer;

            // WFS GetFeature responses are always returned in EPSG:4326.
            // Passing this explicitly tells selectMediaFeatureEpic to skip
            // reprojection for navigation-triggered feature selections.
            const selectedFeatureProjection = 'EPSG:4326';

            const targetFeature = getTargetFeature(action, features);
            if (!targetFeature) {
                return Rx.Observable.empty();
            }

            return Rx.Observable.of(
                shorelineSelectedFeature({
                    selectedFeature: targetFeature,
                    selectedLayer,
                    selectedFeatureProjection,
                    trigger: actionType
                })
            );
        });

export const selectFirstMediaFeatureEpic = makeNavigationEpic(
    SELECT_FIRST_MEDIA_FEATURE,
    (_action, features) => features?.[0]
);

export const selectLastMediaFeatureEpic = makeNavigationEpic(
    SELECT_LAST_MEDIA_FEATURE,
    (_action, features) => features?.[features.length - 1]
);

export const selectPreviousMediaFeatureEpic = makeNavigationEpic(
    SELECT_PREVIOUS_MEDIA_FEATURE,
    (action, features) => {
        const idx = features.findIndex(
            (f) => f.properties.name === action.selectedFeature.properties.name
        );
        return idx > 0 ? features[idx - 1] : null;
    }
);

export const selectNextMediaFeatureEpic = makeNavigationEpic(
    SELECT_NEXT_MEDIA_FEATURE,
    (action, features) => {
        const idx = features.findIndex(
            (f) => f.properties.name === action.selectedFeature.properties.name
        );
        return idx >= 0 && idx < features.length - 1
            ? features[idx + 1]
            : null;
    }
);

// ---------------------------------------------------------------------------
// Loading indicator
// ---------------------------------------------------------------------------

/**
 * Show the spinner when a plugin-owned layer starts loading.
 * Suppressed during video playback to avoid flickering.
 */
export const shorelineStartLoadingEpic = (action$, store) =>
    action$
        .ofType(LAYER_LOADING)
        .filter(() => store.getState().controls?.shorelineViewer?.enabled)
        .filter((action) => !action.layerId)
        .switchMap(() => {
            const { videoInformations } = store.getState().shorelineViewer;
            const isPlaying = videoInformations?.status === 'play';
            return Rx.Observable.of(setShorelineLoading(!isPlaying));
        });

/**
 * Hide the spinner when a plugin-owned layer finishes loading.
 */
export const shorelineStopLoadingEpic = (action$, store) =>
    action$
        .ofType(LAYER_LOAD)
        .filter(() => store.getState().controls?.shorelineViewer?.enabled)
        .filter((action) => !action.layerId)
        .mapTo(setShorelineLoading(false));

// ---------------------------------------------------------------------------
// Thematic change
// ---------------------------------------------------------------------------

/**
 * Apply a new WMS style to the shoreline classification layer.
 *
 * When the user switches back to the first (Shoreline Type) thematic and the
 * "Show labels" checkbox was already checked, the labels style is applied
 * immediately so the map stays consistent with the UI state.
 *
 * The labels style is only meaningful for the first thematic, so for any
 * other thematic the plain thematicName is always used regardless of the
 * labelsVisible flag.
 */
export const changeShorelineThematicEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_THEMATIC)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            if (!action.selectedThematic) {
                return Rx.Observable.empty();
            }

            const state = store.getState();
            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const { selectedRegion, labelsVisible } = state.shorelineViewer;

            // Labels are only available for the first thematic (Shoreline Type).
            // For every other thematic, always use the plain style name.
            const isFirstThematic =
                selectedRegion?.thematics?.[0]?.id === action.selectedThematic.id;
            const stylesParam =
                isFirstThematic && labelsVisible
                    ? `${action.selectedThematic.thematicName}_labels`
                    : action.selectedThematic.thematicName;

            return Rx.Observable.of(
                removeAdditionalLayer({ id: 'shoreline-classification-layer' }),
                updateAdditionalLayer(
                    'shoreline-classification-layer',
                    'ShorelineViewer',
                    'overlay',
                    buildWmsLayerOptions(
                        geoserverUrl,
                        state.shorelineViewer.selectedRegion
                            .shorelineClassificationDataset,
                        stylesParam,
                        accessToken
                    )
                )
            );
        });

// ---------------------------------------------------------------------------
// Video loading
// ---------------------------------------------------------------------------

/**
 * Load the HLS URI for the selected video via the GeoNode Vimeo proxy.
 * If the same file is already loaded but the time differs, seek directly.
 */
export const loadVideoEpic = (action$, store) =>
    action$
        .ofType(LOAD_VIDEO)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const selectedFeature = state.shorelineViewer.selectedFeature;
            const videoInformation = state.shorelineViewer.videoInformations;
            const featureTime =
                selectedFeature?.selectedFeature?.properties?.time;

            // Same file already loaded: just seek if the time changed
            if (videoInformation?.fileName === action.fileName) {
                if (featureTime !== videoInformation.time) {
                    const videoEl = document.querySelector('video');
                    if (videoEl) {
                        videoEl.currentTime = featureTime;
                    }
                    return Rx.Observable.of(
                        setVideoInformations({
                            ...videoInformation,
                            time: featureTime
                        })
                    );
                }
                return Rx.Observable.empty();
            }

            // New file: fetch the URI from the proxy
            // We use defer() so that any synchronous throw inside the factory
            // is caught by the observable error channel instead of escaping.
            return Rx.Observable.defer(() =>
                axios.get(
                    `${state.gnsettings?.geonodeUrl}vimeo_proxy/${action.fileName}`
                )
            )
                .switchMap((response) => {
                    // Sanity-check: make sure we actually got a usable URI back
                    if (!response?.data) {
                        return Rx.Observable.of(
                            error({
                                uid: 'loadVideoError',
                                title: 'shorelineViewer.notifications.error',
                                message: 'shorelineViewer.notifications.emptyVideoResponse',
                                action: {
                                    label: 'shorelineViewer.notifications.close'
                                },
                                position: 'tr',
                                autoDismiss: 0
                            })
                        );
                    }
                    return Rx.Observable.of(
                        setVideoInformations({
                            fileName: action.fileName,
                            time: featureTime,
                            videoUri: response.data
                        })
                    );
                })
                .catch((err) => {
                    // Derive a human-readable message from the error.
                    // Axios wraps HTTP errors in err.response; a network failure
                    // has no err.response but does have err.message.
                    const status = err?.response?.status;
                    const messageKey = status === 401
                        ? 'shorelineViewer.notifications.videoUnauthorized'
                        : status === 403
                            ? 'shorelineViewer.notifications.videoForbidden'
                            : status === 404
                                ? 'shorelineViewer.notifications.videoNotFound'
                                : 'shorelineViewer.notifications.videoLoadError';

                    return Rx.Observable.of(
                        error({
                            uid: 'loadVideoError',
                            title: 'shorelineViewer.notifications.error',
                            message: messageKey,
                            values: {
                                fileName: action.fileName,
                                status: status ?? err?.message ?? 'unknown'
                            },
                            action: {
                                label: 'shorelineViewer.notifications.close'
                            },
                            position: 'tr',
                            autoDismiss: 0
                        })
                    );
                });
        });

// ---------------------------------------------------------------------------
// Video information updates
// ---------------------------------------------------------------------------

/**
 * React to individual video property changes (time / status).
 * - **time**: find the matching dataset feature and move the map marker.
 * - **status**: persist the play/pause flag.
 *
 * Note: the reducer now handles state updates immutably via UPDATE_VIDEO_INFORMATION,
 * so we only need to dispatch SET_VIDEO_INFORMATIONS when we want to replace the
 * entire object (e.g. to trigger a re-render with the merged snapshot).
 */
export const updateVideoInformationEpic = (action$, store) =>
    action$
        .ofType(UPDATE_VIDEO_INFORMATION)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            // videoInformations is already updated by the reducer at this point
            const videoInformations = state.shorelineViewer.videoInformations;

            if (!videoInformations) {
                return Rx.Observable.empty();
            }

            if (action.videoInformation.name === 'time') {
                const selectedFeature = state.shorelineViewer.selectedFeature;
                const selectedLayer = state.shorelineViewer.selectedLayer;
                const newTime = action.videoInformation.value;

                if (
                    videoInformations.duration !== undefined &&
                    newTime > videoInformations.duration
                ) {
                    return Rx.Observable.of(
                        error({
                            uid: 'videoDurationError',
                            title: 'shorelineViewer.notifications.error',
                            message: 'shorelineViewer.notifications.durationError',
                            action: { label: 'shorelineViewer.notifications.close' },
                            position: 'tr',
                            autoDismiss: 0
                        })
                    );
                }

                const nextFeature = state.shorelineViewer
                    .selectedMediaDatasetFeatures?.features?.find(
                        (f) =>
                            f.properties.filename ===
                                selectedFeature?.selectedFeature?.properties?.filename &&
                            f.properties.time === newTime
                    );

                if (!nextFeature) {
                    return Rx.Observable.empty();
                }

                return Rx.Observable.of(
                    shorelineSelectedFeature({
                        selectedFeature: nextFeature,
                        selectedLayer,
                        selectedFeatureProjection:
                            selectedFeature?.selectedFeatureProjection ?? 'EPSG:4326',
                        trigger: 'UPDATE_VIDEO_INFORMATION'
                    })
                );
            }

            // For status changes (play / pause) the reducer already updated the
            // store; no further actions are needed.
            return Rx.Observable.empty();
        });

// ---------------------------------------------------------------------------
// Error notifications
// ---------------------------------------------------------------------------

/**
 * Translate a VIDEO_ERROR action into a user-visible notification.
 */
export const videoErrorEpic = (action$) =>
    action$
        .ofType(VIDEO_ERROR)
        .switchMap((action) =>
            Rx.Observable.of(
                error({
                    uid: action.uid,
                    title: action.title,
                    message: action.message,
                    action: { label: 'shorelineViewer.notifications.close' },
                    values: action.values,
                    position: 'tr',
                    autoDismiss: 0
                })
            )
        );

// ---------------------------------------------------------------------------
// Labels overlay toggle
// ---------------------------------------------------------------------------

/**
 * When the user toggles the "Show labels" checkbox, update the WMS STYLES
 * parameter of the shoreline classification layer.
 *
 * - Checked   → style = `<thematicName>_labels`
 * - Unchecked → style = `<thematicName>` (the normal thematic style)
 *
 * The action is only dispatched when the Shoreline Type thematic is active,
 * but we guard here as well for safety.
 */
export const toggleShorelineLabelsEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_LABELS_VISIBLE)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const { selectedRegion, selectedThematic } = state.shorelineViewer;

            // Guard: we need both a region and an active thematic
            if (!selectedRegion || !selectedThematic) {
                return Rx.Observable.empty();
            }

            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;

            // When labels are visible, append "_labels" to the thematic name.
            const stylesParam = action.visible
                ? `${selectedThematic.thematicName}_labels`
                : selectedThematic.thematicName;

            return Rx.Observable.of(
                removeAdditionalLayer({ id: 'shoreline-classification-layer' }),
                updateAdditionalLayer(
                    'shoreline-classification-layer',
                    'ShorelineViewer',
                    'overlay',
                    buildWmsLayerOptions(
                        geoserverUrl,
                        selectedRegion.shorelineClassificationDataset,
                        stylesParam,
                        accessToken
                    )
                )
            );
        });

// ---------------------------------------------------------------------------
// Validation layer toggle
// ---------------------------------------------------------------------------

/**
 * When the user toggles the "Show validation" checkbox:
 * - Checked   → add the validation WMS layer for the current region
 * - Unchecked → remove it
 *
 * The checkbox is only rendered when selectedRegion.shorelineValidationDataset
 * is non-null, so by the time this epic fires we can rely on that value being
 * present. We guard anyway for safety.
 */
export const toggleShorelineValidationEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_VALIDATION_VISIBLE)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .switchMap((action) => {
            if (!action.visible) {
                return Rx.Observable.of(
                    removeAdditionalLayer({ id: 'shoreline-validation-layer' })
                );
            }

            const state = store.getState();
            const { selectedRegion } = state.shorelineViewer;
            const validationDataset = selectedRegion?.shorelineValidationDataset;

            if (!validationDataset) {
                return Rx.Observable.empty();
            }

            const accessToken = state.security?.user?.info?.access_token;
            const geoserverUrl = state.gnsettings?.geoserverUrl;

            return Rx.Observable.of(
                updateAdditionalLayer(
                    'shoreline-validation-layer',
                    'ShorelineViewer',
                    'overlay',
                    buildWmsLayerOptions(
                        geoserverUrl,
                        validationDataset,
                        null,          // use the layer's default GeoServer style
                        accessToken
                    )
                )
            );
        });

/**
 * When the user selects a different region, remove the validation layer if it
 * was visible. The reducer already resets validationVisible → false, so we
 * just need to clean up the map.
 */
export const removeValidationLayerOnRegionChangeEpic = (action$, store) =>
    action$
        .ofType(SET_SHORELINE_REGION)
        .filter(() => store.getState()?.controls?.shorelineViewer?.enabled)
        .mapTo(removeAdditionalLayer({ id: 'shoreline-validation-layer' }));

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

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
    toggleShorelineLabelsEpic,
    toggleShorelineValidationEpic,
    removeValidationLayerOnRegionChangeEpic
};

/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import axios from 'axios';
import { SET_CONTROL_PROPERTY, TOGGLE_CONTROL } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import {
    boundingSidebarRectSelector,
    mapLayoutSelector
} from '@mapstore/framework/selectors/maplayout';
import { LayoutSections } from "@js/utils/LayoutUtils";
import {
    initSensitivityMappingPrint,
    setPrintApplicationList,
    resetSensitivityMapping,
    setPrintApplication,
    setInitialMapProperties,
    setPrintCapabilities,
    setPrintProperties,
    updatePrintProperty,
    getCoordinatesSystems,
    loadPrintLayout,
    setPrintExtent,
    setPrintBbox,
    sendPrintRequest,
    downloadMap,
    getPrintStatus,
    loadSelectedStyle,
    loadSelectedStyles,
    loadFeatures,
    startManagementCommand,
    printError,
    changePrintStatus,
    INIT_SENSITIVITY_MAPPING_PRINT,
    SET_PRINT_APPLICATION,
    SET_PRINT_CAPABILITIES,
    SET_PRINT_PROPERTIES,
    UPDATE_PRINT_PROPERTY,
    SET_PRINT_EXTENT,
    CREATE_PRINT_CONFIG,
    SEND_PRINT_REQUEST,
    DOWNLOAD_MAP,
    GET_PRINT_STATUS,
    LOAD_SELECTED_STYLE,
    LOAD_SELECTED_STYLES,
    LOAD_FEATURES,
    START_MANAGEMENT_COMMAND,
    PRINT_ERROR
} from "@js/actions/sensitivitymapping";
import { DEFAULT_SCREEN_DPI } from '@mapstore/framework/utils/MapUtils';
import { panTo, zoomToExtent, CHANGE_MAP_VIEW } from '@mapstore/framework/actions/map';
import {
    reproject,
    formatPrintLayer,
    formatLegend,
    getProjections,
    getLayerTitle
} from '@js/utils/PrintUtils';
import {
    removeAdditionalLayer,
    updateAdditionalLayer
} from '@mapstore/framework/actions/additionallayers';
import { UPDATE_NODE, CHANGE_LAYER_PROPERTIES } from '@mapstore/framework/actions/layers';
import { REDUCERS_LOADED } from '@mapstore/framework/actions/storemanager';
import { optionsToVendorParams } from '@mapstore/framework/utils/VendorParamsUtils';
import { getFeature } from '@mapstore/framework/api/WFS';
import { error, success, warning } from '@mapstore/framework/actions/notifications';
import {
    hideMapinfoMarker,
    purgeMapInfoResults,
    toggleMapInfoState
} from '@mapstore/framework/actions/mapInfo';
import {
    enabledSelector,
    mapfishConfigSelector,
    mapfishUrlSelector,
    sensitivityMappingLayersSelector,
    sensitivityMappingPrintLayoutSelector,
    sensitivityMappingProjectionsSelector,
    printExtentAdditionalLayerSelector
} from '@js/selectors/sensitivitymapping';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the GeoNode base URL from the store.
 */
const geonodeUrlSelector = state => state?.gnsettings?.geonodeUrl ?? '';

/**
 * Safely retrieve the print-extent additional layer feature ring or null.
 */
const getPrintExtentCoordinates = (state) => {
    const layer = printExtentAdditionalLayerSelector(state);
    return layer?.options?.features?.[0]?.geometry?.coordinates?.[1] ?? null;
};

// ---------------------------------------------------------------------------
// Layout epic
// ---------------------------------------------------------------------------

/**
 * Override the layout to get the correct right offset when the data print tool is open.
 */
export const gnUpdateSensitivityMappingMapLayoutEpic = (action$, store) =>
    action$.ofType(UPDATE_MAP_LAYOUT)
        .filter(() => enabledSelector(store.getState()))
        .filter(({ source }) => source !== LayoutSections.PANEL)
        .map(({ layout }) => {
            const state = store.getState();
            const mapLayout = {
                left: { sm: 350, md: 500, lg: 600 },
                right: { md: 425 },
                bottom: { sm: 30 }
            };
            const boundingSidebarRect = boundingSidebarRectSelector(state);
            const left = state?.controls?.drawer?.enabled
                ? mapLayout.left.sm
                : null;

            const action = updateMapLayout({
                ...mapLayoutSelector(state),
                ...layout,
                right: mapLayout.right.md,
                ...(left && { left }),
                rightPanel: true,
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
// Initialisation epics
// ---------------------------------------------------------------------------

/**
 * Captures REDUCERS_LOADED and fetches the list of MapFish print applications.
 * An error here signals the print server is unavailable.
 */
export const initSensitivityMappingPrintEpic = (action$, store) =>
    action$.ofType(REDUCERS_LOADED)
        .switchMap(() => {
            const state = store.getState();
            const geonodeUrl = geonodeUrlSelector(state);
            const cfg = mapfishConfigSelector(state);
            if (!cfg) {
                return Rx.Observable.empty();
            }
            const appsUrl = `${geonodeUrl}${cfg.mapfishUrl}/print/apps.json`;
            return Rx.Observable.defer(() => axios.get(appsUrl))
                .map(response => initSensitivityMappingPrint(response.data))
                .catch(err =>
                    Rx.Observable.of(
                        initSensitivityMappingPrint(
                            err?.message ?? 'Unknown error'
                        )
                    )
                );
        });

/**
 * Captures INIT_SENSITIVITY_MAPPING_PRINT, applies group restrictions and loads
 * each application's capabilities, then stores the full list via setPrintApplicationList.
 */
export const loadPrintApplicationsEpic = (action$, store) =>
    action$.ofType(INIT_SENSITIVITY_MAPPING_PRINT)
        .switchMap((action) => {
            const state = store.getState();

            // Server unreachable – mapfishPrintApps will be an error string
            if (typeof action.mapfishPrintApps === "string") {
                return Rx.Observable.of(
                    setPrintApplicationList([], true),
                    error({
                        uid: "initSensitivityMappingPrintError",
                        title: "sensitivitymapping.notifications.error",
                        message: "sensitivitymapping.notifications.initSensitivityMappingPrintError",
                        action: { label: "sensitivitymapping.notifications.close" },
                        position: "tr",
                        values: { message: action.mapfishPrintApps },
                        autoDismiss: 0
                    })
                );
            }

            const geonodeUrl = geonodeUrlSelector(state);
            const cfg = mapfishConfigSelector(state);
            if (!cfg) {
                return Rx.Observable.empty();
            }

            const userGroups = state?.security?.user?.info?.groups ?? [];

            // Filter applications by group restrictions
            const allowedApplications = cfg.applications.filter((app) =>
                !app.restrictions ||
                app.restrictions.some(r => userGroups.includes(r))
            );

            // Fetch capabilities for each allowed application in parallel
            const requests = allowedApplications.map((app) => {
                const capUrl = `${geonodeUrl}${cfg.mapfishUrl}/print/${app.name}/capabilities.json`;
                return Rx.Observable.defer(() => axios.get(capUrl))
                    .map(response => ({ success: true, data: response.data }))
                    .catch(() => Rx.Observable.of({ success: false }));
            });

            if (requests.length === 0) {
                return Rx.Observable.of(setPrintApplicationList([]));
            }

            return Rx.Observable.forkJoin(requests)
                .switchMap((results) => {
                    const printApplications = results
                        .filter(r => r.success)
                        .map(r => r.data);

                    const hasError = results.some(r => !r.success);
                    const actions = [setPrintApplicationList(printApplications, hasError)];

                    if (hasError) {
                        actions.push(
                            error({
                                uid: "initSensitivityMappingPrintError",
                                title: "sensitivitymapping.notifications.error",
                                message: "sensitivitymapping.notifications.initSensitivityMappingPrintError",
                                action: { label: "sensitivitymapping.notifications.close" },
                                position: "tr",
                                autoDismiss: 0
                            })
                        );
                    }
                    return Rx.Observable.from(actions);
                });
        });

// ---------------------------------------------------------------------------
// Open / close epics
// ---------------------------------------------------------------------------

/**
 * Disables the layer query tool when the print tool is activated, loads initial
 * map properties and assigns the default print application.
 */
export const openSensitivityMappingEpic = (action$, store) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "sensitivityMapping")
        .filter(() => enabledSelector(store.getState()))
        .switchMap(() => {
            const state = store.getState();
            const cfg = mapfishConfigSelector(state);
            if (!cfg) {
                return Rx.Observable.empty();
            }
            const defaultApplication = cfg.applications
                .find((app) => app.name === cfg.defaultApplication);
            const mapView = state.map.present;

            return Rx.Observable.of(
                purgeMapInfoResults(),
                hideMapinfoMarker(),
                toggleMapInfoState(),
                setInitialMapProperties(mapView),
                setPrintApplication(defaultApplication)
            );
        });

/**
 * Reactivates the map click, removes the print extent layer and zooms back to
 * the original map view when the print tool is closed.
 */
export const closeSensitivityMappingEpic = (action$, store) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "sensitivityMapping")
        .filter((action) => action.property === "enabled" && action.value === false)
        .switchMap(() => {
            const state = store.getState();
            const mapCenter = state?.sensitivityMapping?.initialMapProperties?.center;
            const mapZoom = state?.sensitivityMapping?.initialMapProperties?.zoom;

            const mapExtent = mapCenter
                ? [mapCenter.x, mapCenter.y, mapCenter.x, mapCenter.y]
                : undefined;

            const closeActions = [
                toggleMapInfoState(),
                removeAdditionalLayer({ id: "sensitivity-mapping-print-extent" }),
                resetSensitivityMapping()
            ];

            if (mapExtent) {
                closeActions.push(zoomToExtent(mapExtent, "EPSG:4326", mapZoom));
            }

            return Rx.Observable.from(closeActions);
        });

/**
 * Adjusts the map zoom/center when the drawer (layer tree) is toggled while the
 * print tool is active, so the print extent polygon stays fully visible.
 */
export const toggleDrawerControlEpic = (action$, store) =>
    action$.ofType(TOGGLE_CONTROL)
        .filter(() => enabledSelector(store.getState()))
        .filter((action) => action.control === "drawer")
        .switchMap(() => {
            const state = store.getState();
            const coordinates = getPrintExtentCoordinates(state);
            if (!coordinates) {
                // Print extent not yet drawn – nothing to do
                return Rx.Observable.empty();
            }
            const printExtent = [
                coordinates[0][0],
                coordinates[0][1],
                coordinates[2][0],
                coordinates[2][1]
            ];
            return Rx.Observable.of(zoomToExtent(printExtent, "EPSG:4326"));
        });

// ---------------------------------------------------------------------------
// Style loading epics
// ---------------------------------------------------------------------------

/**
 * Loads the SLD style for a single layer and updates the layer list in the store.
 */
export const loadSelectedStyleEpic = (action$, store) =>
    action$.ofType(LOAD_SELECTED_STYLE)
        .filter(() => enabledSelector(store.getState()))
        .mergeMap((action) => {
            const state = store.getState();
            const geonodeUrl = geonodeUrlSelector(state);
            const layers = sensitivityMappingLayersSelector(state);
            const layerToEdit = layers.find(l => l.name === action.layerName);

            if (!layerToEdit) {
                return Rx.Observable.empty();
            }

            let selectedStyle = layerToEdit.extendedParams?.mapLayer?.dataset?.styles
                ?.find(s =>
                    layerToEdit.style.includes(s.name) ||
                    s.name.includes(layerToEdit.style)
                );

            if (!selectedStyle) {
                selectedStyle = {
                    sld_url: `${geonodeUrl}geoserver/rest/workspaces/neec_geodb/styles/${layerToEdit.style.replace("neec_geodb:", "")}.sld`
                };
            }

            return Rx.Observable.defer(() => axios.get(selectedStyle.sld_url))
                .switchMap((response) => {
                    // Build an updated layers array (immutably)
                    const updatedLayers = layers.map(l =>
                        l.name === action.layerName
                            ? { ...l, selectedStyle: response.data }
                            : l
                    );
                    return Rx.Observable.of(loadSelectedStyles(updatedLayers));
                })
                .catch((err) => {
                    console.warn(`Style for layer ${action.layerName} could not be loaded: ${err.message}`);
                    return Rx.Observable.empty();
                });
        });

/**
 * Loads SLD styles for all visible layers concurrently, then triggers
 * WFS feature loading.
 */
export const loadSelectedStylesEpic = (action$, store) =>
    action$.ofType(LOAD_SELECTED_STYLES)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const localLayers = action.layers
                .slice()
                .reverse()
                .filter(layer =>
                    layer.group !== "basemaps" &&
                    layer.extendedParams &&
                    layer.style?.length > 0
                );

            if (!localLayers.length) {
                return Rx.Observable.of(loadFeatures(action.layers));
            }

            // For each layer, attempt to fetch its style; failures are silently skipped
            const styleRequests = localLayers.map(layer => {
                const selectedStyle = layer.extendedParams?.mapLayer?.dataset?.styles
                    ?.find(s =>
                        layer.style.includes(s.name) ||
                        s.name.includes(layer.style)
                    );

                if (!selectedStyle?.sld_url) {
                    return Rx.Observable.of({ layer, styleData: null });
                }

                return Rx.Observable.defer(() => axios.get(selectedStyle.sld_url))
                    .map(response => ({ layer, styleData: response.data }))
                    .catch((err) => {
                        console.warn(
                            `Style for layer ${layer.name} could not be loaded: ${err.message}`
                        );
                        return Rx.Observable.of({ layer, styleData: null });
                    });
            });

            return Rx.Observable.forkJoin(styleRequests)
                .switchMap((results) => {
                    // Build a new layers array with fetched styles merged in
                    const styleMap = results.reduce((acc, { layer, styleData }) => {
                        if (styleData !== null) {
                            acc[layer.name] = styleData;
                        }
                        return acc;
                    }, {});

                    const updatedLayers = action.layers.map(l =>
                        styleMap[l.name] !== undefined
                            ? { ...l, selectedStyle: styleMap[l.name] }
                            : l
                    );

                    return Rx.Observable.of(loadFeatures(updatedLayers));
                });
        });

// ---------------------------------------------------------------------------
// Feature loading epic
// ---------------------------------------------------------------------------

/**
 * Loads GeoJSON features for WFS layers within the current map bbox.
 */
export const loadFeaturesEpic = (action$, store) =>
    action$.ofType(LOAD_FEATURES)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            const printProjection = state?.sensitivityMapping?.printProperties?.projection;
            if (!printProjection) {
                return Rx.Observable.empty();
            }

            const projections = sensitivityMappingProjectionsSelector(state);
            const projectionDefinition = projections.find(p => p.code === printProjection);
            const projStr = projectionDefinition?.definition ?? `EPSG:${printProjection}`;

            const bottomLeft = reproject(
                [state.map.present.bbox.bounds.minx, state.map.present.bbox.bounds.miny],
                "EPSG:3857",
                projStr
            );
            const topRight = reproject(
                [state.map.present.bbox.bounds.maxx, state.map.present.bbox.bounds.maxy],
                "EPSG:3857",
                projStr
            );

            const wfsLayers = action.layers.filter(l => l.type === "wfs");

            if (!wfsLayers.length) {
                return Rx.Observable.empty();
            }

            const featureRequests = wfsLayers.map(layer =>
                Rx.Observable.defer(() =>
                    getFeature(layer.url, layer.name, {
                        outputFormat: "application/json",
                        srsName: `EPSG:${printProjection}`,
                        bbox: `${bottomLeft.x},${bottomLeft.y},${topRight.x},${topRight.y},EPSG:${printProjection}`,
                        ...(optionsToVendorParams(layer) || {})
                    })
                )
                    .map(({ data }) => ({ layerName: layer.name, geoJson: data }))
                    .catch((err) => {
                        console.warn(`Features for layer ${layer.name} could not be loaded: ${err.message}`);
                        return Rx.Observable.of({ layerName: layer.name, geoJson: null });
                    })
            );

            return Rx.Observable.forkJoin(featureRequests)
                .switchMap((results) => {
                    const geoJsonMap = results.reduce((acc, { layerName, geoJson }) => {
                        if (geoJson !== null) {
                            acc[layerName] = geoJson;
                        }
                        return acc;
                    }, {});

                    const updatedLayers = action.layers.map(l =>
                        geoJsonMap[l.name] !== undefined
                            ? { ...l, geoJson: geoJsonMap[l.name] }
                            : l
                    );

                    // Dispatch the updated layers back so the store reflects loaded features
                    return Rx.Observable.of(loadFeatures(updatedLayers));
                });
        });

// ---------------------------------------------------------------------------
// Layer update epic
// ---------------------------------------------------------------------------

/**
 * Keeps the sensitivityMapping layer list in sync when a layer node is updated
 * or its properties change in the main MapStore layer tree.
 */
export const updateLayerEpic = (action$, store) =>
    action$.ofType(UPDATE_NODE, CHANGE_LAYER_PROPERTIES)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            const layers = sensitivityMappingLayersSelector(state);

            if (action.type === "UPDATE_NODE") {
                const targetLayer = layers.find(l => l.id === action.node);
                if (!targetLayer) {
                    return Rx.Observable.empty();
                }

                const updatedLayer = { ...targetLayer, ...action.options };
                const updatedLayers = layers.map(l =>
                    l.id === action.node ? updatedLayer : l
                );
                const styleChanged = Object.prototype.hasOwnProperty.call(action.options, 'style');

                const actionsToDispatch = [loadSelectedStyles(updatedLayers)];
                if (styleChanged) {
                    actionsToDispatch.push(loadSelectedStyle(updatedLayer.name, null));
                }
                return Rx.Observable.from(actionsToDispatch);
            }

            // CHANGE_LAYER_PROPERTIES
            const targetLayer = layers.find(l => l.id === action.layer);
            if (!targetLayer) {
                return Rx.Observable.empty();
            }
            const updatedLayer = { ...targetLayer, ...action.newProperties };
            const updatedLayers = layers.map(l =>
                l.id === action.layer ? updatedLayer : l
            );
            return Rx.Observable.of(loadSelectedStyles(updatedLayers));
        });

// ---------------------------------------------------------------------------
// Map view change epic
// ---------------------------------------------------------------------------

/**
 * Reacts to CHANGE_MAP_VIEW while the print tool is open: recalculates the
 * map center (accounting for panel offsets) and refreshes WFS features and
 * coordinate systems.
 */
export const changeMapViewEpic = (action$, store) =>
    action$.ofType(CHANGE_MAP_VIEW)
        .filter(() => enabledSelector(store.getState()))
        .filter(() => !!store.getState()?.sensitivityMapping?.selectedPrintApplication)
        .switchMap((action) => {
            const state = store.getState();
            const updatedCoordinatesSystems = getProjections(
                state.sensitivityMapping.selectedPrintApplication,
                state.sensitivityMapping.printProperties.scale,
                action.center.x
            );

            const mapResolution = action.resolution;
            const mapWidth = state.map.present.size.width;
            const rightPanelWidth = state.maplayout.layout.right;
            const rightOffsetWith =
                (mapWidth / 2 - (mapWidth - rightPanelWidth) / 2) * mapResolution;

            let offsetWidth = rightOffsetWith;

            if (state.maplayout.layout.leftPanel) {
                const leftPanelWidth = state.maplayout.layout.left;
                const leftOffsetWith =
                    (mapWidth / 2 - (mapWidth - leftPanelWidth) / 2) * mapResolution;
                offsetWidth -= leftOffsetWith;
            }

            let mapCenter3857 = reproject(
                [action.center.x, action.center.y],
                "EPSG:4326",
                "EPSG:3857"
            );
            mapCenter3857 = { ...mapCenter3857, x: mapCenter3857.x - offsetWidth };
            const newCenter = reproject(mapCenter3857, "EPSG:3857", "EPSG:4326");

            const layers = sensitivityMappingLayersSelector(state);
            const pastMap = state.map.past[state.map.past.length - 1];

            const centerChanged =
                action.center.x !== pastMap.center.x ||
                action.center.y !== pastMap.center.y;

            if (centerChanged) {
                return Rx.Observable.of(
                    updatePrintProperty({ name: "mapCenter", value: newCenter }),
                    loadFeatures(layers)
                );
            }

            const deltaXDeg = Math.abs(newCenter.x - action.center.x);
            let offsetCenter = { ...action.center };
            if (pastMap.zoom > action.zoom) {
                offsetCenter = { ...offsetCenter, x: offsetCenter.x + deltaXDeg / 2 };
            } else {
                offsetCenter = {
                    ...offsetCenter,
                    x: 180 - Math.abs(offsetCenter.x - deltaXDeg) + 180
                };
            }

            return Rx.Observable.of(
                panTo(offsetCenter),
                getCoordinatesSystems(updatedCoordinatesSystems),
                updatePrintProperty({ name: "mapCenter", value: newCenter }),
                loadFeatures(layers)
            );
        });

// ---------------------------------------------------------------------------
// Print property update epic
// ---------------------------------------------------------------------------

/**
 * Reacts to individual print property changes and triggers downstream
 * updates (layout reload, extent recalculation, coordinate system refresh).
 * State is updated by the reducer via UPDATE_PRINT_PROPERTY; this epic only
 * orchestrates follow-on actions.
 */
export const updatePrintPropertyEpic = (action$, store) =>
    action$.ofType(UPDATE_PRINT_PROPERTY)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            // At this point the reducer has already applied the property change
            const printProperties = state.sensitivityMapping.printProperties;

            if (["legend2Pages", "orientation", "language"].includes(action.printProperty.name)) {
                return Rx.Observable.of(setPrintProperties(printProperties));
            }

            if (["mapCenter", "scale", "projection"].includes(action.printProperty.name)) {
                const updatedCoordinatesSystems = getProjections(
                    state.sensitivityMapping.selectedPrintApplication,
                    printProperties.scale,
                    printProperties.mapCenter?.x
                );
                return Rx.Observable.of(
                    setPrintExtent(),
                    getCoordinatesSystems(updatedCoordinatesSystems)
                );
            }

            return Rx.Observable.empty();
        });

// ---------------------------------------------------------------------------
// Print layout epic
// ---------------------------------------------------------------------------

/**
 * Selects the correct print layout template based on the current print
 * properties (orientation, legend2Pages, language).
 */
export const loadPrintLayoutEpic = (action$, store) =>
    action$.ofType(SET_PRINT_PROPERTIES)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            const selectedPrintCapabilities = state.sensitivityMapping?.selectedPrintCapabilities;
            if (!selectedPrintCapabilities) {
                return Rx.Observable.empty();
            }

            let printLayoutName =
                `${selectedPrintCapabilities.app}_${action.printProperties.orientation.toLowerCase()}`;
            if (action.printProperties.legend2Pages) {
                printLayoutName += "_2pages";
            }
            printLayoutName += `_${action.printProperties.language}`;

            const printLayout = selectedPrintCapabilities.layouts
                .find(layout => layout.name === printLayoutName);

            if (!printLayout) {
                return Rx.Observable.of(
                    error({
                        uid: "loadPrintLayoutError",
                        title: "sensitivitymapping.notifications.error",
                        message: "sensitivitymapping.notifications.loadPrintLayoutError",
                        action: { label: "sensitivitymapping.notifications.close" },
                        values: { printLayoutName },
                        position: "tr",
                        autoDismiss: 0
                    })
                );
            }

            const currentLayout = sensitivityMappingPrintLayoutSelector(state);
            if (printLayout === currentLayout) {
                return Rx.Observable.empty();
            }

            return Rx.Observable.of(
                loadPrintLayout(printLayout),
                setPrintExtent()
            );
        });

// ---------------------------------------------------------------------------
// Print application selection epic
// ---------------------------------------------------------------------------

/**
 * Loads capabilities for the newly selected print application.
 */
export const selectPrintApplicationEpic = (action$, store) =>
    action$.ofType(SET_PRINT_APPLICATION)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            const selectedPrintApplication = state.sensitivityMapping.printApplications
                .find(item => item.app === action.selectedPrintApplication.name);

            if (!selectedPrintApplication) {
                return Rx.Observable.empty();
            }

            return Rx.Observable.of(setPrintCapabilities(selectedPrintApplication));
        });

// ---------------------------------------------------------------------------
// Print properties initialisation epic
// ---------------------------------------------------------------------------

/**
 * Initialises print properties when capabilities are loaded (on open or
 * application change). Ensures only options available in the new template
 * are kept.
 */
export const initiatePrintPropertiesEpic = (action$, store) =>
    action$.ofType(SET_PRINT_CAPABILITIES)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            if (!action.selectedPrintCapabilities) {
                return Rx.Observable.empty();
            }

            const state = store.getState();
            const cfg = mapfishConfigSelector(state);
            if (!cfg) {
                return Rx.Observable.empty();
            }

            const prev = state.sensitivityMapping.printProperties;
            const printAppProperties = cfg.applications
                .find(app => app.name === action.selectedPrintCapabilities.app);

            const printProperties = {
                title: prev?.title ?? "",
                scale: prev?.scale ??
                    Math.floor(DEFAULT_SCREEN_DPI * 39.37 * state.map.present.resolution),
                language: prev?.language ??
                    state.locale?.current?.slice(0, 2),
                projection: prev?.projection ?? "3857",
                format: prev?.format ?? "pdf",
                mapCenter: prev?.mapCenter ??
                    state.sensitivityMapping.initialMapProperties.center,
                resolution: prev?.resolution ?? "300",
                legend2Pages: prev?.legend2Pages ?? false,
                orientation: prev?.orientation ?? "Landscape",
                filterLegend: prev?.filterLegend ?? true,
                gridLayer: prev?.gridLayer ?? false
            };

            const updatedCoordinatesSystems = getProjections(
                state.sensitivityMapping.selectedPrintApplication,
                printProperties.scale,
                printProperties.mapCenter?.x
            );

            // Sensitivity Mapping app prefers the UTM projection
            if (action.selectedPrintCapabilities.app === "sensitivity-mapping" &&
                printProperties.projection === "3857") {
                const utmProjection = updatedCoordinatesSystems
                    .find(p => p.name.includes("UTM"));
                if (utmProjection) {
                    printProperties.projection = utmProjection.code;
                    printProperties.scale = Math.round(printProperties.scale * 0.65);
                }
            }

            // Remove or reset template-specific properties not available in this app
            const templateProperties = ["legend2Pages", "orientation", "gridLayer"];
            templateProperties.forEach(propName => {
                const propDef = printAppProperties?.properties
                    ?.find(p => p.name === propName);
                if (!propDef) {
                    delete printProperties[propName];
                } else if (
                    propDef.options &&
                    !propDef.options.includes(printProperties[propName])
                ) {
                    printProperties[propName] = propDef.default;
                }
            });

            return Rx.Observable.of(
                getCoordinatesSystems(updatedCoordinatesSystems),
                setPrintProperties(printProperties),
                loadSelectedStyles(state.layers.flat)
            );
        });

// ---------------------------------------------------------------------------
// Print extent epic
// ---------------------------------------------------------------------------

/**
 * Calculates the print extent polygon from the current layout and print
 * properties, then updates the additional layer on the map.
 */
export const setPrintExtentEpic = (action$, store) =>
    action$.ofType(SET_PRINT_EXTENT)
        .filter(() => enabledSelector(store.getState()))
        .switchMap(() => {
            const state = store.getState();
            const printProperties = state.sensitivityMapping.printProperties;
            const printProjection = printProperties.projection;
            const projections = sensitivityMappingProjectionsSelector(state);
            const projectionDefinition = projections.find(p => p.code === printProjection);
            const projStr = projectionDefinition?.definition ?? `EPSG:${printProjection}`;

            const mapScale = printProperties.scale;
            const mapResolution = mapScale / (72 * 39.37);

            const printLayout = sensitivityMappingPrintLayoutSelector(state);
            const layoutMainMap = printLayout?.attributes
                ?.find(attr => attr.name === "mainMap");

            if (!layoutMainMap) {
                return Rx.Observable.empty();
            }

            const layoutHeight = layoutMainMap.clientInfo.height * mapResolution;
            const layoutWidth = layoutMainMap.clientInfo.width * mapResolution;

            const mapCenter = [
                printProperties.mapCenter.x,
                printProperties.mapCenter.y
            ];
            const projectedMapCenter = reproject(mapCenter, "EPSG:4326", projStr);

            const halfHeight = layoutHeight / 2;
            const halfWidth = layoutWidth / 2;

            const bottomLeft = reproject(
                [projectedMapCenter.x - halfWidth, projectedMapCenter.y - halfHeight],
                projStr, "EPSG:4326"
            );
            const bottomRight = reproject(
                [projectedMapCenter.x + halfWidth, projectedMapCenter.y - halfHeight],
                projStr, "EPSG:4326"
            );
            const topRight = reproject(
                [projectedMapCenter.x + halfWidth, projectedMapCenter.y + halfHeight],
                projStr, "EPSG:4326"
            );
            const topLeft = reproject(
                [projectedMapCenter.x - halfWidth, projectedMapCenter.y + halfHeight],
                projStr, "EPSG:4326"
            );

            const printExtentPolygon = [
                [bottomLeft.x, bottomLeft.y],
                [bottomRight.x, bottomRight.y],
                [topRight.x, topRight.y],
                [topLeft.x, topLeft.y]
            ];
            const mapExtent = [bottomLeft.x, bottomLeft.y, topRight.x, topRight.y];
            const projectedMapExtent = [
                projectedMapCenter.x - halfWidth,
                projectedMapCenter.y - halfHeight,
                projectedMapCenter.x + halfWidth,
                projectedMapCenter.y + halfHeight
            ];

            const extentLayer = {
                id: "sensitivity-mapping-print-extent",
                name: "sensitivity-mapping-print-extent",
                type: "vector",
                features: [
                    {
                        type: "Feature",
                        properties: {},
                        geometry: {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-180, 90],
                                    [180, 90],
                                    [180, -90],
                                    [-180, -90],
                                    [-180, 90]
                                ],
                                printExtentPolygon
                            ]
                        },
                        style: {
                            fillColor: '#808080',
                            fillOpacity: 0.5,
                            color: '#808080',
                            opacity: 1,
                            weight: 0
                        }
                    }
                ]
            };

            const extentAlreadyExists = !!printExtentAdditionalLayerSelector(state);
            const updateActions = [
                setPrintBbox(projectedMapExtent),
                updateAdditionalLayer(
                    "sensitivity-mapping-print-extent",
                    "SensitivityMapping",
                    'overlay',
                    extentLayer
                )
            ];

            if (!extentAlreadyExists) {
                updateActions.push(zoomToExtent(mapExtent, "EPSG:4326"));
            }

            return Rx.Observable.from(updateActions);
        });

// ---------------------------------------------------------------------------
// Print config creation epic
// ---------------------------------------------------------------------------

/**
 * Assembles the MapFish Print 3 payload from the current store state and
 * dispatches sendPrintRequest (plus an optional warning notification).
 */
export const createPrintConfigEpic = (action$, store) =>
    action$.ofType(CREATE_PRINT_CONFIG)
        .filter(() => enabledSelector(store.getState()))
        .switchMap(() => {
            const state = store.getState();
            const printProperties = state.sensitivityMapping.printProperties;
            const projections = sensitivityMappingProjectionsSelector(state);
            const projectionDefinition = projections.find(p => p.code === printProperties.projection);
            const projStr = projectionDefinition?.definition ?? `EPSG:${printProperties.projection}`;

            const projectedMapCenter = reproject(printProperties.mapCenter, "EPSG:4326", projStr);

            // Retrieve the print extent from the additional layer (already in EPSG:4326)
            const extentLayer = printExtentAdditionalLayerSelector(state);
            const extentCoords = extentLayer?.options?.features?.[0]?.geometry?.coordinates?.[1];

            if (!extentCoords) {
                return Rx.Observable.of(
                    printError(
                        "createPrintConfigError",
                        "sensitivitymapping.notifications.error",
                        "sensitivitymapping.notifications.createPrintConfigError",
                        {}
                    )
                );
            }

            const bottomLeft = reproject(extentCoords[0], "EPSG:4326", projStr);
            const topRight = reproject(extentCoords[2], "EPSG:4326", projStr);
            const bbox = [bottomLeft.x, bottomLeft.y, topRight.x, topRight.y];
            const mapLanguage = printProperties.language;

            const printLayout = sensitivityMappingPrintLayoutSelector(state);

            let printConfig = {
                layout: printLayout.name,
                outputFormat: printProperties.format,
                attributes: {
                    title: printProperties.title,
                    coordinateSystem: projections.find(p => p.code === printProperties.projection)?.name,
                    mainMap: {
                        center: [projectedMapCenter.x, projectedMapCenter.y],
                        rotation: 0,
                        longitudeFirst: true,
                        layers: [],
                        scale: printProperties.scale,
                        projection: `EPSG:${printProperties.projection}`,
                        dpi: printProperties.resolution,
                        dpiSensitiveStyle: true
                    },
                    locatorMap: {
                        center: [projectedMapCenter.x, projectedMapCenter.y],
                        rotation: 0,
                        longitudeFirst: true,
                        layers: [],
                        scale: printProperties.scale * 25,
                        projection: `EPSG:${printProperties.projection}`,
                        dpi: printProperties.resolution
                    },
                    legend: { classes: [] }
                }
            };

            const layers = sensitivityMappingLayersSelector(state);
            let mainMapLayers = [];
            let legendClasses = [];
            let warningLayers = [];

            layers.slice().reverse().forEach(layer => {
                if (!layer.visibility) return;

                if (layer.group === "background") {
                    const formatted = formatPrintLayer(layer, state);
                    if (formatted && Object.keys(formatted).length > 0) {
                        mainMapLayers.push(formatted);
                    } else {
                        warningLayers.push(`${getLayerTitle(layer, mapLanguage)} (layer)`);
                    }
                } else {
                    if (!layer.loadingError) {
                        const formatted = formatPrintLayer(layer, state);
                        if (formatted && Object.keys(formatted).length > 0) {
                            mainMapLayers.push(formatted);
                        } else {
                            warningLayers.push(`${getLayerTitle(layer, mapLanguage)} (layer)`);
                        }
                        const formattedLegend = formatLegend(layer, bbox, state);
                        if (formattedLegend && Object.keys(formattedLegend).length > 0) {
                            legendClasses.push(formattedLegend);
                        } else {
                            warningLayers.push(`${getLayerTitle(layer, mapLanguage)} (legend)`);
                        }
                    } else {
                        warningLayers.push(`${getLayerTitle(layer, mapLanguage)} (layer)`);
                        warningLayers.push(`${getLayerTitle(layer, mapLanguage)} (legend)`);
                    }
                }
            });

            const locatorMapLayers = [
                {
                    type: "geojson",
                    name: "Map BBox",
                    geoJson: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "Polygon",
                                    coordinates: [
                                        [bottomLeft.x, bottomLeft.y],
                                        [bottomLeft.x, topRight.y],
                                        [topRight.x, topRight.y],
                                        [topRight.x, bottomLeft.y],
                                        [bottomLeft.x, bottomLeft.y]
                                    ]
                                }
                            }
                        ]
                    },
                    style: {
                        version: "2",
                        "*": {
                            symbolizers: [
                                {
                                    type: "polygon",
                                    strokeDashstyle: "longdash",
                                    strokeColor: "#900603",
                                    strokeOpacity: 1,
                                    fillColor: '#900603',
                                    fillOpacity: 0.05
                                }
                            ]
                        }
                    }
                },
                {
                    baseURL: "https://maps.geosolutionsgroup.com/geoserver/osm/wms",
                    imageFormat: "image/png",
                    layers: ["osm"],
                    opacity: 1,
                    type: "WMS"
                }
            ];

            printConfig.attributes.mainMap.layers = mainMapLayers;
            printConfig.attributes.locatorMap.layers = locatorMapLayers;
            printConfig.attributes.legend.classes = legendClasses;

            // Grid layer
            if (printProperties.gridLayer) {
                let gridSpacing;
                const scale = printProperties.scale;
                if (scale <= 10000) gridSpacing = 500;
                else if (scale <= 20000) gridSpacing = 1000;
                else if (scale <= 50000) gridSpacing = 2500;
                else if (scale <= 100000) gridSpacing = 5000;
                else if (scale <= 500000) gridSpacing = 10000;
                else gridSpacing = 20000;

                mainMapLayers.unshift({
                    type: "grid",
                    gridType: "lines",
                    gridColor: "#000000",
                    opacity: 0.7,
                    horizontalYOffset: 15,
                    verticalXOffset: 15,
                    origin: [0, 0],
                    spacing: [gridSpacing, gridSpacing],
                    labelColor: "#000000",
                    font: { name: ["Sans-serif"], size: 8 }
                });
            }

            const resultActions = [sendPrintRequest(printConfig)];
            if (warningLayers.length > 0) {
                resultActions.push(
                    warning({
                        uid: "warningMessage",
                        title: "sensitivitymapping.notifications.warning",
                        message: "sensitivitymapping.notifications.warningMessage",
                        action: { label: "sensitivitymapping.notifications.close" },
                        values: { layers: warningLayers.join(", ") },
                        position: "tr",
                        autoDismiss: 0
                    })
                );
            }

            return Rx.Observable.from(resultActions);
        });

// ---------------------------------------------------------------------------
// Send print request epic
// ---------------------------------------------------------------------------

/**
 * Sends the assembled print config to MapFish Print or to the GeoNode
 * management command API when a report is also requested.
 */
export const sendPrintRequestEpic = (action$, store) =>
    action$.ofType(SEND_PRINT_REQUEST)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            const cfg = mapfishConfigSelector(state);
            const geonodeUrl = geonodeUrlSelector(state);

            if (!state.sensitivityMapping.printProperties.report) {
                const printApp = state.sensitivityMapping.selectedPrintApplication;
                const printUrl = `${geonodeUrl}${cfg.mapfishUrl}/print/${printApp.name}/report.${action.printConfig.outputFormat}`;

                return Rx.Observable.defer(() =>
                    axios.post(printUrl, action.printConfig)
                )
                    .map(response =>
                        getPrintStatus("waiting", response.data.statusURL)
                    )
                    .catch(err =>
                        Rx.Observable.of(
                            printError(
                                "sendPrintRequestError",
                                "sensitivitymapping.notifications.error",
                                "sensitivitymapping.notifications.getPrintStatusError",
                                { error: err.message }
                            )
                        )
                    );
            }

            const managementCommandUrl =
                `${geonodeUrl}api/v2/management/commands/create_sensitivity_report/jobs/`;
            const data = {
                args: [],
                kwargs: {
                    printConfig: action.printConfig,
                    printProperties: state.sensitivityMapping.printProperties,
                    mapLayers: sensitivityMappingLayersSelector(state)
                },
                autostart: false
            };

            return Rx.Observable.defer(() =>
                axios.post(managementCommandUrl, data)
            )
                .map(response =>
                    startManagementCommand(
                        "create_sensitivity_report",
                        response.data.data.id
                    )
                )
                .catch(err =>
                    Rx.Observable.of(
                        printError(
                            "sendPrintRequestError",
                            "sensitivitymapping.notifications.error",
                            "sensitivitymapping.notifications.getPrintStatusError",
                            { error: err.message }
                        )
                    )
                );
        });

// ---------------------------------------------------------------------------
// Management command epic
// ---------------------------------------------------------------------------

/**
 * Starts a previously-created management command job.
 */
export const startManagementCommandEpic = (action$, store) =>
    action$.ofType(START_MANAGEMENT_COMMAND)
        .switchMap((action) => {
            const state = store.getState();
            const commandsUrl =
                `${geonodeUrlSelector(state)}api/v2/management/commands/`;
            const commandUrl =
                `${commandsUrl}${action.command}/jobs/${action.jobId}/start/`;

            return Rx.Observable.defer(() => axios.patch(commandUrl))
                .map(response =>
                    getPrintStatus(
                        response.data.status,
                        `${commandsUrl}${action.command}/jobs/${action.jobId}/status/`
                    )
                )
                .catch(err =>
                    Rx.Observable.of(
                        printError(
                            "getPrintStatusError",
                            "sensitivitymapping.notifications.error",
                            "sensitivitymapping.notifications.getPrintStatusError",
                            { error: `${err.statusText} - ${err.status}` }
                        )
                    )
                );
        });

// ---------------------------------------------------------------------------
// Print status polling epic
// ---------------------------------------------------------------------------

// Interval between status polls (ms)
const POLL_INTERVAL_MS = 2000;

/**
 * Polls the print server (or management command API) for the status of a
 * print job. Uses a timer delay between polls to avoid hammering the server.
 */
export const getPrintStatusEpic = (action$, store) =>
    action$.ofType(GET_PRINT_STATUS)
        .filter(() => enabledSelector(store.getState()))
        .switchMap((action) => {
            const state = store.getState();
            const geonodeUrl = geonodeUrlSelector(state);
            const cfg = mapfishConfigSelector(state);

            if (!state.sensitivityMapping.printProperties.report) {
                const statusUrl = `${geonodeUrl}${cfg.mapfishUrl}${action.statusUrl}`;

                return Rx.Observable.defer(() => axios.get(statusUrl))
                    .switchMap((response) => {
                        const status = response.data.status;

                        if (status === "waiting" || status === "running") {
                            // Poll again after a delay
                            return Rx.Observable.timer(POLL_INTERVAL_MS)
                                .map(() => getPrintStatus(status, action.statusUrl));
                        }

                        if (status === "error") {
                            return Rx.Observable.of(
                                printError(
                                    "getPrintStatusError",
                                    "sensitivitymapping.notifications.error",
                                    "sensitivitymapping.notifications.getPrintStatusError",
                                    { error: response.data.error }
                                )
                            );
                        }

                        return Rx.Observable.of(
                            downloadMap(`${geonodeUrl}${cfg.mapfishUrl}${response.data.downloadURL}`)
                        );
                    })
                    .catch(err =>
                        Rx.Observable.of(
                            printError(
                                "getPrintStatusError",
                                "sensitivitymapping.notifications.error",
                                "sensitivitymapping.notifications.getPrintStatusError",
                                { error: err.message }
                            )
                        )
                    );
            }

            // Management command status polling
            return Rx.Observable.defer(() => axios.get(action.statusUrl))
                .switchMap((response) => {
                    if (response.data.status !== "FINISHED") {
                        return Rx.Observable.timer(POLL_INTERVAL_MS)
                            .map(() => getPrintStatus(response.data.status, action.statusUrl));
                    }

                    let outputMessage;
                    try {
                        outputMessage = JSON.parse(
                            response.data.output_message.replace("\n", "")
                        );
                    } catch {
                        return Rx.Observable.of(
                            printError(
                                "getPrintStatusError",
                                "sensitivitymapping.notifications.error",
                                "sensitivitymapping.notifications.getPrintStatusError",
                                { error: "Invalid response from server" }
                            )
                        );
                    }

                    if (outputMessage.type === "success") {
                        return Rx.Observable.of(downloadMap(outputMessage.message));
                    }

                    return Rx.Observable.of(
                        printError(
                            "getPrintStatusError",
                            "sensitivitymapping.notifications.error",
                            "sensitivitymapping.notifications.getPrintStatusError",
                            { error: outputMessage.message }
                        )
                    );
                })
                .catch(err =>
                    Rx.Observable.of(
                        printError(
                            "getPrintStatusError",
                            "sensitivitymapping.notifications.error",
                            "sensitivitymapping.notifications.getPrintStatusError",
                            { error: err.message }
                        )
                    )
                );
        });

// ---------------------------------------------------------------------------
// Download / error notification epics
// ---------------------------------------------------------------------------

/**
 * Shows a success notification once a download URL is available.
 */
export const downloadMapEpic = (action$, store) =>
    action$.ofType(DOWNLOAD_MAP)
        .filter(() => enabledSelector(store.getState()))
        .filter(action => !!action.downloadUrl)
        .switchMap(() =>
            Rx.Observable.of(
                success({
                    uid: "printSuccess",
                    title: "sensitivitymapping.notifications.success",
                    message: "sensitivitymapping.notifications.printSuccess",
                    action: { label: "sensitivitymapping.notifications.close" },
                    position: "tr",
                    autoDismiss: 20
                })
            )
        );

/**
 * Shows an error notification and resets the loading/error status when a
 * print error occurs.
 */
export const printErrorEpic = (action$) =>
    action$.ofType(PRINT_ERROR)
        .switchMap((action) =>
            Rx.Observable.of(
                changePrintStatus(false, true),
                error({
                    uid: action.uid,
                    title: action.title,
                    message: action.message,
                    action: { label: "sensitivitymapping.notifications.close" },
                    values: action.values,
                    position: "tr",
                    autoDismiss: 0
                })
            )
        );

export default {
    gnUpdateSensitivityMappingMapLayoutEpic,
    initSensitivityMappingPrintEpic,
    loadPrintApplicationsEpic,
    openSensitivityMappingEpic,
    closeSensitivityMappingEpic,
    toggleDrawerControlEpic,
    loadSelectedStyleEpic,
    loadSelectedStylesEpic,
    loadFeaturesEpic,
    updateLayerEpic,
    changeMapViewEpic,
    updatePrintPropertyEpic,
    loadPrintLayoutEpic,
    selectPrintApplicationEpic,
    initiatePrintPropertiesEpic,
    setPrintExtentEpic,
    createPrintConfigEpic,
    sendPrintRequestEpic,
    startManagementCommandEpic,
    getPrintStatusEpic,
    downloadMapEpic,
    printErrorEpic
};
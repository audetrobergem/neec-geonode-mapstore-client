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
import { boundingSidebarRectSelector, mapLayoutSelector } from '@mapstore/framework/selectors/maplayout';
import { LayoutSections } from "@js/utils/LayoutUtils";
import {
    initSensitivityMappingPrint,
    setPrintApplication,
    setInitialMapProperties,
    setPrintCapabilities,
    setPrintProperties,
    updatePrintProperty,
    getCoordinatesSystems,
    loadPrintLayout,
    setPrintExtent,
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
import { reproject, formatPrintLayer, formatLegend, getProjections, getLayerTitle } from '@js/utils/PrintUtils';
import { removeAdditionalLayer, updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import { UPDATE_NODE, CHANGE_LAYER_PROPERTIES } from '@mapstore/framework/actions/layers';
import { REDUCERS_LOADED } from '@mapstore/framework/actions/storemanager';
import { optionsToVendorParams } from '@mapstore/framework/utils/VendorParamsUtils';
import { getFeature } from '@mapstore/framework/api/WFS';
import { error, success, warning } from '@mapstore/framework/actions/notifications';
import { hideMapinfoMarker, purgeMapInfoResults, toggleMapInfoState } from '@mapstore/framework/actions/mapInfo';

/**
 * Override the layout to get the correct right offset when the data print tool is open
 */
export const gnUpdateSensitivityMappingMapLayoutEpic = (action$, store) => action$.ofType(UPDATE_MAP_LAYOUT)
    .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
    .filter(({ source }) => {
        return source !== LayoutSections.PANEL;
    })
    .map(({ layout }) => {
        const mapLayout = { left: { sm: 350, md: 500, lg: 600 }, right: { md: 425 }, bottom: { sm: 30 } };
        const boundingSidebarRect = boundingSidebarRectSelector(store.getState());
        const left = !!store.getState()?.controls?.drawer?.enabled ? mapLayout.left.sm : null;
        const action = updateMapLayout({
            ...mapLayoutSelector(store.getState()),
            ...layout,
            right: mapLayout.right.md,
            ...(left && {left}),
            rightPanel: true,
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
 * This function captures the REDUCERS_LOADED action when MapStore is loading and loads the
 * MapFish print configuration. This configuration contains a list of applications available
 * on the print server. An error at this stage also signals an error with the print server.
 * This list enables the print module to subsequently load the settings for each application
 * when it is initialized.
 * @param {external:Observable} action$ manages `REDUCERS_LOADED`
 * @returns {external:Observable} `INIT_SENSITIVITY_MAPPING_PRINT`
 */
export const initSensitivityMappingPrintEpic = (action$, store) =>
    action$.ofType(REDUCERS_LOADED)
        .switchMap(() => {
            const state = store.getState();
            const geonodeUrl = state.gnsettings?.geonodeUrl;
            const sensitivityMappingConfig = state.localConfig?.plugins.map_viewer.find((plugin) =>
                plugin.name === "SensitivityMapping");
            const mapfishUrl = sensitivityMappingConfig.cfg.mapfishUrl;
            const appsUrl = `${geonodeUrl}${mapfishUrl}/print/apps.json`;
            return Rx.Observable.fromPromise(
                axios.get(appsUrl)
                    .then(response => {
                        return initSensitivityMappingPrint(response.data);
                    })
                    .catch(err => {
                        return initSensitivityMappingPrint(err.originalError.message);
                    })
            );
        });

/**
 * This function captures the INIT_SENSITIVITY_MAPPING_PRINT action, which contains the list
 * of applications available on the print server, and loads their settings into the Sensitivity
 * Mapping plugin state. Group restrictions are applied at this stage.
 * @param {external:Observable} action$ manages `INIT_SENSITIVITY_MAPPING_PRINT`
 * @returns {external:Observable} `EMPTY`
 */
export const loadPrintApplicationsEpic = (action$, store) =>
    action$.ofType(INIT_SENSITIVITY_MAPPING_PRINT)
        .switchMap((action) => {
            const state = store.getState();
            if (typeof action.mapfishPrintApps === "string") {
                state.sensitivityMapping.sensitivityMappingLoadingError = true;
                return Rx.Observable.of(
                    error({
                        uid: "initSensitivityMappingPrintError",
                        title: "sensitivitymapping.notifications.error",
                        message: "sensitivitymapping.notifications.initSensitivityMappingPrintError",
                        action: {
                            label: "sensitivitymapping.notifications.close"
                        },
                        position: "tr",
                        values: {message: action.mapfishPrintApps},
                        autoDismiss: 0
                    })
                );
            }
            const geonodeUrl = state.gnsettings?.geonodeUrl;
            const sensitivityMappingConfig = state.localConfig?.plugins.map_viewer
                .find((plugin) => plugin.name === "SensitivityMapping");
            const mapfishUrl = sensitivityMappingConfig.cfg.mapfishUrl;
            const userGroups = state.security.user.info.groups;
            state.sensitivityMapping.printApplications = [];
            let mapfishLoadingError = false;
            sensitivityMappingConfig.cfg.applications.forEach((application) => {
                if (application.restrictions && application.restrictions.some(restriction => userGroups.includes(restriction))) {
                    const capabilitiesUrl = `${geonodeUrl}${mapfishUrl}/print/${application.name}/capabilities.json`;
                    return Rx.Observable.fromPromise(
                        axios.get(capabilitiesUrl)
                            .then(response => {
                                state.sensitivityMapping.printApplications.push(response.data);
                            })
                            .catch(() => {
                                mapfishLoadingError = true;
                            })
                    );
                }
                const capabilitiesUrl = `${geonodeUrl}${mapfishUrl}/print/${application.name}/capabilities.json`;
                return Rx.Observable.fromPromise(
                    axios.get(capabilitiesUrl)
                        .then(response => {
                            state.sensitivityMapping.printApplications.push(response.data);
                        })
                        .catch(() => {
                            mapfishLoadingError = true;
                        })
                );

            });
            if (mapfishLoadingError) {
                return Rx.Observable.from(
                    error({
                        uid: "initSensitivityMappingPrintError",
                        title: "sensitivitymapping.notifications.error",
                        message: "sensitivitymapping.notifications.initSensitivityMappingPrintError",
                        action: {
                            label: "sensitivitymapping.notifications.close"
                        },
                        position: "tr",
                        autoDismiss: 0
                    })
                );
            }
            return Rx.Observable.empty();
        });

/**
 * This function disables the layer query tool when the print tool is activated. It also loads
 * the initial map properties into the plugin store and assigns the default print application.
 * @param {external:Observable} action$ manages `SET_CONTROL_PROPERTY`
 * @returns {external:Observable} `PURGE_MAPINFO_RESULTS`, `HIDE_MAPINFO_MARKER`,
 * `TOGGLE_MAPINFO_STATE`, `SET_INITIAL_MAP_PROPERTIES`, `SET_PRINT_APPLICATION`
 */
export const openSensitivityMappingEpic = (action$, store) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "sensitivityMapping")
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const sensitivityMappingConfig = state.localConfig?.plugins.map_viewer.find((plugin) =>
                plugin.name === "SensitivityMapping");
            const defaultApplicationName = sensitivityMappingConfig.cfg.defaultApplication;
            const defaultApplication = sensitivityMappingConfig.cfg.applications
                .find((app) => app.name === defaultApplicationName);
            let mapView = state.map.present;
            return Rx.Observable.of(
                purgeMapInfoResults(),
                hideMapinfoMarker(),
                toggleMapInfoState(),
                setInitialMapProperties(mapView),
                setPrintApplication(defaultApplication)
            );
        });

/**
 * This function is executed when the print tool is closed. It reactivates the map click,
 * removes the print extent layer and zooms back to the original map.
 * @param {external:Observable} action$ manages `SET_CONTROL_PROPERTY`
 * @returns {external:Observable} `TOGGLE_MAPINFO_STATE`, `REMOVE_ADDITIONAL_LAYER`, `ZOOM_TO_EXTENT`
 */
export const closeSensitivityMappingEpic = (action$, store) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter((action) => action.control === "sensitivityMapping")
        .filter((action) => action.property === "enabled" && action.value === false)
        .switchMap(() => {
            const state = store.getState();
            const mapCenter = state.sensitivityMapping.initialMapProperties.center;
            const mapExtent = [mapCenter.x, mapCenter.y, mapCenter.x, mapCenter.y];
            const mapZoom = state.sensitivityMapping.initialMapProperties.zoom;
            const printApplications = state.sensitivityMapping.printApplications;
            state.sensitivityMapping = {};
            state.sensitivityMapping.printApplications = printApplications;
            return Rx.Observable.of(
                toggleMapInfoState(),
                removeAdditionalLayer({ id: "sensitivity-mapping-print-extent" }),
                zoomToExtent(mapExtent, "EPSG:4326", mapZoom)
            );
        });

/**
 * The left panel (layer tree) hides part of the map when displayed. It is therefore possible
 * that the print extent polygon is partially hidden by this panel. We therefore modify the
 * zoom level and the map center so that the print extent polygon is fully displayed when the
 * panel is displayed or removed from the map.
 *
 * We also use the coordinates of the additional layer rather than the bbox entered in the print
 * properties, as they are in degrees and not projected. This avoids a problem with UTM coordinates,
 * which don't seem to be supported by the version of the proj4 library used in MapStore.
 *
 * @param {external:Observable} action$ manages `TOGGLE_CONTROL`
 * @returns {external:Observable} `ZOOM_TO_EXTENT`
 */
export const toggleDrawerControlEpic = (action$, store) =>
    action$.ofType(TOGGLE_CONTROL)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .filter((action) => action.control === "drawer")
        .switchMap(() => {
            const state = store.getState();
            const features = state.additionallayers.find((additionalLayer) =>
                additionalLayer.id === "sensitivity-mapping-print-extent").options.features[0].geometry.coordinates[1];
            const printExtent = [features[0][0], features[0][1], features[2][0], features[2][1]];
            return Rx.Observable.of(
                zoomToExtent(printExtent, "EPSG:4326")
            );
        });

/**
 * The print tool uses styles to determine whether the layer uses single or categorized
 * symbology. The name of the style used in the map is saved in the configuration of each
 * layer. We need to load the content of this style into the warehouse so that we can
 * access it later when creating the print setup. This function load the selected style
 * for a specific layer.
 * @param {external:Observable} action$ manages `LOAD_SELECTED_STYLES`
 * @returns {external:Observable} `EMPTY`
 */
export const loadSelectedStyleEpic = (action$, store) =>
    action$.ofType(LOAD_SELECTED_STYLE)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const geonodeUrl = state.gnsettings?.geonodeUrl;
            let layerToEdit = state.sensitivityMapping.layers.find(layer => layer.name === action.layer);
            let selectedStyle = layerToEdit.extendedParams.mapLayer.dataset.styles
                .find(style => layerToEdit.style.includes(style.name) || style.name.includes(layerToEdit.style));
            // Some styles may not appear in the list of available styles. This is probably
            // the case if the map was created before a style was added (perhaps...). If this
            // is the case, the selectedStyle variable will be undefined. We can try to load
            // the correct style with its name. This strategy only works for data published
            // in the neec_geodb workspace.
            if (!selectedStyle) {
                selectedStyle = {
                    sld_url: `${geonodeUrl}geoserver/rest/workspaces/neec_geodb/styles/${layerToEdit.style.replace("neec_geodb:", "")}.sld`
                };
            }
            if (selectedStyle) {
                Rx.Observable.fromPromise(
                    axios.get(selectedStyle.sld_url)
                        .then(response => {
                            layerToEdit.selectedStyle = response.data;
                        })
                );
            } else {
                console.warn(`Style for layer ${action.layer} could not be loaded...`);
            }
            return Rx.Observable.empty();
        });

/**
 * The print tool uses styles to determine whether the layer uses single or categorized
 * symbology. The name of the style used in the map is saved in the configuration of each
 * layer. We need to load the content of this style into the warehouse so that we can
 * access it later when creating the print setup. This function load the selected style
 * for all the layers.
 * @param {external:Observable} action$ manages `LOAD_SELECTED_STYLES`
 * @returns {external:Observable} `LOAD_FEATURES`
 */
export const loadSelectedStylesEpic = (action$, store) =>
    action$.ofType(LOAD_SELECTED_STYLES)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const localLayers = action.layers.slice().reverse().filter((layer) => {
                return layer.group !== "basemaps" &&
                    layer.extendedParams &&
                    layer.style.length > 0;
            });
            if (localLayers) {
                localLayers.forEach(layer => {
                    try {
                        const selectedStyle = layer.extendedParams.mapLayer.dataset.styles
                            .find((style) => layer.style.includes(style.name) || style.name.includes(layer.style));
                        if (selectedStyle) {
                            Rx.Observable.fromPromise(
                                axios.get(selectedStyle.sld_url)
                                    .then((response) => {
                                        layer.selectedStyle = response.data;
                                    })
                            );
                        }
                    } catch (requestError) {
                        console.warn(`Style for layer ${layer.name} could not be loaded... \n ${requestError}`);
                    }
                });
                return Rx.Observable.of(
                    loadFeatures(action.layers)
                );
            }
            return Rx.Observable.empty();
        });

/**
 * Vector layers must contain features in geojson format. This is not the case for WFS
 * layers. We need to load the features from a GetFeature call to the WFS and save them to the
 * store so we can add them to the print configuration.
 * @param {external:Observable} action$ manages `LOAD_FEATURES`
 * @returns {external:Observable} `GET_FEATURE`
 */
export const loadFeaturesEpic = (action$, store) =>
    action$.ofType(LOAD_FEATURES)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const printProjection = state.sensitivityMapping.printProperties.projection;
            const projectionDefinition = state.sensitivityMapping.projections
                .find((projection) => projection.code === printProjection);
            const bottomLeft = reproject(
                [state.map.present.bbox.bounds.minx, state.map.present.bbox.bounds.miny],
                "EPSG:3857",
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${state.sensitivityMapping.printProperties.projection}`
            );
            const topRight = reproject(
                [state.map.present.bbox.bounds.maxx, state.map.present.bbox.bounds.maxy],
                "EPSG:3857",
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${state.sensitivityMapping.printProperties.projection}`
            );
            const wfsLayers = action.layers.slice().reverse().filter((layer) => {
                return layer.type === "wfs";
            });
            wfsLayers.forEach(layer => {
                return  Rx.Observable.of(
                    getFeature(layer.url, layer.name, {
                        outputFormat: "application/json",
                        srsName: `EPSG:${state.sensitivityMapping.printProperties.projection}`,
                        bbox: `${bottomLeft.x},${bottomLeft.y},${topRight.x},${topRight.y},EPSG:${state.sensitivityMapping.printProperties.projection}`,
                        ...(optionsToVendorParams(layer) || {})
                    })
                        .then(({data}) => (
                            layer.geoJson = data
                        ))
                );
            });
            return Rx.Observable.empty();
        });

/**
 * This function reloads the parameters of a layer following a modification (activation/deactivation
 * of a layer, change of title, etc.) and saves the new value in the store.
 * @param {external:Observable} action$ manages `UPDATE_NODE` and `CHANGE_LAYER_PROPERTIES`
 * @returns {external:Observable} `EMPTY`
 */
export const updateLayerEpic = (action$, store) =>
    action$.ofType(UPDATE_NODE, CHANGE_LAYER_PROPERTIES)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            if (action.type === "UPDATE_NODE") {
                let sensitivityMappingLayer = state.sensitivityMapping.layers
                    .find((layer) => layer.id === action.node);
                let styleModification = false;
                Object.entries(action.options).forEach(([key, value]) => {
                    sensitivityMappingLayer[key] = value;
                    styleModification = key === "style" ? true : false;
                });
                if (styleModification) {
                    return Rx.Observable.of(
                        loadSelectedStyle(sensitivityMappingLayer.name)
                    );
                }
            } else if (action.type === "CHANGE_LAYER_PROPERTIES") {
                let sensitivityMappingLayer = state.sensitivityMapping.layers
                    .find((layer) => layer.id === action.layer);
                sensitivityMappingLayer[Object.keys(action.newProperties)[0]] = Object.values(action.newProperties)[0];
            }
            return Rx.Observable.empty();
        });

/**
 * This function allows you to capture CHANGE_MAP_VIEW actions when the print tool is activated, in order
 * to perform certain operations, mainly the extraction of the center point used to draw the print extent
 * polygon and to extract the corresponding UTM projection.
 * @param {external:Observable} action$ manages `CHANGE_MAP_VIEW`
 * @returns {external:Observable} `UPDATE_PRINT_PROPERTY`, `LOAD_FEATURES`, `PAN_TO`,
 * `GET_COORDINATES_SYSTEMS`
 */
export const changeMapViewEpic = (action$, store) =>
    action$.ofType(CHANGE_MAP_VIEW)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .filter(() => store.getState()?.sensitivityMapping?.selectedPrintApplication)
        .switchMap((action) => {
            const state = store.getState();
            const updatedCoordinatesSystems = getProjections(
                state.sensitivityMapping.selectedPrintApplication,
                state.sensitivityMapping.printProperties.scale,
                action.center.x
            );
            // The print options panel does not change the map size when displayed. This means that the map's
            // center point does not change, which poses a problem in terms of centering the map when the
            // user moves the print polygon. To avoid this problem, we calculate an the offset and
            // apply it to the center point.
            const mapResolution = action.resolution;
            const mapWidth = state.map.present.size.width;
            const rightPanelWidth = state.maplayout.layout.right;
            const rightOffsetWith = (mapWidth / 2 - (mapWidth - rightPanelWidth) / 2) * mapResolution;
            let offsetWidth = rightOffsetWith;
            // The same applies to the panel containing the list of layers. We need to calculate an offset when
            // it is displayed.
            if (state.maplayout.layout.leftPanel) {
                const leftPanelWidth = state.maplayout.layout.left;
                const leftOffsetWith = (mapWidth / 2 - (mapWidth - leftPanelWidth) / 2) * mapResolution;
                offsetWidth -= leftOffsetWith;
            }
            // Calculating the map center point from the calculated offset
            const mapCenter = [action.center.x, action.center.y];
            let mapCenter3857 = reproject(mapCenter, "EPSG:4326", "EPSG:3857");
            mapCenter3857.x = mapCenter3857.x - offsetWidth;
            const newCenter = reproject(mapCenter3857, "EPSG:3857", "EPSG:4326");

            const presentMapCenter = [action.center.x, action.center.y];
            const pastMap = state.map.past[state.map.past.length - 1];
            const pastMapCenter = [pastMap.center.x, pastMap.center.y];

            // The map center point can be moved by the user without changing the zoom level. In
            // this case, the new center will be calculated to ignore the left and right panels,
            // and will be added to the print parameters to regenerate the bbox and reload the
            // WFS layer features present in the map.
            if (presentMapCenter[0] !== pastMapCenter[0] || presentMapCenter[1] !== pastMapCenter[1]) {
                return Rx.Observable.of(
                    updatePrintProperty({name: "mapCenter", value: newCenter}),
                    loadFeatures(state.sensitivityMapping.layers)
                );
            }
            // The user can also change the extent of the map by clicking on the zoom in and zoom out
            // buttons. These buttons do not change the center point of the map to be printed. However,
            // there is an offset between the center of the printout and the center of the new map, as
            // the zoom is performed on the center point of the map, which is offset from the center
            // point of the printout (due to the right panel). We need to move the map center so that
            // it is centered with the previous view.
            const deltaXDeg = Math.abs(newCenter.x - action.center.x);
            let offsetCenter = {...action.center};
            if (pastMap.zoom > action.zoom) {
                offsetCenter.x = offsetCenter.x + deltaXDeg / 2;
            } else {
                // The map must be moved westwards when the zoom in button is clicked. There seems to
                // be a problem with the panTo function when the longitude is smaller than that of
                // the center of the map. To get around this, we add 180 degrees to the difference
                // and it works.
                offsetCenter.x = 180 - Math.abs(offsetCenter.x - deltaXDeg) + 180;
            }
            return Rx.Observable.of(
                panTo(offsetCenter),
                getCoordinatesSystems(updatedCoordinatesSystems),
                updatePrintProperty({name: "mapCenter", value: newCenter}),
                loadFeatures(state.sensitivityMapping.layers)
            );
        });

/**
 * This function is triggered when a print setting is changed. The actions taken depend on the
 * parameter modified.
 * @param {external:Observable} action$ manages `UPDATE_PRINT_PROPERTY`
 * @returns {external:Observable} `SET_PRINT_PROPERTIES`, `SET_PRINT_EXTENT`,
 * `GET_COORDINATES_SYSTEMS`
 */
export const updatePrintPropertyEpic = (action$, store) =>
    action$.ofType(UPDATE_PRINT_PROPERTY)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            state.sensitivityMapping.printProperties[`${action.printProperty.name}`] = action.printProperty.value;
            if (["legend2Pages", "orientation", "language"].includes(action.printProperty.name)) {
                // Changing certain printing options also modifies the printing template used. These include the
                // orientation and display of the legend on two pages. When these options change, we modify the
                // selected template before recalculating the map extent polygon.
                return Rx.Observable.of(
                    setPrintProperties(state.sensitivityMapping.printProperties)
                );
            } else if (["mapCenter", "scale", "projection"].includes(action.printProperty.name)) {
                // Changing other print properties only modifies the print range polygon.
                const updatedCoordinatesSystems = getProjections(
                    state.sensitivityMapping.selectedPrintApplication,
                    state.sensitivityMapping.printProperties.scale,
                    state.sensitivityMapping.printProperties.mapCenter.x
                );
                return Rx.Observable.of(
                    setPrintExtent(),
                    getCoordinatesSystems(updatedCoordinatesSystems)
                );
            }
            return Rx.Observable.empty();
        });

/**
 * This function loads the print template corresponding to the user-selected print options. The
 * following options influence the template name: legend2Pages, orientation and language. The
 * model will be loaded and the extent of the print polygon will be modified.
 * @param {external:Observable} action$ manages `SET_PRINT_PROPERTIES`
 * @returns {external:Observable} `LOAD_PRINT_LAYOUT`, `SET_PRINT_EXTENT`
 */
export const loadPrintLayoutEpic = (action$, store) =>
    action$.ofType(SET_PRINT_PROPERTIES)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            const selectedPrintCapabilities = state.sensitivityMapping?.selectedPrintCapabilities;
            let printLayoutName = `${selectedPrintCapabilities.app}_${action.printProperties.orientation.toLowerCase()}`;
            if (action.printProperties.legend2Pages) {
                printLayoutName += "_2pages";
            }
            printLayoutName += `_${action.printProperties.language}`;
            const printLayout = selectedPrintCapabilities.layouts
                .find((layout) => layout.name === printLayoutName);
            if (!printLayout) {
                return Rx.Observable.of(
                    error({
                        uid: "loadPrintLayoutError",
                        title: "sensitivitymapping.notifications.error",
                        message: "sensitivitymapping.notifications.loadPrintLayoutError",
                        action: {
                            label: "sensitivitymapping.notifications.close"
                        },
                        values: {printLayoutName: printLayoutName},
                        position: "tr",
                        autoDismiss: 0
                    })
                );
            }
            if (printLayout !== state.sensitivityMapping.printLayout) {
                return Rx.Observable.of(
                    loadPrintLayout(printLayout),
                    setPrintExtent()
                );
            }
            return Rx.Observable.empty();
        });

/**
 * This function loads the print server's printing capabilities from the printing application selected
 * by the user.
 * @param {external:Observable} action$ manages `SET_PRINT_APPLICATION`
 * @returns {external:Observable} `SET_PRINT_CAPABILITIES`
 */
export const selectPrintApplicationEpic = (action$, store) =>
    action$.ofType(SET_PRINT_APPLICATION)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap(
            (action) => {
                const state = store.getState();
                // We reset error and warning messages when the selected application changes.
                state.sensitivityMapping.downloadUrl = undefined;
                state.sensitivityMapping.error = false;
                const selectedPrintApplication = state.sensitivityMapping.printApplications
                    .find((item) => item.app === action.selectedPrintApplication.name);
                return Rx.Observable.of(
                    setPrintCapabilities(selectedPrintApplication)
                );
            });

/**
 * This function loads the initial print properties when the print tool is opened. It is also used when
 * changing print templates, to ensure that the chosen properties are available with the selected template.
 *
 * Once the print properties have been selected, the getCoordinatesSystems function will select the available
 * coordinate systems according to the selected template, longitude and print scale. Print properties are
 * saved in the application state using the setPrintProperties function. Finally, the loadSelectedStyles
 * function will be called to add the contents of the SLD style file to the properties of each layer in the
 * application state.
 *
 * @param {external:Observable} action$ manages `SET_PRINT_CAPABILITIES`
 * @returns {external:Observable} `GET_COORDINATES_SYSTEMS`, `SET_PRINT_PROPERTIES`, `LOAD_SELECTED_STYLES`
 */
export const initiatePrintPropertiesEpic = (action$, store) =>
    action$.ofType(SET_PRINT_CAPABILITIES)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap(
            (action) => {
                if (action.selectedPrintCapabilities) {
                    const state = store.getState();
                    const sensitivityMappingConfig = state.localConfig?.plugins.map_viewer
                        .find((plugin) => plugin.name === "SensitivityMapping");
                    // Some printing options are not available for all templates. One such option is orientation.
                    // Print options are retained when the user changes the print template. Check that the
                    // selected option exists in the new template. The default option will be selected if the
                    // option is not allowed.
                    const printAppProperties = sensitivityMappingConfig.cfg.applications
                        .find((app) => app.name === action.selectedPrintCapabilities.app);
                    const printProperties = {
                        title: state.sensitivityMapping.printProperties?.title ? state.sensitivityMapping.printProperties.title : "",
                        scale: state.sensitivityMapping.printProperties?.scale ? state.sensitivityMapping.printProperties.scale : Math.floor(DEFAULT_SCREEN_DPI * 39.37 * state.map.present.resolution),
                        language: state.sensitivityMapping.printProperties?.language ? state.sensitivityMapping.printProperties.language : state.locale?.current.slice(0, 2),
                        projection: state.sensitivityMapping.printProperties?.projection ? state.sensitivityMapping.printProperties.projection : "3857",
                        format: state.sensitivityMapping.printProperties?.format ? state.sensitivityMapping.printProperties.format : "pdf",
                        mapCenter: state.sensitivityMapping.printProperties?.mapCenter ? state.sensitivityMapping.printProperties.mapCenter : state.sensitivityMapping.initialMapProperties.center,
                        resolution: state.sensitivityMapping.printProperties?.resolution ? state.sensitivityMapping.printProperties?.resolution : "300",
                        legend2Pages: state.sensitivityMapping.printProperties?.legend2Pages ? state.sensitivityMapping.printProperties?.legend2Pages : false,
                        orientation: state.sensitivityMapping.printProperties?.orientation ? state.sensitivityMapping.printProperties?.orientation : "Landscape",
                        filterLegend: state.sensitivityMapping.printProperties?.filterLegend ? state.sensitivityMapping.printProperties?.filterLegend : true,
                        gridLayer: state.sensitivityMapping.printProperties?.gridLayer ? state.sensitivityMapping.printProperties?.gridLayer : false
                    };
                    const updatedCoordinatesSystems = getProjections(
                        state.sensitivityMapping.selectedPrintApplication,
                        printProperties.scale,
                        printProperties.mapCenter.x
                    );
                    // Sensitivity maps are printed using the UTM projection corresponding to the longitude, insofar
                    // as the scale allows. We therefore change the selected projection when the user selects the
                    // Sensitivity Mapping application template. The scale is also adjusted to cover approximately
                    // the same area.
                    if (action.selectedPrintCapabilities.app === "sensitivity-mapping") {
                        if (printProperties.projection === "3857") {
                            const utmProjection = updatedCoordinatesSystems.find(projection => projection.name.includes("UTM"));
                            if (utmProjection) {
                                printProperties.projection = utmProjection.code;
                                printProperties.scale = Math.round(printProperties.scale * 0.65);
                            }
                        }
                    }
                    // Certain print properties influence the print template selected. Not all options are permitted
                    // with all templates, so we check that the items in the following list are among the permitted
                    // options. If not, we'll need to delete the property.
                    const templateProperties = ["legend2Pages", "orientation", "gridLayer"];
                    templateProperties.map(printProperty => {
                        let printPropertyPresence = printAppProperties.properties.find( property => property.name === printProperty );
                        if (!printPropertyPresence) {
                            delete printProperties[printProperty];
                        } else {
                            if (printPropertyPresence.options && !printPropertyPresence.options.includes(printProperty)) {
                                // Some other property options, such as orientation, may not be available in the selected
                                // template. For example, a user selects Portrait orientation and then selects a new
                                // template that only allows Landscape orientation. In this case, we change the property
                                // to the default.
                                printProperties[printProperty] = printAppProperties.properties
                                    .find( property => property.name === printProperty ).default;
                            }
                        }
                    });
                    return Rx.Observable.of(
                        getCoordinatesSystems(updatedCoordinatesSystems),
                        setPrintProperties(printProperties),
                        loadSelectedStyles(state.layers.flat)
                    );
                }
                return Rx.Observable.empty();
            }
        );

/**
 * This function calculates the print range from the card settings. The first step is to calculate the
 * resolution of the map at print scale to determine the print extent. The resolution converts the print
 * size in pixels into ground distance in meters. The resolution is obtained with the following calculation:
 *
 * mapResolution = mapScale / (72 * 39.37)
 *
 * where 72 corresponds to the inches / pixels conversion factor used by Jasper Reports and 39.37 the number
 * of inches in a meter.
 *
 * We can then calculate the distance in meters of the print by multiplying the width and height of the
 * printed map by the resolution. The extent can then be calculated by subtracting and adding half the
 * height and width at the center point of the print. The coordinates of the lower left point and the
 * upper right point are finally reprojected to match the coordinate system of the print.
 *
 * @param {external:Observable} action$ manages `SET_PRINT_EXTENT`
 * @returns {external:Observable} `UPDATE_ADDITIONAL_LAYER`, `ZOOM_TO_EXTENT`
 */
export const setPrintExtentEpic = (action$, store) =>
    action$.ofType(SET_PRINT_EXTENT)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const printProjection = state.sensitivityMapping.printProperties.projection;
            const projectionDefinition = state.sensitivityMapping.projections
                .find((projection) => projection.code === printProjection);
            const mapScale = state.sensitivityMapping.printProperties.scale;
            // The conversion factor is the one used by JasperReports (1 inch = 72 * pixel).
            const mapResolution = mapScale / (72 * 39.37);
            const layoutMainMap = state.sensitivityMapping.printLayout.attributes
                .find((attribute) => attribute.name === "mainMap");
            const layoutHeight = layoutMainMap.clientInfo.height * mapResolution;
            const layoutWidth = layoutMainMap.clientInfo.width * mapResolution;
            const mapCenter = [
                state.sensitivityMapping.printProperties.mapCenter.x,
                state.sensitivityMapping.printProperties.mapCenter.y
            ];
            const projectedMapCenter = reproject(
                mapCenter,
                "EPSG:4326",
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`
            );

            // Calculate the 4 points of the print extent
            const halfHeight = layoutHeight / 2;
            const halfWidth = layoutWidth / 2;
            const bottomLeft = reproject(
                [projectedMapCenter.x - halfWidth, projectedMapCenter.y - halfHeight],
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`,
                "EPSG:4326"
            );
            const bottomRight = reproject(
                [projectedMapCenter.x + halfWidth, projectedMapCenter.y - halfHeight],
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`,
                "EPSG:4326"
            );
            const topRight = reproject(
                [projectedMapCenter.x + halfWidth, projectedMapCenter.y + halfHeight],
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`,
                "EPSG:4326"
            );
            const topLeft = reproject(
                [projectedMapCenter.x - halfWidth, projectedMapCenter.y + halfHeight],
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`,
                "EPSG:4326"
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
            state.sensitivityMapping.printProperties.bbox = projectedMapExtent;
            const extentLayer = {
                id: "sensitivity-mapping-print-extent",
                name: "sensitivity-mapping-print-extent",
                type: "vector",
                features: [
                    {
                        type: "Feature",
                        properties: {},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
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
                        "style": {
                            fillColor: '#808080',
                            fillOpacity: 0.5,
                            color: '#808080',
                            opacity: 1,
                            weight: 0
                        }
                    }
                ]
            };
            if (state.additionallayers.find((additionalLayer) => additionalLayer.id === "sensitivity-mapping-print-extent")) {
                return Rx.Observable.of(
                    updateAdditionalLayer(
                        "sensitivity-mapping-print-extent",
                        "SensitivityMapping",
                        'overlay',
                        extentLayer
                    )
                );
            }
            return Rx.Observable.of(
                updateAdditionalLayer(
                    "sensitivity-mapping-print-extent",
                    "SensitivityMapping",
                    'overlay',
                    extentLayer
                ),
                zoomToExtent(mapExtent, "EPSG:4326")
            );
        });

/**
 * This function creates the map configuration that will be sent to the print server. Here is an example
 * configuration, excluding layers and legends elements:
 * {
 *     layout: "default-print",
 *     outputFormat: "pdf",
 *     attributes: {
 *         title: "Map Title",
 *         coordinateSystem: "EPSG:3857",
 *         mainMap: {
 *             center: [
 *                 projectedMapCenter.x,
 *                 projectedMapCenter.y
 *             ],
 *             rotation: 0,
 *             longitudeFirst: true,
 *             layers: [],
 *             scale: 50000,
 *             projection: "EPSG:3857",
 *             dpi: 300,
 *             dpiSensitiveStyle: true
 *         },
 *         locatorMap: {
 *             center: [
 *                 projectedMapCenter.x,
 *                 projectedMapCenter.y
 *             ],
 *             rotation: 0,
 *             longitudeFirst: true,
 *             layers: [],
 *             scale: 1000000,
 *             projection: "EPSG:3857",
 *             dpi: 300
 *         },
 *         legend: {
 *             classes: []
 *         }
 *     }
 * }
 * @param {external:Observable} action$ manages `CREATE_PRINT_CONFIG`
 * @returns {external:Observable} `SEND_PRINT_REQUEST`
 */
export const createPrintConfigEpic = (action$, store) =>
    action$.ofType(CREATE_PRINT_CONFIG)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap(() => {
            const state = store.getState();
            state.sensitivityMapping.error = false;
            const mapLanguage = state.sensitivityMapping.printProperties.language;
            const printProperties = state.sensitivityMapping.printProperties;
            const projectionDefinition = state.sensitivityMapping.projections
                .find((projection) => projection.code === printProperties.projection);
            const projectedMapCenter = reproject(
                printProperties.mapCenter,
                "EPSG:4326",
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProperties.projection}`
            );
            // Calculation of the bounding box of the main map. This BBOX will be used to filter the legend if the user has
            // selected the option, and will be used to create the extent layer that will be displayed in the location map.
            let features = state.additionallayers.find((additionalLayer) =>
                additionalLayer.id === "sensitivity-mapping-print-extent").options.features;
            const bottomLeft = reproject(
                features[0].geometry.coordinates[1][0],
                "EPSG:4326",
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProperties.projection}`
            );
            const topRight = reproject(
                features[0].geometry.coordinates[1][2],
                "EPSG:4326",
                projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProperties.projection}`
            );
            const bbox = [bottomLeft.x, bottomLeft.y, topRight.x, topRight.y];

            let printConfig = {
                layout: state.sensitivityMapping.printLayout.name,
                outputFormat: printProperties.format,
                attributes: {
                    title: printProperties.title,
                    coordinateSystem: state.sensitivityMapping.projections.find((proj) => proj.code === printProperties.projection).name,
                    mainMap: {
                        center: [
                            projectedMapCenter.x,
                            projectedMapCenter.y
                        ],
                        rotation: 0,
                        longitudeFirst: true,
                        layers: [

                        ],
                        scale: printProperties.scale,
                        projection: `EPSG:${printProperties.projection}`,
                        dpi: printProperties.resolution,
                        dpiSensitiveStyle: true
                    },
                    locatorMap: {
                        center: [
                            projectedMapCenter.x,
                            projectedMapCenter.y
                        ],
                        rotation: 0,
                        longitudeFirst: true,
                        layers: [

                        ],
                        scale: printProperties.scale * 25,
                        projection: `EPSG:${printProperties.projection}`,
                        dpi: printProperties.resolution
                    },
                    legend: {
                        classes: []
                    }
                }
            };

            // Layers visible in the map are formatted and added to the print configuration
            let mainMapLayers = [];
            let legendClasses = [];
            let warningMessage = [];
            state.sensitivityMapping.layers.slice().reverse().forEach(layer => {
                if (layer.visibility) {
                    if (layer.group === "background") {
                        const formattedLayer = formatPrintLayer(layer, state);
                        if (formattedLayer && Object.keys(formattedLayer).length > 0) {
                            mainMapLayers.push(formattedLayer);
                        } else {
                            warningMessage.push(`${getLayerTitle(layer, mapLanguage)} (layer)`);
                        }
                    } else {
                        if (!layer.loadingError) {
                            const formattedLayer = formatPrintLayer(layer, state);
                            if (formattedLayer && Object.keys(formattedLayer).length > 0) {
                                mainMapLayers.push(formattedLayer);
                            } else {
                                warningMessage.push(`${getLayerTitle(layer, mapLanguage)} (layer)`);
                            }
                        } else {
                            warningMessage.push(`${getLayerTitle(layer, mapLanguage)} (layer)`);
                        }
                        if (!layer.loadingError) {
                            const formattedLegend = formatLegend(layer, bbox, state);
                            if (formattedLegend && Object.keys(formattedLegend).length > 0) {
                                legendClasses.push(formattedLegend);
                            } else {
                                warningMessage.push(`${getLayerTitle(layer, mapLanguage)} (legend)`);
                            }
                        } else {
                            warningMessage.push(`${getLayerTitle(layer, mapLanguage)} (legend)`);
                        }
                    }
                }
            });

            const locatorMapLayers = [
                {
                    type: "geojson",
                    name: "Map BBox",
                    geoJson: {
                        "type": "FeatureCollection",
                        "features": [
                            {
                                "type": "Feature",
                                "properties": {},
                                "geometry": {
                                    "type": "Polygon",
                                    "coordinates": [
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
                            "symbolizers": [
                                {
                                    "type": "polygon",
                                    "strokeDashstyle": "longdash",
                                    "strokeColor": "#900603",
                                    "strokeOpacity": 1,
                                    "fillColor": '#900603',
                                    "fillOpacity": 0.05
                                }
                            ]
                        }
                    }
                }, {
                    baseURL: "https://tiles.ueee.ca/geoserver/wms?",
                    opacity: 1,
                    type: "WMS",
                    layers: ["osm:osm"],
                    imageFormat: "image/png",
                    styles: [""],
                    customParams: {
                        TRANSPARENT: true,
                        TILED: true,
                        scaleMethod: "accurate"
                    },
                    serverType: "geoserver"
                }
            ];
            printConfig.attributes.mainMap.layers = mainMapLayers;
            printConfig.attributes.locatorMap.layers = locatorMapLayers;
            printConfig.attributes.legend.classes = legendClasses;

            // Create grid layer if selected by user
            if (printProperties.gridLayer) {
                let gridSpacing = undefined;
                if (printProperties.scale <= 10000) {
                    gridSpacing = 500;
                } else if (printProperties.scale > 10000 <= 20000) {
                    gridSpacing = 1000;
                } else if (printProperties.scale > 20000 <= 50000) {
                    gridSpacing = 2500;
                } else if (printProperties.scale > 50000 <= 100000) {
                    gridSpacing = 5000;
                } else if (printProperties.scale > 100000 <= 500000) {
                    gridSpacing = 10000;
                } else {
                    gridSpacing = 20000;
                }
                const gridLayer = {
                    "type": "grid",
                    "gridType": "lines",
                    "gridColor": "#000000",
                    "opacity": 0.7,
                    "horizontalYOffset": 15,
                    "verticalXOffset": 15,
                    "origin": [
                        0,
                        0
                    ],
                    "spacing": [
                        gridSpacing,
                        gridSpacing
                    ],
                    "labelColor": "#000000",
                    "font": {
                        "name": [
                            "Sans-serif"
                        ],
                        "size": 8
                    }
                };
                mainMapLayers.unshift(gridLayer);
            }
            // Uncomment the next line to display the print configuration in the console. Useful to debug.
            // console.log(printConfig);
            if (warningMessage.length > 0) {
                return Rx.Observable.of(
                    sendPrintRequest(printConfig),
                    warning(
                        {
                            uid: "warningMessage",
                            title: "sensitivitymapping.notifications.warning",
                            message: "sensitivitymapping.notifications.warningMessage",
                            action: {
                                label: "sensitivitymapping.notifications.close"
                            },
                            values: {layers: warningMessage.join(", ")},
                            position: "tr",
                            autoDismiss: 0
                        }
                    )
                );
            }
            return Rx.Observable.of(
                sendPrintRequest(printConfig)
            );
        });

/**
 * This function sends the request to the print server. Instead, the request is sent to the geoportal
 * API when the request also includes a report.
 * @param {external:Observable} action$ manages `SEND_PRINT_REQUEST`
 * @returns {external:Observable} `GET_PRINT_STATUS`, `START_MANAGEMENT_COMMAND`
 */
export const sendPrintRequestEpic = (action$, store) =>
    action$.ofType(SEND_PRINT_REQUEST)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            state.sensitivityMapping.downloadUrl = undefined;
            state.sensitivityMapping.loading = true;
            if (!state.sensitivityMapping.printProperties.report) {
                const printApp = state.sensitivityMapping.selectedPrintApplication;
                const geonodeUrl = state.gnsettings?.geonodeUrl;
                const sensitivityMappingConfig = state.localConfig?.plugins.map_viewer
                    .find((plugin) => plugin.name === "SensitivityMapping");
                const mapfishUrl = sensitivityMappingConfig.cfg.mapfishUrl;
                const printUrl = `${geonodeUrl}${mapfishUrl}/print/${printApp.name}/report.${action.printConfig.outputFormat}`;
                return Rx.Observable.fromPromise(
                    axios.post(printUrl, action.printConfig)
                        .then((response) => {
                            const statusUrl = response.data.statusURL;
                            return getPrintStatus("waiting", statusUrl);
                        })
                );
            }
            const managementCommandUrl = `${state.gnsettings.geonodeUrl}api/v2/management/commands/create_sensitivity_report/jobs/`;
            const data = {
                args: [],
                kwargs: {
                    printConfig: action.printConfig,
                    printProperties: state.sensitivityMapping.printProperties,
                    mapLayers: state.sensitivityMapping.layers
                },
                autostart: false
            };
            return Rx.Observable.fromPromise(
                axios.post(managementCommandUrl, data)
                    .then((response) => {
                        return startManagementCommand("create_sensitivity_report", response.data.data.id);
                    })
            );
        });

/**
 * This function executes the management command that allows you to create a report from an API request.
 * @param {external:Observable} action$ manages `START_MANAGEMENT_COMMAND`
 * @returns {external:Observable} `GET_PRINT_STATUS`
 */
export const startManagementCommandEpic = (action$, store) =>
    action$.ofType(START_MANAGEMENT_COMMAND)
        .switchMap((action) => {
            const state = store.getState();
            const commandsUrl = `${state.gnsettings.geonodeUrl}api/v2/management/commands/`;
            const commandUrl = `${commandsUrl}${action.command}/jobs/${action.jobId}/start/`;
            return Rx.Observable.fromPromise(
                axios.patch(commandUrl)
                    .then((response) => {
                        return getPrintStatus(response.data.status, `${commandsUrl}${action.command}/jobs/${action.jobId}/status/`);
                    })
                    .catch(err => {
                        return printError(
                            "getPrintStatusError",
                            "sensitivitymapping.notifications.error",
                            "sensitivitymapping.notifications.getPrintStatusError",
                            {error: `${err.statusText} - ${err.status}`}
                        );
                    })
            );
        });

/**
 * This function queries the print server for the status of a print request. Requests are sent as
 * long as the status returned by the request is equal to "waiting" and "running". The URL to
 * download the map is returned when processing is complete.
 * @param {external:Observable} action$ manages `GET_PRINT_STATUS`
 * @returns {external:Observable} `DOWNLOAD_MAP`
 */
export const getPrintStatusEpic = (action$, store) =>
    action$.ofType(GET_PRINT_STATUS)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            const state = store.getState();
            if (!state.sensitivityMapping.printProperties.report) {
                return Rx.Observable.fromPromise(
                    axios.get(action.statusUrl).then((response) => {
                        if (response.data.status === "waiting" || response.data.status === "running") {
                            return getPrintStatus(response.data.status, action.statusUrl);
                        } else if (response.data.status === "error") {
                            if (!state.sensitivityMapping.error) {
                                state.sensitivityMapping.error = true;
                                state.sensitivityMapping.loading = false;
                                return getPrintStatus(response.data.status, action.statusUrl);
                            }
                            return printError(
                                "getPrintStatusError",
                                "sensitivitymapping.notifications.error",
                                "sensitivitymapping.notifications.getPrintStatusError",
                                {error: response.data.error}
                            );

                        }
                        state.sensitivityMapping.loading = false;
                        return downloadMap(response.data.downloadURL);
                    })
                );
            }
            return Rx.Observable.fromPromise(
                axios.get(action.statusUrl)
                    .then((response) => {
                        if (response.data.status !== "FINISHED") {
                            return getPrintStatus(response.data.status, action.statusUrl);
                        }
                        const outputMessage = JSON.parse(response.data.output_message.replace("\n", ""));
                        if (outputMessage.type === "success") {
                            let downloadUrl = outputMessage.message;
                            state.sensitivityMapping.loading = false;
                            return downloadMap(downloadUrl);
                        }
                        return printError(
                            "getPrintStatusError",
                            "sensitivitymapping.notifications.error",
                            "sensitivitymapping.notifications.getPrintStatusError",
                            {error: outputMessage.message}
                        );
                    })
            );
        });

/**
 * This function displays a success message when the request to the print server returns the
 * link to the map to download.
 * @param {external:Observable} action$ manages `DOWNLOAD_MAP`
 * @returns {external:Observable} `SUCCESS`
 */
export const downloadMapEpic = (action$, store) =>
    action$.ofType(DOWNLOAD_MAP)
        .filter(() => store.getState()?.controls?.sensitivityMapping?.enabled)
        .switchMap((action) => {
            if (action.downloadUrl) {
                return Rx.Observable.of(
                    success({
                        uid: "printSuccess",
                        title: "sensitivitymapping.notifications.success",
                        message: "sensitivitymapping.notifications.printSuccess",
                        action: {
                            label: "sensitivitymapping.notifications.close"
                        },
                        position: "tr",
                        autoDismiss: 20
                    })
                );
            }
            return Rx.Observable.empty();
        });

/**
 * This function displays an error message following an error during the request.
 * @param {external:Observable} action$ manages `PRINT_ERROR`
 * @returns {external:Observable} `ERROR`
 */
export const printErrorEpic = (action$) =>
    action$.ofType(PRINT_ERROR)
        .switchMap((action) => {
            return Rx.Observable.of(
                changePrintStatus(false, true),
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
    gnUpdateSensitivityMappingMapLayoutEpic,
    initSensitivityMappingPrintEpic,
    loadPrintApplicationsEpic,
    openSensitivityMappingEpic,
    changeMapViewEpic,
    updatePrintPropertyEpic,
    closeSensitivityMappingEpic,
    toggleDrawerControlEpic,
    loadSelectedStyleEpic,
    loadSelectedStylesEpic,
    loadFeaturesEpic,
    updateLayerEpic,
    selectPrintApplicationEpic,
    initiatePrintPropertiesEpic,
    loadPrintLayoutEpic,
    setPrintExtentEpic,
    createPrintConfigEpic,
    sendPrintRequestEpic,
    startManagementCommandEpic,
    getPrintStatusEpic,
    downloadMapEpic,
    printErrorEpic
};

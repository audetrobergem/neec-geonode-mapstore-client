/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const INIT_SENSITIVITY_MAPPING_PRINT = "SENSITIVITYMAPPING:INIT_SENSITIVITY_MAPPING_PRINT";
export const SET_PRINT_APPLICATION_LIST = "SENSITIVITYMAPPING:SET_PRINT_APPLICATION_LIST";
export const RESET_SENSITIVITY_MAPPING = "SENSITIVITYMAPPING:RESET_SENSITIVITY_MAPPING";
export const SET_PRINT_APPLICATION = "SENSITIVITYMAPPING:SET_PRINT_APPLICATION";
export const SET_INITIAL_MAP_PROPERTIES = "SENSITIVITYMAPPING:SET_INITIAL_MAP_PROPERTIES";
export const SET_PRINT_CAPABILITIES = "SENSITIVITYMAPPING:SET_PRINT_CAPABILITIES";
export const SET_PRINT_PROPERTIES = "SENSITIVITYMAPPING:SET_PRINT_PROPERTIES";
export const UPDATE_PRINT_PROPERTY = "SENSITIVITYMAPPING:UPDATE_PRINT_PROPERTY";
export const GET_COORDINATES_SYSTEMS = "SENSITIVITYMAPPING:GET_COORDINATES_SYSTEMS";
export const LOAD_PRINT_LAYOUT = "SENSITIVITYMAPPING:LOAD_PRINT_LAYOUT";
export const SET_PRINT_EXTENT = "SENSITIVITYMAPPING:SET_PRINT_EXTENT";
export const SET_PRINT_BBOX = "SENSITIVITYMAPPING:SET_PRINT_BBOX";
export const CREATE_PRINT_CONFIG = "SENSITIVITYMAPPING:CREATE_PRINT_CONFIG";
export const SEND_PRINT_REQUEST = "SENSITIVITYMAPPING:SEND_PRINT_REQUEST";
export const DOWNLOAD_MAP = "SENSITIVITYMAPPING:DOWNLOAD_MAP";
export const GET_PRINT_STATUS = "SENSITIVITYMAPPING:GET_PRINT_STATUS";
export const LOAD_SELECTED_STYLES = "SENSITIVITYMAPPING:LOAD_SELECTED_STYLES";
export const LOAD_SELECTED_STYLE = "SENSITIVITYMAPPING:LOAD_SELECTED_STYLE";
export const LOAD_FEATURES = "SENSITIVITYMAPPING:LOAD_FEATURES";
export const START_MANAGEMENT_COMMAND = "SENSITIVITYMAPPING:START_MANAGEMENT_COMMAND";
export const PRINT_ERROR = "SENSITIVITYMAPPING:PRINT_ERROR";
export const CHANGE_PRINT_STATUS = "SENSITIVITYMAPPING:CHANGE_PRINT_STATUS";

/**
 * Load the mapfish print applications. Also used to see if the mapfish server is available.
 * @param {array} mapfishPrintApps
 */
export const initSensitivityMappingPrint = (mapfishPrintApps) => ({
    type: INIT_SENSITIVITY_MAPPING_PRINT,
    mapfishPrintApps
});

/**
 * Set the loaded print applications list and error status into the store.
 * @param {array} printApplications
 * @param {boolean} hasError
 */
export const setPrintApplicationList = (printApplications, hasError = false) => ({
    type: SET_PRINT_APPLICATION_LIST,
    printApplications,
    hasError
});

/**
 * Reset sensitivity mapping state while preserving loaded applications.
 */
export const resetSensitivityMapping = () => ({
    type: RESET_SENSITIVITY_MAPPING
});

/**
 * Display a message when an error occured during the print process.
 * @param {boolean} loading
 * @param {boolean} error
 */
export const changePrintStatus = (loading, error) => ({
    type: CHANGE_PRINT_STATUS,
    loading,
    error
});

/**
 * Edit the selected print application in the plugin state.
 * @param {object} selectedPrintApplication
 */
export const setPrintApplication = (selectedPrintApplication) => ({
    type: SET_PRINT_APPLICATION,
    selectedPrintApplication
});

/**
 * Retains map properties at the moment the tool is opened.
 * @param {object} initialMapProperties
 */
export const setInitialMapProperties = (initialMapProperties) => ({
    type: SET_INITIAL_MAP_PROPERTIES,
    initialMapProperties
});

/**
 * Edit the selected print capabilities for the selected print application in the plugin state.
 * @param {object} selectedPrintCapabilities
 */
export const setPrintCapabilities = (selectedPrintCapabilities) => ({
    type: SET_PRINT_CAPABILITIES,
    selectedPrintCapabilities
});

/**
 * Edit the current print properties.
 * @param {object} printProperties
 */
export const setPrintProperties = (printProperties) => ({
    type: SET_PRINT_PROPERTIES,
    printProperties
});

/**
 * Update a specific print property following a modification in the form or a map change.
 * @param {object} printProperty
 */
export const updatePrintProperty = (printProperty) => ({
    type: UPDATE_PRINT_PROPERTY,
    printProperty
});

/**
 * Gets coordinate systems according to application and map.
 * @param {array} projections
 */
export const getCoordinatesSystems = (projections) => ({
    type: GET_COORDINATES_SYSTEMS,
    projections
});

/**
 * Load the print layout to the state according to the print properties (legend, 2 pages, orientation, etc.).
 * @param {object} printLayout
 */
export const loadPrintLayout = (printLayout) => ({
    type: LOAD_PRINT_LAYOUT,
    printLayout
});

/**
 * Display the print extent on the map based on the selected print layout.
 */
export const setPrintExtent = () => ({
    type: SET_PRINT_EXTENT
});

/**
 * Store the computed print bbox into the state.
 * @param {array} bbox
 */
export const setPrintBbox = (bbox) => ({
    type: SET_PRINT_BBOX,
    bbox
});

/**
 * Create the print configuration to send to mapfish print.
 */
export const createPrintConfig = () => ({
    type: CREATE_PRINT_CONFIG
});

/**
 * Send the print configuration to mapfish print 3
 * @param {object} printConfig
 */
export const sendPrintRequest = (printConfig) => ({
    type: SEND_PRINT_REQUEST,
    printConfig
});

/**
 * Download the map from the download URL received from the print request
 * @param {string} downloadUrl
 */
export const downloadMap = (downloadUrl) => ({
    type: DOWNLOAD_MAP,
    downloadUrl
});

/**
 * Get the print status for the print job
 * @param {string} printStatus
 * @param {string} statusUrl
 */
export const getPrintStatus = (printStatus, statusUrl) => ({
    type: GET_PRINT_STATUS,
    printStatus,
    statusUrl
});

/**
 * Add the selected dataset style to the selected layer in the Sensitivity Mapping state.
 * @param {string} layerName
 * @param {string} styleData
 */
export const loadSelectedStyle = (layerName, styleData) => ({
    type: LOAD_SELECTED_STYLE,
    layerName,
    styleData
});

/**
 * Add the selected dataset style to the layer list in the Sensitivity Mapping state.
 * @param {array} layers
 */
export const loadSelectedStyles = (layers) => ({
    type: LOAD_SELECTED_STYLES,
    layers
});

/**
 * Add the features for WFS layers in the layer object.
 * @param {array} layers
 */
export const loadFeatures = (layers) => ({
    type: LOAD_FEATURES,
    layers
});

/**
 * Start a management command that was created from a previous api call.
 * @param {string} command
 * @param {number} jobId
 */
export const startManagementCommand = (command, jobId) => ({
    type: START_MANAGEMENT_COMMAND,
    command,
    jobId
});

/**
 * Display a message when an error occured during the print process
 * @param {string} uid
 * @param {string} title
 * @param {string} message
 * @param {object} values
 */
export const printError = (uid, title, message, values) => ({
    type: PRINT_ERROR,
    uid,
    title,
    message,
    values
});
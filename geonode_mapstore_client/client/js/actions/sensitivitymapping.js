export const INIT_SENSITIVITY_MAPPING_PRINT = "SENSITIVITYMAPPING:INIT_SENSITIVITY_MAPPING_PRINT";
export const SET_PRINT_APPLICATION = "SENSITIVITYMAPPING:SET_PRINT_APPLICATION";
export const SET_INITIAL_MAP_PROPERTIES = "SENSITIVITYMAPPING:SET_INITIAL_MAP_PROPERTIES";
export const SET_PRINT_CAPABILITIES = "SENSITIVITYMAPPING:SET_PRINT_CAPABILITIES";
export const SET_PRINT_PROPERTIES = "SENSITIVITYMAPPING:SET_PRINT_PROPERTIES";
export const UPDATE_PRINT_PROPERTY = "SENSITIVITYMAPPING:UPDATE_PRINT_PROPERTY";
export const GET_COORDINATES_SYSTEMS = "SENSITIVITYMAPPING:GET_COORDINATES_SYSTEMS";
export const LOAD_PRINT_LAYOUT = "SENSITIVITYMAPPING:LOAD_PRINT_LAYOUT";
export const SET_PRINT_EXTENT = "SENSITIVITYMAPPING:SET_PRINT_EXTENT";
export const CREATE_PRINT_CONFIG = "SENSITIVITYMAPPING:CREATE_PRINT_CONFIG";
export const SEND_PRINT_REQUEST = "SENSITIVITYMAPPING:SEND_PRINT_REQUEST";
export const DOWNLOAD_MAP = "SENSITIVITYMAPPING:DOWNLOAD_MAP";
export const GET_PRINT_STATUS = "SENSITIVITYMAPPING:GET_PRINT_STATUS";
export const LOAD_SELECTED_STYLES = "SENSITIVITYMAPPING:LOAD_SELECTED_STYLES";
export const LOAD_FEATURES = "SENSITIVITYMAPPING:LOAD_FEATURES";
export const START_MANAGEMENT_COMMAND = "SENSITIVITYMAPPING:START_MANAGEMENT_COMMAND";
export const PRINT_ERROR = "SENSITIVITYMAPPING:PRINT_ERROR";
export const CHANGE_PRINT_STATUS = "SENSITIVITYMAPPING:CHANGE_PRINT_STATUS";

/**
* load the mapfish print applications. Also used to see if the mapfish server is available.
* @param {string} mapfishPrintApps
*/
export const initSensitivityMappingPrint = (mapfishPrintApps) => ({
    type: INIT_SENSITIVITY_MAPPING_PRINT,
    mapfishPrintApps
});

/**
* Display a message when an error occured during the print process
*/
export const changePrintStatus = (loading, error) => ({
    type: CHANGE_PRINT_STATUS,
    loading,
    error
});


/**
* edit the selected print application in the plugin state.
* @param {string} selectedPrintApplication
*/
export const setPrintApplication = (selectedPrintApplication) => ({
    type: SET_PRINT_APPLICATION,
    selectedPrintApplication
});

/**
* retains map properties at the moment the tool is opened.
* @param {string} initialMapProperties
*/
export const setInitialMapProperties = (initialMapProperties) => ({
    type: SET_INITIAL_MAP_PROPERTIES,
    initialMapProperties
});

/**
* edit the selected print capabilities for the selected print application in the plugin state
* @param {string} selectedPrintCapabilities
*/
export const setPrintCapabilities = (selectedPrintCapabilities) => ({
    type: SET_PRINT_CAPABILITIES,
    selectedPrintCapabilities
});

/**
* edit the current print properties
* @param {string} selectedPrintCapabilities
*/
export const setPrintProperties = (printProperties) => ({
    type: SET_PRINT_PROPERTIES,
    printProperties
});

/**
* update a specific print property following a modification in the form or a map change
* @param {string} printProperty
*/
export const updatePrintProperty = (printProperty) => ({
    type: UPDATE_PRINT_PROPERTY,
    printProperty
});

/**
* edit the current print properties
* @param {array} projections
*/
export const getCoordinatesSystems = (projections) => ({
    type: GET_COORDINATES_SYSTEMS,
    projections
});

/**
* load the print layout to the state according to the print properties (legend, 2 pages, orientation, etc.)
* @param {array} printLayout
*/
export const loadPrintLayout = (printLayout) => ({
    type: LOAD_PRINT_LAYOUT,
    printLayout
});

/**
* display the print extent on the map based on the selected print layout.
*/
export const setPrintExtent = () => ({
    type: SET_PRINT_EXTENT
});

/**
* create the print configuration to send to mapfish print
*/
export const createPrintConfig = () => ({
    type: CREATE_PRINT_CONFIG
});

/**
* Send the print configuration to mapfish print 3
*/
export const sendPrintRequest = (printConfig) => ({
    type: SEND_PRINT_REQUEST,
    printConfig
});

/**
* Download the map from the download URL received from the print request
*/
export const downloadMap = (downloadUrl) => ({
    type: DOWNLOAD_MAP,
    downloadUrl
});

/**
* Get the print status for the print job
*/
export const getPrintStatus = (printStatus, statusUrl) => ({
    type: GET_PRINT_STATUS,
    printStatus,
    statusUrl
});

/**
* Add the selected dataset style to the layer list in the state
*/
export const loadSelectedStyles = (layers) => ({
    type: LOAD_SELECTED_STYLES,
    layers
});

/**
* Add the features for WFS layers in the layer object
*/
export const loadFeatures = (layers) => ({
    type: LOAD_FEATURES,
    layers
});

/**
* Start a management command that was created from a previous api call.
*/
export const startManagementCommand = (command, jobId) => ({
    type: START_MANAGEMENT_COMMAND,
    command,
    jobId
});

/**
* Display a message when an error occured during the print process
*/
export const printError = (uid, title, message, values) => ({
    type: PRINT_ERROR,
    uid,
    title,
    message,
    values
});

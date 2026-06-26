/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
    SET_PRINT_APPLICATION,
    SET_INITIAL_MAP_PROPERTIES,
    SET_PRINT_CAPABILITIES,
    SET_PRINT_PROPERTIES,
    UPDATE_PRINT_PROPERTY,
    GET_COORDINATES_SYSTEMS,
    LOAD_PRINT_LAYOUT,
    SET_PRINT_EXTENT,
    CREATE_PRINT_CONFIG,
    SEND_PRINT_REQUEST,
    DOWNLOAD_MAP,
    GET_PRINT_STATUS,
    LOAD_SELECTED_STYLES,
    LOAD_FEATURES,
    INIT_SENSITIVITY_MAPPING_PRINT,
    START_MANAGEMENT_COMMAND,
    PRINT_ERROR,
    CHANGE_PRINT_STATUS,
    SET_PRINT_APPLICATION_LIST,
    SET_PRINT_BBOX,
    RESET_SENSITIVITY_MAPPING
} from "@js/actions/sensitivitymapping";

const DEFAULT_STATE = {
    printApplications: [],
    sensitivityMappingLoadingError: false,
    loading: false,
    error: false,
    downloadUrl: undefined
};

export const sensitivityMapping = (state = DEFAULT_STATE, action) => {
    switch (action.type) {
    case INIT_SENSITIVITY_MAPPING_PRINT: {
        return {
            ...state,
            mapfishPrintApps: action.mapfishPrintApps
        };
    }
    case SET_PRINT_APPLICATION_LIST: {
        return {
            ...state,
            printApplications: action.printApplications,
            sensitivityMappingLoadingError: action.hasError
        };
    }
    case RESET_SENSITIVITY_MAPPING: {
        return {
            ...DEFAULT_STATE,
            printApplications: state.printApplications
        };
    }
    case CHANGE_PRINT_STATUS: {
        return {
            ...state,
            loading: action.loading,
            error: action.error
        };
    }
    case SET_PRINT_APPLICATION: {
        return {
            ...state,
            selectedPrintApplication: action.selectedPrintApplication,
            downloadUrl: undefined,
            error: false
        };
    }
    case SET_INITIAL_MAP_PROPERTIES: {
        return {
            ...state,
            initialMapProperties: action.initialMapProperties
        };
    }
    case SET_PRINT_CAPABILITIES: {
        return {
            ...state,
            selectedPrintCapabilities: action.selectedPrintCapabilities
        };
    }
    case SET_PRINT_PROPERTIES: {
        return {
            ...state,
            printProperties: action.printProperties
        };
    }
    case UPDATE_PRINT_PROPERTY: {
        return {
            ...state,
            printProperties: {
                ...state.printProperties,
                [action.printProperty.name]: action.printProperty.value
            }
        };
    }
    case GET_COORDINATES_SYSTEMS: {
        return {
            ...state,
            projections: action.projections
        };
    }
    case LOAD_PRINT_LAYOUT: {
        return {
            ...state,
            printLayout: action.printLayout
        };
    }
    case SET_PRINT_EXTENT: {
        return {
            ...state,
            printExtent: action.printExtent
        };
    }
    case SET_PRINT_BBOX: {
        return {
            ...state,
            printProperties: {
                ...state.printProperties,
                bbox: action.bbox
            }
        };
    }
    case CREATE_PRINT_CONFIG: {
        return {
            ...state,
            error: false
        };
    }
    case SEND_PRINT_REQUEST: {
        return {
            ...state,
            printConfig: action.printConfig,
            loading: true,
            downloadUrl: undefined
        };
    }
    case DOWNLOAD_MAP: {
        return {
            ...state,
            downloadUrl: action.downloadUrl,
            loading: false
        };
    }
    case GET_PRINT_STATUS: {
        return {
            ...state,
            printStatus: action.printStatus,
            statusUrl: action.statusUrl
        };
    }
    case LOAD_SELECTED_STYLES: {
        return {
            ...state,
            layers: action.layers
        };
    }
    case LOAD_FEATURES: {
        return {
            ...state,
            layers: action.layers
        };
    }
    case START_MANAGEMENT_COMMAND: {
        return {
            ...state,
            command: action.command,
            jobId: action.jobId
        };
    }
    case PRINT_ERROR: {
        return {
            ...state,
            loading: false,
            error: true
        };
    }
    default:
        return state;
    }
};

export default sensitivityMapping;

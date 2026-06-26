import {
    SELECT_FEATURES,
    SELECT_LAYER,
    FORMAT_SELECTION,
    SET_ZONE_IDENTIFY_LOADING,
    SET_GEOMETRY_COLUMNS,
    DESCRIBE_FEATURE_TYPE_ERROR
} from '@js/actions/zoneidentify';

const defaultState = {
    selectedFeatures: null,
    selectedLayer: null,
    formattedFeatures: null,
    loading: false,
    // map of { [layerName]: geometryColumnName }
    geometryColumns: {},
    describeFeatureTypeError: null
};

export const zoneIdentify = (state = defaultState, action) => {
    switch (action.type) {
    case SELECT_FEATURES:
        return {
            ...state,
            selectedFeatures: action.selectedFeatures
        };
    case SELECT_LAYER:
        return {
            ...state,
            selectedLayer: action.selectedLayer
        };
    case FORMAT_SELECTION:
        return {
            ...state,
            formattedFeatures: action.formattedFeatures
        };
    case SET_ZONE_IDENTIFY_LOADING:
        return {
            ...state,
            loading: action.loading
        };
    case SET_GEOMETRY_COLUMNS:
        return {
            ...state,
            // Merge with existing entries so that re-opening the panel with
            // different visible layers accumulates the known columns
            geometryColumns: {
                ...state.geometryColumns,
                ...action.geometryColumns
            },
            describeFeatureTypeError: null
        };
    case DESCRIBE_FEATURE_TYPE_ERROR:
        return {
            ...state,
            describeFeatureTypeError: action.error
        };
    default:
        return state;
    }
};

export default zoneIdentify;
import {
    SELECT_FEATURES,
    SELECT_LAYER,
    FORMAT_SELECTION,
    HIGHLIGHT_SELECTED_FEATURE,
    ZOOM_TO_SELECTED_FEATURE,
    ADD_LAYER_TO_MAP,
    SET_ZONE_IDENTIFY_LOADING
} from '@js/actions/zoneidentify';

export const zoneIdentify = (state = {}, action) => {
    switch (action.type) {
    case SELECT_FEATURES: {
        return {
            ...state,
            selectedFeatures: action.selectedFeatures
        };
    }
    case SELECT_LAYER: {
        return {
            ...state,
            selectedLayer: action.selectedLayer
        };
    }
    case FORMAT_SELECTION: {
        return {
            ...state,
            formattedFeatures: action.formattedFeatures
        };
    }
    case HIGHLIGHT_SELECTED_FEATURE: {
        return {
            ...state,
            selectedFeature: action.selectedFeature
        };
    }
    case ZOOM_TO_SELECTED_FEATURE: {
        return {
            ...state,
            selectedFeature: action.selectedFeature
        };
    }
    case ADD_LAYER_TO_MAP: {
        return {
            ...state,
            layer: action.layer
        };
    }
    case SET_ZONE_IDENTIFY_LOADING: {
        return {
            ...state,
            loading: action.loading
        };
    }
    default:
        return state;
    }
};

export default zoneIdentify;

import {
    LOAD_AIS,
    MARINE_TRAFFIC_ADD_LAYER_TO_MAP,
    MARINE_TRAFFIC_EXTRACT_HISTORY,
    MARINE_TRAFFIC_SEARCH_VESSEL,
    MARINE_TRAFFIC_SELECTED_FEATURES,
    MARINE_TRAFFIC_SELECTED_FEATURE,
    MARINE_TRAFFIC_SET_LOADING,
    MARINE_TRAFFIC_VESSEL_HISTORY,
    MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL,
    MARINE_TRAFFIC_SELECT_NEXT_VESSEL
} from '@js/actions/marinetraffic';

export const marineTraffic = (state = {}, action) => {
    switch (action.type) {
    case LOAD_AIS: {
        return {
            ...state,
            aisData: action.aisData
        };
    }
    case MARINE_TRAFFIC_SELECTED_FEATURES: {
        return {
            ...state,
            selectedFeatures: action.selectedFeatures
        };
    }
    case MARINE_TRAFFIC_SELECTED_FEATURE: {
        return {
            ...state,
            selectedFeature: action.selectedFeature
        };
    }
    case MARINE_TRAFFIC_SEARCH_VESSEL: {
        return {
            ...state,
            searchParam: action.searchParam
        };
    }
    case MARINE_TRAFFIC_EXTRACT_HISTORY: {
        return {
            ...state,
            requestParams: action.requestParams
        };
    }
    case MARINE_TRAFFIC_VESSEL_HISTORY: {
        return {
            ...state,
            trackHistory: action.trackHistory
        };
    }
    case MARINE_TRAFFIC_ADD_LAYER_TO_MAP: {
        return {
            ...state,
            layer: action.extractionLayer
        };
    }
    case MARINE_TRAFFIC_SET_LOADING: {
        return {
            ...state,
            loading: action.loading
        };
    }
    case MARINE_TRAFFIC_SELECT_PREVIOUS_VESSEL: {
        return {
            ...state,
            selectedFeature: action.selectedFeature
        };
    }
    case MARINE_TRAFFIC_SELECT_NEXT_VESSEL: {
        return {
            ...state,
            selectedFeature: action.selectedFeature
        };
    }
    default:
        return state;
    }
};

export default marineTraffic;

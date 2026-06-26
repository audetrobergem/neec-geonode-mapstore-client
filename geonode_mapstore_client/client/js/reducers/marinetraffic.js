import {
    LOAD_AIS,
    MARINE_TRAFFIC_ADD_LAYER_TO_MAP,
    MARINE_TRAFFIC_CLEAR_SELECTION,
    MARINE_TRAFFIC_SELECTED_FEATURES,
    MARINE_TRAFFIC_SELECTED_FEATURE,
    MARINE_TRAFFIC_SET_LOADING,
    MARINE_TRAFFIC_VESSEL_HISTORY
} from '@js/actions/marinetraffic';

const defaultState = {
    aisData: null,
    selectedFeatures: null,
    selectedFeature: null,
    trackHistory: null,
    layer: null,
    loading: false
};

export const marineTraffic = (state = defaultState, action) => {
    switch (action.type) {
    case LOAD_AIS:
        return { ...state, aisData: action.aisData };

    case MARINE_TRAFFIC_SELECTED_FEATURES:
        return { ...state, selectedFeatures: action.selectedFeatures };

    case MARINE_TRAFFIC_SELECTED_FEATURE:
        return { ...state, selectedFeature: action.selectedFeature };

    case MARINE_TRAFFIC_VESSEL_HISTORY:
        return { ...state, trackHistory: action.trackHistory };

    case MARINE_TRAFFIC_ADD_LAYER_TO_MAP:
        return { ...state, layer: action.extractionLayer };

    case MARINE_TRAFFIC_SET_LOADING:
        return { ...state, loading: action.loading };

    /*
     * CLEAR_SELECTION resets selection-related state directly in the reducer.
     * The epics still dispatch individual actions for side effects (layer removal, etc.)
     * but the state reset is authoritative here.
     */
    case MARINE_TRAFFIC_CLEAR_SELECTION:
        return {
            ...state,
            selectedFeatures: null,
            selectedFeature: null,
            trackHistory: null,
            layer: null
        };

    default:
        return state;
    }
};

export default marineTraffic;

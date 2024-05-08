import {
    SET_SHORELINE_REGION,
    UPDATE_SHORELINE_SELECTED_MEDIA_TYPE,
    SHORELINE_FEATURE_INFO_CLICK,
    SHORELINE_SELECTED_FEATURE,
    LOAD_SELECTED_MEDIA_DATASET_FEATURES,
    SET_SHORELINE_LOADING
} from '@js/actions/shorelineviewer';

export const shorelineViewer = (state = {}, action) => {
    switch (action.type) {
    case SET_SHORELINE_REGION: {
        return {
            ...state,
            selectedRegion: action.selectedRegion
        };
    }

    case UPDATE_SHORELINE_SELECTED_MEDIA_TYPE: {
        return {
            ...state,
            selectedMediaType: action.selectedMediaType
        };
    }

    case SHORELINE_FEATURE_INFO_CLICK: {
        return {
            ...state,
            clickPoint: action.point,
            clickLayers: action.layers
        };
    }

    case SHORELINE_SELECTED_FEATURE: {
        return {
            ...state,
            selectedFeature: action.selectedFeature,
            selectedFeatureProjection: action.selectedFeatureProjection
        };
    }
    case LOAD_SELECTED_MEDIA_DATASET_FEATURES: {
        return {
            ...state,
            selectedMediaDatasetFeatures: action.selectedMediaDatasetFeatures
        };
    }
    case SET_SHORELINE_LOADING: {
        return {
            ...state,
            loading: action.loading
        };
    }

    default:
        return state;
    }
};

export default shorelineViewer;

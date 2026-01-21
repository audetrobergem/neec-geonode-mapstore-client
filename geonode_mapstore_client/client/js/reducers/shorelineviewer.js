import {
    SET_SHORELINE_REGION,
    UPDATE_SHORELINE_SELECTED_MEDIA_TYPE,
    SHORELINE_FEATURE_INFO_CLICK,
    SHORELINE_SELECTED_FEATURE,
    LOAD_SELECTED_MEDIA_DATASET_FEATURES,
    SET_SHORELINE_LOADING,
    SET_SHORELINE_THEMATIC,
    SHORELINE_SELECTED_VIDEO,
    UPDATE_VIDEO_TIME,
    SET_VIDEO_INFORMATIONS,
    UPDATE_VIDEO_INFORMATION,
    LOAD_VIDEO,
    VIDEO_ERROR
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
            selectedFeature: action.selectedFeature
        };
    }
    case SHORELINE_SELECTED_VIDEO: {
        return {
            ...state,
            selectedVideo: action.selectedVideo
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
    case SET_SHORELINE_THEMATIC: {
        return {
            ...state,
            selectedThematic: action.selectedThematic
        };
    }
    case UPDATE_VIDEO_TIME: {
        return {
            ...state,
            videoTime: action.videoTime
        };
    }
    case SET_VIDEO_INFORMATIONS: {
        return {
            ...state,
            videoInformations: action.videoInformations
        };
    }
    case UPDATE_VIDEO_INFORMATION: {
        return {
            ...state,
            videoInformation: action.videoInformation
        };
    }
    case LOAD_VIDEO: {
        return {
            ...state,
            fileName: action.fileName
        };
    }
    case VIDEO_ERROR: {
        return {
            ...state,
            uid: action.uid,
            title: action.title,
            message: action.message,
            values: action.values
        };
    }
    default:
        return state;
    }
};

export default shorelineViewer;

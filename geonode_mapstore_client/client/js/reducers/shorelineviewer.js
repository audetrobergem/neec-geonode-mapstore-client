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
    VIDEO_ERROR,
    SET_SHORELINE_LABELS_VISIBLE,
    SET_SHORELINE_VALIDATION_VISIBLE
} from '@js/actions/shorelineviewer';

const defaultState = {
    selectedRegion: null,
    selectedMediaType: null,
    selectedThematic: null,
    selectedFeature: null,
    selectedLayer: null,
    selectedVideo: null,
    selectedMediaDatasetFeatures: null,
    loading: false,
    videoInformations: null,
    clickPoint: null,
    clickLayers: [],
    labelsVisible: false,
    validationVisible: false
};

export const shorelineViewer = (state = defaultState, action) => {
    switch (action.type) {
    case SET_SHORELINE_REGION: {
        return {
            ...state,
            selectedRegion: action.selectedRegion,
            labelsVisible: false,
            validationVisible: false
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
            selectedLayer: action.selectedFeature
                ? action.selectedFeature.selectedLayer
                : null
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
            videoInformations: state.videoInformations
                ? {
                    ...state.videoInformations,
                    [action.videoInformation.name]: action.videoInformation.value
                }
                : state.videoInformations
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
            errorUid: action.uid,
            errorTitle: action.title,
            errorMessage: action.message,
            errorValues: action.values
        };
    }
    case SET_SHORELINE_LABELS_VISIBLE: {
        return {
            ...state,
            labelsVisible: action.visible
        };
    }
    case SET_SHORELINE_VALIDATION_VISIBLE: {
        return {
            ...state,
            validationVisible: action.visible
        };
    }
    default:
        return state;
    }
};

export default shorelineViewer;

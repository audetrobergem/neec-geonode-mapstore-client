/*
 * Copyright 2021, GeoSolutions Sas / ECCC.
 * All rights reserved.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { Glyphicon } from 'react-bootstrap';
import { createSelector } from 'reselect';
import Message from '@mapstore/framework/components/I18N/Message';
import GNButton from '@mapstore/framework/components/layout/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faRoute,
    faGlobe,
    faCamera,
    faVideoCamera,
    faAngleDoubleLeft,
    faAngleDoubleRight,
    faAngleLeft,
    faAngleRight
} from '@fortawesome/free-solid-svg-icons';
import { DropdownList } from 'react-widgets';
import Spinner from '@mapstore/framework/components/layout/Spinner';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import {
    setShorelineRegion,
    updateShorelineSelectedMediaType,
    selectFirstMediaFeature,
    selectPreviousMediaFeature,
    selectNextMediaFeature,
    selectLastMediaFeature,
    setShorelineThematic,
    zoomToRegion,
    updateVideoInformation,
    videoError,
    setVideoInformations,
    setShorelineLabelsVisible,
    setShorelineValidationVisible
} from '@js/actions/shorelineviewer';
import ShorelineViewerEpics from '@js/epics/shorelineviewer';
import shorelineViewer from '@js/reducers/shorelineviewer';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';
import { updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';
import InfoPopover from '@mapstore/framework/components/widgets/widget/InfoPopover';
import parse from 'html-react-parser';
import ShorelineInformation from '@js/components/ShorelineInformation';
import VideoPlayer from '@js/components/VideoPlayer';
import ValidationInformation from '@js/components/ValidationInformation';

const Button = tooltip(GNButton);

// ---------------------------------------------------------------------------
// Media type buttons
// ---------------------------------------------------------------------------

const MEDIA_TYPES = [
    {
        name: 'Photos',
        icon: faCamera,
        tooltip: 'shorelineviewer.displayPhotoTracklogsTooltip',
        datasetKey: 'photoDatasets'
    },
    {
        name: 'Videos',
        icon: faVideoCamera,
        tooltip: 'shorelineviewer.displayVideoTracklogsTooltip',
        datasetKey: 'videoDatasets'
    }
];

function ShorelineTypeButton({ selectedRegion, selectedMediaType, onSelectMediaType }) {
    const toggle = (mediaType) => {
        // Clicking the already-active type deactivates it
        onSelectMediaType(
            selectedMediaType?.name === mediaType.name ? null : mediaType
        );
    };

    return (
        <div className="text-center col-xs-12">
            {MEDIA_TYPES.map((mediaType) => (
                <Button
                    key={mediaType.name}
                    className="btn-primary"
                    tooltipId={<Message msgId={mediaType.tooltip} />}
                    disabled={
                        !selectedRegion?.[mediaType.datasetKey]?.length
                    }
                    active={selectedMediaType?.name === mediaType.name}
                    onClick={() => toggle(mediaType)}
                >
                    <FontAwesomeIcon icon={mediaType.icon} />
                </Button>
            ))}
        </div>
    );
}

const ConnectedShorelineTypeButton = connect(
    createSelector(
        [(state) => state?.shorelineViewer?.selectedRegion,
            (state) => state?.shorelineViewer?.selectedMediaType],
        (selectedRegion, selectedMediaType) => ({ selectedRegion, selectedMediaType })
    ),
    { onSelectMediaType: updateShorelineSelectedMediaType }
)(ShorelineTypeButton);

// ---------------------------------------------------------------------------
// Photo navigation
// ---------------------------------------------------------------------------

function PhotoNavigationButton({
    selectedFeature,
    selectedMediaDatasetFeatures,
    firstPhoto,
    previousPhoto,
    nextPhoto,
    lastPhoto
}) {
    const features = selectedMediaDatasetFeatures?.features ?? [];
    const idx = features.findIndex(
        (f) => f.properties.name === selectedFeature?.properties?.name
    );
    const isFirst = idx <= 0;
    const isLast = idx < 0 || idx === features.length - 1;

    const navButtons = [
        {
            action: () => firstPhoto(selectedFeature),
            icon: faAngleDoubleLeft,
            tooltipId: 'shorelineviewer.firstPhotoTooltip',
            disabled: isFirst
        },
        {
            action: () => previousPhoto(selectedFeature),
            icon: faAngleLeft,
            tooltipId: 'shorelineviewer.previousPhotoTooltip',
            disabled: isFirst
        },
        {
            action: () => nextPhoto(selectedFeature),
            icon: faAngleRight,
            tooltipId: 'shorelineviewer.nextPhotoTooltip',
            disabled: isLast
        },
        {
            action: () => lastPhoto(selectedFeature),
            icon: faAngleDoubleRight,
            tooltipId: 'shorelineviewer.lastPhotoTooltip',
            disabled: isLast
        }
    ];

    return (
        <div className="text-center col-xs-12">
            {navButtons.map(({ action, icon, tooltipId, disabled }) => (
                <Button
                    key={tooltipId}
                    className="shoreline-viewer-media-navigation-button"
                    tooltipId={<Message msgId={tooltipId} />}
                    disabled={disabled}
                    onClick={action}
                >
                    <FontAwesomeIcon icon={icon} />
                </Button>
            ))}
        </div>
    );
}

const ConnectedPhotoNavigationButton = connect(
    createSelector(
        [
            (state) => state?.shorelineViewer?.selectedFeature?.selectedFeature,
            (state) => state?.shorelineViewer?.selectedMediaDatasetFeatures
        ],
        (selectedFeature, selectedMediaDatasetFeatures) => ({
            selectedFeature,
            selectedMediaDatasetFeatures
        })
    ),
    {
        firstPhoto: selectFirstMediaFeature,
        previousPhoto: selectPreviousMediaFeature,
        nextPhoto: selectNextMediaFeature,
        lastPhoto: selectLastMediaFeature
    }
)(PhotoNavigationButton);

// ---------------------------------------------------------------------------
// Video section
// ---------------------------------------------------------------------------

function VideoSection({
    selectedFeature,
    videoInformations,
    onReady
}) {
    return (
        <div className="shoreline-viewer-body">
            <VideoPlayer
                options={{
                    autoplay: true,
                    width: '518',
                    controls: true,
                    responsive: true,
                    fluid: true,
                    muted: true,
                    sources: [
                        {
                            src: videoInformations.videoUri,
                            type: 'application/x-mpegURL'
                        }
                    ]
                }}
                onReady={onReady}
                videoInformations={videoInformations}
            />
            <div className="shoreline-viewer-info-table">
                <div className="shoreline-viewer-info-fields">
                    {[
                        {
                            label: 'FileName',
                            value: selectedFeature.properties.filename
                        },
                        {
                            label: 'Time',
                            value: `${selectedFeature.properties.time} / ${Math.floor(videoInformations.duration ?? 0)}`
                        },
                        { label: 'Date', value: selectedFeature.properties.datetime }
                    ].map(({ label, value }) => (
                        <div key={label} className="shoreline-viewer-info-row">
                            <div className="shoreline-viewer-info-label">{label}</div>
                            <div className="shoreline-viewer-info-value">{value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Photo section
// ---------------------------------------------------------------------------

function PhotoSection({ selectedFeature }) {
    const photoUrl = selectedFeature.properties.photo;
    // Open photo in a popup without using the `javascript:` pseudo-protocol.
    const openPopup = (e) => {
        e.preventDefault();
        window.open(photoUrl, 'popup', 'width=800,height=600');
    };

    return (
        <div className="shoreline-viewer-body">
            <a href={photoUrl} onClick={openPopup}>
                <img className="img-responsive" src={photoUrl} alt="" />
            </a>
            <ConnectedPhotoNavigationButton />
            <div className="shoreline-viewer-body">
                <div className="shoreline-viewer-info-table">
                    <div className="shoreline-viewer-info-fields">
                        {[
                            { label: 'Date', value: selectedFeature.properties.date },
                            { label: 'Time', value: selectedFeature.properties.time },
                            { label: 'Latitude', value: selectedFeature.properties.lat },
                            {
                                label: 'Longitude',
                                value: selectedFeature.properties.lon
                            }
                        ].map(({ label, value }) => (
                            <div key={label} className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">
                                    {label}
                                </div>
                                <div className="shoreline-viewer-info-value">
                                    {value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main plugin component
// ---------------------------------------------------------------------------

/**
 * ShorelineViewer panel.
 *
 * @prop {object[]} regions   - list of region objects (from localConfig)
 * @prop {object[]} tabs      - tab / field configuration for the classification layer
 */
function ShorelineViewer({
    style,
    selectedRegion,
    selectedMediaType,
    selectedThematic,
    selectedFeature,
    videoInformations,
    loading,
    labelsVisible,
    validationVisible,
    messages,
    onClose,
    regions,
    tabs,
    onSelectRegion,
    onZoomToSelectedRegion,
    onSelectThematic,
    onUpdateVideoInformation,
    onVideoError,
    onSetVideoInformations,
    onSetLabelsVisible,
    onSetValidationVisible
}) {
    const handlePlayerReady = (player) => {
        player.on('loadedmetadata', () => {
            const duration = player.duration();
            if (videoInformations.time > duration) {
                onVideoError(
                    'shorelineViewerVideoError',
                    'shorelineViewer.notifications.error',
                    'shorelineViewer.notifications.videoDurationError',
                    { time: videoInformations.time, duration }
                );
                onSetVideoInformations(null);
            } else {
                player.currentTime(videoInformations.time);
                onUpdateVideoInformation({ name: 'duration', value: duration });
            }
        });

        player.on('playing', () =>
            onUpdateVideoInformation({ name: 'status', value: 'play' })
        );
        player.on('pause', () =>
            onUpdateVideoInformation({ name: 'status', value: 'pause' })
        );
        player.on('timeupdate', () => {
            const currentSec = Math.floor(player.currentTime());
            if (currentSec !== videoInformations.time) {
                onUpdateVideoInformation({ name: 'time', value: currentSec });
            }
        });
    };

    const localizedRegions = regions.map((region) => ({
        ...region,
        labelId: getMessageById(messages, region.labelId)
    }));

    const localizedThematics = selectedRegion?.thematics?.map((thematic) => ({
        ...thematic,
        labelId: getMessageById(messages, thematic.labelId)
    }));

    const isClassificationFeature =
        selectedFeature?.id?.includes('shoreline_classification');

    const isValidationFeature =
        selectedFeature &&
        selectedRegion?.shorelineValidationDataset &&
        selectedFeature.id
            ?.substring(0, selectedFeature.id.indexOf('.'))
            .split(':')
            .some((part) =>
                selectedRegion.shorelineValidationDataset.includes(part)
            );

    const isVideoFeature =
        selectedFeature &&
        selectedMediaType?.name === 'Videos' &&
        videoInformations?.videoUri;

    const isPhotoFeature =
        selectedFeature &&
        selectedMediaType?.name === 'Photos' &&
        !isClassificationFeature;

    return (
        <div className="shoreline-viewer" style={style}>
            {/* Header */}
            <div className="shoreline-viewer-head">
                <div className="shoreline-viewer-title">
                    <Message msgId="shorelineviewer.shorelineViewerTitle" />
                </div>
                <Button
                    className="ms-close square-button-md _border-transparent btn btn-default"
                    onClick={onClose}
                >
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>

            {/* Body */}
            <div className="shoreline-viewer-body">
                {/* Region selector */}
                <div className="shoreline-viewer-body-regions">
                    <div className="shoreline-viewer-body-regions-left">
                        <DropdownList
                            className="shoreline-viewer-dropdown"
                            defaultValue={getMessageById(
                                messages,
                                'shorelineviewer.defaultRegionSelect'
                            )}
                            onChange={onSelectRegion}
                            data={localizedRegions}
                            textField="labelId"
                            valueField="id"
                        />
                    </div>
                    <div className="shoreline-viewer-body-regions-right">
                        <Button
                            className="btn-primary"
                            onClick={onZoomToSelectedRegion}
                            tooltipId={
                                <Message msgId="shorelineviewer.zoomToRegion" />
                            }
                        >
                            <FontAwesomeIcon icon={faGlobe} size="1x" />
                        </Button>
                    </div>
                </div>

                {/* Thematic selector */}
                {selectedRegion?.thematics && (
                    <>
                        <div className="shoreline-viewer-body-thematics">
                            <div className="shoreline-viewer-body-thematics-left">
                                <Message msgId="shorelineviewer.selectStyle" />
                            </div>
                            <div className="shoreline-viewer-body-thematics-center">
                                <DropdownList
                                    className="shoreline-viewer-dropdown"
                                    defaultValue={getMessageById(
                                        messages,
                                        `shorelineviewer.thematics.${selectedThematic.id}.label`
                                    )}
                                    onChange={onSelectThematic}
                                    data={localizedThematics}
                                    textField="labelId"
                                    valueField="id"
                                />
                            </div>
                            <div className="shoreline-viewer-body-thematics-right">
                                <InfoPopover
                                    text={parse(
                                        getMessageById(
                                            messages,
                                            `shorelineviewer.thematics.${selectedThematic.id}.tooltip`
                                        )
                                    )}
                                    placement="left"
                                    title={getMessageById(
                                        messages,
                                        `shorelineviewer.thematics.${selectedThematic.id}.label`
                                    )}
                                    popoverStyle={{ maxWidth: 500 }}
                                />
                            </div>
                        </div>

                        {/* Labels checkbox – only shown for the first (Shoreline Type) thematic */}
                        {selectedRegion.thematics[0]?.id === selectedThematic?.id && (
                            <div className="shoreline-viewer-body-labels">
                                <label className="shoreline-viewer-labels-checkbox-label">
                                    <input
                                        type="checkbox"
                                        className="shoreline-viewer-labels-checkbox"
                                        checked={labelsVisible}
                                        onChange={(e) => onSetLabelsVisible(e.target.checked)}
                                    />
                                    <Message msgId="shorelineviewer.showLabels" />
                                </label>
                                <InfoPopover
                                    text={
                                        <Message msgId="shorelineviewer.showLabelsTooltip" />
                                    }
                                    placement="left"
                                    popoverStyle={{ maxWidth: 350 }}
                                />
                            </div>
                        )}

                        {/* Validation checkbox – only shown when the region has validation data */}
                        {selectedRegion.shorelineValidationDataset && (
                            <div className="shoreline-viewer-body-labels">
                                <label className="shoreline-viewer-labels-checkbox-label">
                                    <input
                                        type="checkbox"
                                        className="shoreline-viewer-labels-checkbox"
                                        checked={validationVisible}
                                        onChange={(e) => onSetValidationVisible(e.target.checked)}
                                    />
                                    <Message msgId="shorelineviewer.showValidation" />
                                </label>
                                <InfoPopover
                                    text={parse(
                                        getMessageById(
                                            messages,
                                            `shorelineviewer.showValidationTooltip`
                                        )
                                    )}
                                    placement="left"
                                    popoverStyle={{ maxWidth: 350 }}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Media type toggle */}
                {selectedRegion && (
                    <div className="shoreline-viewer-body">
                        <ConnectedShorelineTypeButton />
                    </div>
                )}

                {/* Content area */}
                <div className="shoreline-viewer-body-content">
                    {loading && (
                        <div className="shoreline-viewer-spinner-container">
                            <Spinner />
                        </div>
                    )}

                    {isValidationFeature && (
                        <ValidationInformation
                            properties={selectedFeature.properties}
                        />
                    )}

                    {isClassificationFeature && !isValidationFeature && (
                        <ShorelineInformation
                            segmentProperties={selectedFeature.properties}
                            tabs={tabs}
                        />
                    )}

                    {isVideoFeature && (
                        <VideoSection
                            selectedFeature={selectedFeature}
                            videoInformations={videoInformations}
                            onReady={handlePlayerReady}
                        />
                    )}

                    {isPhotoFeature && (
                        <PhotoSection selectedFeature={selectedFeature} />
                    )}
                </div>
            </div>
        </div>
    );
}

ShorelineViewer.propTypes = {
    style: PropTypes.object,
    selectedRegion: PropTypes.object,
    selectedMediaType: PropTypes.object,
    selectedThematic: PropTypes.object,
    selectedFeature: PropTypes.object,
    videoInformations: PropTypes.object,
    loading: PropTypes.bool,
    labelsVisible: PropTypes.bool,
    validationVisible: PropTypes.bool,
    messages: PropTypes.object,
    regions: PropTypes.array,
    tabs: PropTypes.array,
    onClose: PropTypes.func,
    onSelectRegion: PropTypes.func,
    onZoomToSelectedRegion: PropTypes.func,
    onSelectThematic: PropTypes.func,
    onUpdateVideoInformation: PropTypes.func,
    onVideoError: PropTypes.func,
    onSetVideoInformations: PropTypes.func,
    onSetLabelsVisible: PropTypes.func,
    onSetValidationVisible: PropTypes.func
};

ShorelineViewer.defaultProps = {
    style: {},
    regions: [],
    tabs: [],
    loading: false,
    labelsVisible: false,
    validationVisible: false,
    onClose: () => {},
    onSelectRegion: () => {},
    onZoomToSelectedRegion: () => {},
    onSelectThematic: () => {},
    onUpdateVideoInformation: () => {},
    onVideoError: () => {},
    onSetVideoInformations: () => {},
    onSetLabelsVisible: () => {},
    onSetValidationVisible: () => {}
};

// ---------------------------------------------------------------------------
// Plugin wrapper (gates rendering on `enabled`)
// ---------------------------------------------------------------------------

function ShorelineViewerPlugin({ enabled, ...props }) {
    return enabled ? <ShorelineViewer {...props} /> : null;
}

const ConnectedShorelineViewerPlugin = connect(
    createSelector(
        [
            (state) => mapLayoutValuesSelector(state, { height: true }),
            (state) => state?.controls?.shorelineViewer?.enabled,
            (state) => state?.shorelineViewer?.selectedMediaType,
            (state) => state?.shorelineViewer?.selectedRegion,
            (state) => state?.shorelineViewer?.selectedThematic,
            (state) => state?.shorelineViewer?.selectedFeature?.selectedFeature,
            (state) => state?.shorelineViewer?.videoInformations,
            (state) => state?.shorelineViewer?.loading ?? false,
            (state) => state?.shorelineViewer?.labelsVisible ?? false,
            (state) => state?.shorelineViewer?.validationVisible ?? false,
            (state) => state?.locale?.messages
        ],
        (
            style,
            enabled,
            selectedMediaType,
            selectedRegion,
            selectedThematic,
            selectedFeature,
            videoInformations,
            loading,
            labelsVisible,
            validationVisible,
            messages
        ) => ({
            style,
            enabled,
            selectedMediaType,
            selectedRegion,
            selectedThematic,
            selectedFeature,
            videoInformations,
            loading,
            labelsVisible,
            validationVisible,
            messages
        })
    ),
    {
        onClose: setControlProperty.bind(null, 'shorelineViewer', 'enabled', false),
        onSelectRegion: setShorelineRegion,
        onZoomToSelectedRegion: zoomToRegion,
        onSelectThematic: setShorelineThematic,
        addMarkers: updateAdditionalLayer,
        onUpdateVideoInformation: updateVideoInformation,
        onVideoError: videoError,
        onSetVideoInformations: setVideoInformations,
        onSetLabelsVisible: setShorelineLabelsVisible,
        onSetValidationVisible: setShorelineValidationVisible
    }
)(ShorelineViewerPlugin);

// ---------------------------------------------------------------------------
// createPlugin
// ---------------------------------------------------------------------------

export default createPlugin('ShorelineViewer', {
    component: ConnectedShorelineViewerPlugin,
    containers: {
        SidebarMenu: {
            name: 'ShorelineViewer',
            position: 5,
            tooltip: 'shorelineviewer.shorelineViewer',
            icon: <FontAwesomeIcon icon={faRoute} size="2x" />,
            action: setControlProperty.bind(
                null,
                'shorelineViewer',
                'enabled',
                'true'
            ),
            doNotHide: true,
            priority: 2
        }
    },
    epics: ShorelineViewerEpics,
    reducers: {
        shorelineViewer
    }
});

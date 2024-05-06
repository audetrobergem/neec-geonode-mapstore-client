/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { Glyphicon } from 'react-bootstrap';
import { createSelector } from 'reselect';
import Message from '@mapstore/framework/components/I18N/Message';
import GNButton from '@js/components/Button';
import FaIcon from '@js/components/FaIcon';
import { DropdownList } from 'react-widgets';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import {
    setShorelineRegion,
    updateShorelineSelectedMediaType,
    selectFirstMediaFeature,
    selectPreviousMediaFeature,
    selectNextMediaFeature,
    selectLastMediaFeature
} from '@js/actions/shorelineviewer';
import ShorelineViewerEpics from '@js/epics/shorelineviewer';
import shorelineViewer from '@js/reducers/shorelineviewer';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';
import { updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';

const Button = tooltip(GNButton);

function ShorelineTypeButton({
    selectedRegion,
    selectedMediaType,
    onSelectMediaType
}) {
    const mediaTypes = [
        {
            name: "Photos",
            icon: "camera",
            tooltip: "shorelineviewer.displayPhotoTracklogsTooltip",
            datasetName: "photoDataset"
        }, {
            name: "Videos",
            icon: "video-camera",
            tooltip: "shorelineviewer.displayVideoTracklogsTooltip",
            datasetName: "videoDataset"
        }
    ];

    return (
        <div className="text-center col-xs-12">
            {mediaTypes.map((mediaType) => (
                <Button
                    className="btn-primary"
                    tooltipId={<Message msgId={mediaType.tooltip} />}
                    disabled={!(mediaType.datasetName in selectedRegion)}
                    key={mediaType.name}
                    active={selectedMediaType === mediaType}
                    onClick={() => { onSelectMediaType(mediaType); }}
                >
                    <FaIcon name={mediaType.icon} />
                </Button>
            ))}
        </div>
    );
}

const ConnectedShorelineTypeButton = connect(
    createSelector([
        state => state?.shorelineViewer?.selectedRegion,
        state => state?.shorelineViewer?.selectedMediaType
    ], (selectedRegion, selectedMediaType) => ({
        selectedRegion,
        selectedMediaType
    })),
    {
        onSelectMediaType: updateShorelineSelectedMediaType
    }
)((ShorelineTypeButton));

function PhotoNavigationButton({
    selectedFeature,
    selectedMediaDatasetFeatures,
    firstPhoto,
    previousPhoto,
    nextPhoto,
    lastPhoto
}) {
    const selectedFeatureIndex = selectedMediaDatasetFeatures.features.findIndex((x) => x.properties.name === selectedFeature.properties.name);
    // Look if the selected photo is the first in the list. If it's the case, the navigation to the first and previous buttons will be disabled.
    let isFirstPhoto = false;
    if (selectedFeatureIndex === 0) {
        isFirstPhoto = true;
    }
    // Look if the selected photo is the last in the list. If it's the case, the navigation to the next and last buttons will be disabled.
    let isLastPhoto = false;
    if (selectedFeatureIndex === selectedMediaDatasetFeatures.features.length - 1) {
        isLastPhoto = true;
    }

    return (
        <div className="text-center col-xs-12">
            <Button
                className="shoreline-viewer-media-navigation-button"
                tooltipId={<Message msgId={`shorelineviewer.firstPhotoTooltip`} />}
                disabled={isFirstPhoto}
                onClick={() => { firstPhoto(selectedFeature); }}
            >
                <FaIcon name="angle-double-left" />
            </Button>
            <Button
                className="shoreline-viewer-media-navigation-button"
                tooltipId={<Message msgId={`shorelineviewer.previousPhotoTooltip`} />}
                disabled={isFirstPhoto}
                onClick={() => { previousPhoto(selectedFeature); }}
            >
                <FaIcon name="angle-left" />
            </Button>
            <Button
                className="shoreline-viewer-media-navigation-button"
                tooltipId={<Message msgId={`shorelineviewer.nextPhotoTooltip`} />}
                disabled={isLastPhoto}
                onClick={() => { nextPhoto(selectedFeature); }}
            >
                <FaIcon name="angle-right" />
            </Button>
            <Button
                className="shoreline-viewer-media-navigation-button"
                tooltipId={<Message msgId={`shorelineviewer.lastPhotoTooltip`} />}
                disabled={isLastPhoto}
                onClick={() => { lastPhoto(selectedFeature); }}
            >
                <FaIcon name="angle-double-right" />
            </Button>
        </div>
    );
}

const ConnectedPhotoNavigationButton = connect(
    createSelector([
        state => state?.shorelineViewer?.selectedFeature,
        state => state?.shorelineViewer?.selectedMediaDatasetFeatures
    ], (selectedFeature, selectedMediaDatasetFeatures) => ({
        selectedFeature, selectedMediaDatasetFeatures
    })),
    {
        firstPhoto: selectFirstMediaFeature,
        previousPhoto: selectPreviousMediaFeature,
        nextPhoto: selectNextMediaFeature,
        lastPhoto: selectLastMediaFeature
    }
)((PhotoNavigationButton));

/**
* @module ShorelineViewer
*/

/**
 * render a panel for detail information about a resource inside the viewer pages
 * @name ShorelineViewer
 * @prop {array} regions list of regions where shoreline videos are available
 * @example
 */

function ShorelineViewer({
    style,
    selectedRegion,
    selectedFeature,
    onClose,
    regions,
    onSelectRegion
}) {
    const isMounted = useRef();

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    return (
        <div
            className="shoreline-viewer"
            style={style}
        >
            <div className="shoreline-viewer-head">
                <div className="shoreline-viewer-title"><Message msgId="shorelineviewer.shorelineViewerTitle" /></div>
                <Button className="square-button" onClick={() => onClose()}>
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>
            <div className="shoreline-viewer-body">
                <DropdownList
                    className="shoreline-viewer-dropdown"
                    defaultValue="shorelineviewer.shorelineViewerDefaultSelect"
                    onChange={(value) => {
                        onSelectRegion(value);
                    }}
                    data={regions}
                    textField="labelId"
                    valueField="id"
                />
                <div className="shoreline-viewer-body">
                    {selectedRegion !== null &&
                    <ConnectedShorelineTypeButton />
                    }
                </div>
                {selectedFeature !== null && selectedFeature.id.includes("shoreline_classification") &&
                <div className="shoreline-viewer-info-table">
                    <div className="shoreline-viewer-info-fields">
                        {selectedFeature.properties.upper_intertidal_scat_class &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Upper Intertidal SCAT Class</div>
                                <div className="shoreline-viewer-info-value">{selectedFeature.properties.upper_intertidal_scat_class}</div>
                            </div>
                        }
                        {selectedFeature.properties.shoreline_processes &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Shoreline Processes</div>
                                <div className="shoreline-viewer-info-value">
                                    <ul className="shoreline-viewer-list">
                                        {selectedFeature.properties.shoreline_processes
                                            .replace('[', '').replace(']', '').replace(/"/g, '').split(',').map(process => <li>{process}</li>)
                                        }
                                    </ul>
                                </div>
                            </div>
                        }
                        {selectedFeature.properties.transportation_mode &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Transportation Mode</div>
                                <div className="shoreline-viewer-info-value">
                                    <ul className="shoreline-viewer-list">
                                        {selectedFeature.properties.transportation_mode
                                            .replace('[', '').replace(']', '').replace(/"/g, '').split(',').map(mode => <li>{mode}</li>)
                                        }
                                    </ul>
                                </div>
                            </div>
                        }
                        {selectedFeature.properties.backshore_access &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Backshore Access</div>
                                <div className="shoreline-viewer-info-value">{selectedFeature.properties.backshore_access}</div>
                            </div>
                        }
                        {selectedFeature.properties.alongshore_access &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Alongshore Access</div>
                                <div className="shoreline-viewer-info-value">{selectedFeature.properties.alongshore_access}</div>
                            </div>
                        }
                        {selectedFeature.properties.length_m &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Length (m)</div>
                                <div className="shoreline-viewer-info-value">{selectedFeature.properties.length_m}</div>
                            </div>
                        }
                        {selectedFeature.properties.name &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Name</div>
                                <div className="shoreline-viewer-info-value">{selectedFeature.properties.name}</div>
                            </div>
                        }
                        {selectedFeature.properties.survey_year &&
                            <div className="shoreline-viewer-info-row">
                                <div className="shoreline-viewer-info-label">Survey Year</div>
                                <div className="shoreline-viewer-info-value">{selectedFeature.properties.survey_year}</div>
                            </div>
                        }
                    </div>
                </div>
                }

                {selectedFeature !== null && selectedFeature.id.includes("shoreline_photos") &&
                <div className="shoreline-viewer-body">
                    <a href={"javascript:window.open('" + selectedFeature.properties.photo + "', 'popup', 'width=800,height=600'); void(0)"}>
                        <img className="img-responsive" src={selectedFeature.properties.photo} />
                    </a>
                    <ConnectedPhotoNavigationButton />
                    <div className="shoreline-viewer-body">
                        <div className="shoreline-viewer-info-table">
                            <div className="shoreline-viewer-info-fields">
                                <div className="shoreline-viewer-info-row">
                                    <div className="shoreline-viewer-info-label">Date</div>
                                    <div className="shoreline-viewer-info-value">{selectedFeature.properties.date}</div>
                                </div>
                                <div className="shoreline-viewer-info-row">
                                    <div className="shoreline-viewer-info-label">Time</div>
                                    <div className="shoreline-viewer-info-value">{selectedFeature.properties.time}</div>
                                </div>
                                <div className="shoreline-viewer-info-row">
                                    <div className="shoreline-viewer-info-label">Latitude</div>
                                    <div className="shoreline-viewer-info-value">{selectedFeature.properties.lat}</div>
                                </div>
                                <div className="shoreline-viewer-info-row">
                                    <div className="shoreline-viewer-info-label">Longitude</div>
                                    <div className="shoreline-viewer-info-value">{selectedFeature.properties.lon}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                }
            </div>

        </div>);
}

ShorelineViewer.propTypes = {
    onClose: PropTypes.func,
    onSelectRegion: PropTypes.func,
    addMarkers: PropTypes.func
};

ShorelineViewer.defaultProps = {
    onClose: () => { },
    onSelectRegion: () => { },
    addMarkers: () => { }
};

function ShorelineViewerPlugin({ enabled, ...props }) {
    return enabled ? <ShorelineViewer {...props} /> : null;
}

const ConnectedShorelineViewerPlugin = connect(
    createSelector([
        state => mapLayoutValuesSelector(state, { height: true }),
        state => state?.controls?.shorelineViewer?.enabled,
        state => state?.shorelineViewer?.selectedMediaType,
        state => state?.shorelineViewer?.selectedRegion,
        state => state?.shorelineViewer?.selectedFeature
    ], (style, enabled, selectedMediaType, selectedRegion, selectedFeature) => ({
        style,
        enabled,
        selectedMediaType,
        selectedRegion,
        selectedFeature
    })), {
        onClose: setControlProperty.bind(null, 'shorelineViewer', 'enabled', false),
        onSelectRegion: setShorelineRegion,
        addMarkers: updateAdditionalLayer
    }
)(ShorelineViewerPlugin);

const ShorelineViewerButton = ({
    onClick,
    size,
    variant
}) => {

    const handleClickButton = () => {
        onClick();
    };

    return (
        <Button
            size={size}
            onClick={handleClickButton}
            variant={variant}
        >
            <Message msgId="shorelineviewer.shorelineViewer" />
        </Button>
    );
};

const ConnectedShorelineViewerButton = connect(
    createSelector([], () => ({})),
    {
        onClick: setControlProperty.bind(null, 'shorelineViewer', 'enabled', true)
    }
)((ShorelineViewerButton));

export default createPlugin('ShorelineViewer', {
    component: ConnectedShorelineViewerPlugin,
    containers: {
        ActionNavbar: {
            name: 'ShorelineViewer',
            Component: ConnectedShorelineViewerButton
        }
    },
    epics: ShorelineViewerEpics,
    reducers: {
        shorelineViewer
    }
});

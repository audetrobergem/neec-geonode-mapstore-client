/*
 * Copyright 2025, ECCC.
 * All rights reserved.
 *
 * Displays structured attribute information for a selected shoreline
 * validation point feature.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Message from '@mapstore/framework/components/I18N/Message';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Fixed fields rendered in declaration order.
 * `key`     – feature property name
 * `labelId` – i18n message id
 */
const VALIDATION_FIELDS = [
    { key: 'segment_name',        labelId: 'shorelineviewer.validation.segmentName' },
    { key: 'survey_date',         labelId: 'shorelineviewer.validation.surveyDate' },
    { key: 'description',         labelId: 'shorelineviewer.validation.description' },
    { key: 'shoreline_comment',   labelId: 'shorelineviewer.validation.shorelineComment' },
    { key: 'is_changed',          labelId: 'shorelineviewer.validation.isChanged' },
    { key: 'new_eccc_scat_class', labelId: 'shorelineviewer.validation.newEcccScatClass' }
];

/**
 * Photo field names in display order.
 * Only those whose value is non-empty are rendered.
 */
const PHOTO_FIELDS = [
    { key: 'alongshore_photo_1',  labelId: 'shorelineviewer.validation.alongshorePhoto1' },
    { key: 'alongshore_photo_2',  labelId: 'shorelineviewer.validation.alongshorePhoto2' },
    { key: 'across_shore_photo_1', labelId: 'shorelineviewer.validation.acrossShorePhoto1' },
    { key: 'across_shore_photo_2', labelId: 'shorelineviewer.validation.acrossShorePhoto2' },
    { key: 'misc_photo_1',        labelId: 'shorelineviewer.validation.miscPhoto1' },
    { key: 'misc_photo_2',        labelId: 'shorelineviewer.validation.miscPhoto2' },
    { key: 'misc_photo_3',        labelId: 'shorelineviewer.validation.miscPhoto3' }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isPresent = (value) =>
    value !== null &&
    value !== undefined &&
    value !== '' &&
    value !== 'None';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Single attribute row (label + value).
 */
function ValidationField({ labelId, value }) {
    if (!isPresent(value)) {
        return null;
    }
    return (
        <div className="shoreline-viewer-info-row">
            <div className="shoreline-viewer-info-label">
                <Message msgId={labelId} />
            </div>
            <div className="shoreline-viewer-info-value">
                {String(value)}
            </div>
        </div>
    );
}

ValidationField.propTypes = {
    labelId: PropTypes.string.isRequired,
    value: PropTypes.any
};

/**
 * Thumbnail that opens the full image in a popup on click.
 */
function PhotoThumbnail({ labelId, url }) {
    const openPopup = (e) => {
        e.preventDefault();
        window.open(url, 'popup', 'width=800,height=600');
    };

    return (
        <div className="validation-photo-item">
            <div className="validation-photo-label">
                <Message msgId={labelId} />
            </div>
            <a href={url} onClick={openPopup}>
                <img
                    className="validation-photo-thumbnail"
                    src={url}
                    alt=""
                />
            </a>
        </div>
    );
}

PhotoThumbnail.propTypes = {
    labelId: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Displays validation-point attributes for a selected segment.
 *
 * @param {object} properties - GeoJSON feature properties from the validation layer
 */
function ValidationInformation({ properties }) {
    if (!properties) {
        return null;
    }

    const visiblePhotos = PHOTO_FIELDS.filter(
        ({ key }) => isPresent(properties[key])
    );

    return (
        <div className="shoreline-viewer-info validation-information">
            {/* ── Fixed attribute fields ── */}
            <div className="shoreline-viewer-info-fields">
                {VALIDATION_FIELDS.map(({ key, labelId }) => (
                    <ValidationField
                        key={key}
                        labelId={labelId}
                        value={properties[key]}
                    />
                ))}
            </div>

            {/* ── Photo grid (only when at least one photo is present) ── */}
            {visiblePhotos.length > 0 && (
                <div className="validation-photos-section">
                    <div className="validation-photos-title">
                        <Message msgId="shorelineviewer.validation.photos" />
                    </div>
                    <div className="validation-photos-grid">
                        {visiblePhotos.map(({ key, labelId }) => (
                            <PhotoThumbnail
                                key={key}
                                labelId={labelId}
                                url={properties[key]}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

ValidationInformation.propTypes = {
    properties: PropTypes.object
};

ValidationInformation.defaultProps = {
    properties: null
};

export default ValidationInformation;

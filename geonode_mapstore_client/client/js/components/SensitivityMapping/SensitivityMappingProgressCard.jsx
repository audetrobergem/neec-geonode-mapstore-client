/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Glyphicon } from 'react-bootstrap';
import Message from '@mapstore/framework/components/I18N/Message';
import Spinner from '@mapstore/framework/components/layout/Spinner';

/**
 * Displays a floating progress card at the top of the screen during the print process.
 * Shows current step, messages, and a download button when ready.
 */
function SensitivityMappingProgressCard({
    visible,
    loading,
    error,
    downloadUrl,
    currentStep,
    totalSteps,
    messages: cardMessages,
    onDismiss
}) {
    if (!visible) {
        return null;
    }

    const progressPercent = totalSteps > 0
        ? Math.round((currentStep / totalSteps) * 100)
        : 0;

    return (
        <div className="sensitivity-mapping-progress-card-overlay">
            <div className="sensitivity-mapping-progress-card">
                {/* Header */}
                <div className="sensitivity-mapping-progress-card-header">
                    <span className="sensitivity-mapping-progress-card-title">
                        <Message msgId="sensitivitymapping.progressCard.title" />
                    </span>
                    {(!!downloadUrl || !!error) && (
                        <button
                            className="sensitivity-mapping-progress-card-close"
                            onClick={onDismiss}
                            aria-label="Close"
                        >
                            <Glyphicon glyph="1-close" />
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                {loading && (
                    <div className="sensitivity-mapping-progress-bar-wrapper">
                        <div className="sensitivity-mapping-progress-bar-track">
                            <div
                                className="sensitivity-mapping-progress-bar-fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Steps */}
                <div className="sensitivity-mapping-progress-card-steps">
                    {cardMessages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={[
                                'sensitivity-mapping-progress-card-step',
                                msg.type === 'error'
                                    ? 'sensitivity-mapping-progress-card-step--error'
                                    : '',
                                msg.type === 'warning'
                                    ? 'sensitivity-mapping-progress-card-step--warning'
                                    : '',
                                msg.type === 'success'
                                    ? 'sensitivity-mapping-progress-card-step--success'
                                    : '',
                                msg.type === 'info'
                                    ? 'sensitivity-mapping-progress-card-step--info'
                                    : ''
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <span className="sensitivity-mapping-progress-card-step-icon">
                                {msg.type === 'error' && (
                                    <Glyphicon glyph="warning-sign" />
                                )}
                                {msg.type === 'warning' && (
                                    <Glyphicon glyph="alert" />
                                )}
                                {msg.type === 'success' && (
                                    <Glyphicon glyph="ok-circle" />
                                )}
                                {msg.type === 'info' && loading && idx === cardMessages.length - 1 ? (
                                    <Spinner />
                                ) : msg.type === 'info' ? (
                                    <Glyphicon glyph="ok" />
                                ) : null}
                            </span>
                            <span className="sensitivity-mapping-progress-card-step-text">
                                {msg.msgId
                                    ? <Message msgId={msg.msgId} msgParams={msg.values} />
                                    : msg.text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer: spinner or download */}
                <div className="sensitivity-mapping-progress-card-footer">
                    {loading && !error && (
                        <span className="sensitivity-mapping-progress-card-loading-label">
                            <Spinner />
                            <Message msgId="sensitivitymapping.progressCard.processing" />
                        </span>
                    )}
                    {!!downloadUrl && !error && (
                        <a
                            className="btn btn-success sensitivity-mapping-progress-card-download"
                            href={downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Glyphicon glyph="save" />
                            {' '}
                            <Message msgId="sensitivitymapping.progressCard.download" />
                        </a>
                    )}
                    {!!error && (
                        <span className="sensitivity-mapping-progress-card-error-label">
                            <Glyphicon glyph="remove-circle" />
                            {' '}
                            <Message msgId="sensitivitymapping.progressCard.error" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

SensitivityMappingProgressCard.propTypes = {
    visible: PropTypes.bool,
    loading: PropTypes.bool,
    error: PropTypes.bool,
    downloadUrl: PropTypes.string,
    currentStep: PropTypes.number,
    totalSteps: PropTypes.number,
    /** Array of { type: 'info'|'warning'|'error'|'success', msgId?, text?, values? } */
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.oneOf(['info', 'warning', 'error', 'success']),
            msgId: PropTypes.string,
            text: PropTypes.string,
            values: PropTypes.object
        })
    ),
    onDismiss: PropTypes.func
};

SensitivityMappingProgressCard.defaultProps = {
    visible: false,
    loading: false,
    error: false,
    downloadUrl: undefined,
    currentStep: 0,
    totalSteps: 0,
    messages: [],
    onDismiss: () => {}
};

export default SensitivityMappingProgressCard;

/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import SensitivityMappingEpics from '@js/epics/sensitivitymapping';
import sensitivityMapping from '@js/reducers/sensitivitymapping';
import Message from '@mapstore/framework/components/I18N/Message';
import GNButton from '@mapstore/framework/components/layout/Button';
import Spinner from '@mapstore/framework/components/layout/Spinner';
import { DropdownList } from 'react-widgets';
import { Glyphicon } from 'react-bootstrap';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import {
    setPrintApplication,
    updatePrintProperty,
    createPrintConfig,
    dismissProgressCard
} from '@js/actions/sensitivitymapping';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';
import {
    enabledSelector,
    sensitivityMappingStateSelector,
    progressCardVisibleSelector,
    progressMessagesSelector,
    progressCurrentStepSelector,
    progressTotalStepsSelector
} from '@js/selectors/sensitivitymapping';
import SensitivityMappingProgressCard from '@js/components/SensitivityMapping/SensitivityMappingProgressCard';

const Button = tooltip(GNButton);

/** @module SensitivityMapping */

function SensitivityMapping({
    style,
    userGroups,
    messages,
    sensitivityMappingStore,
    applications,
    defaultApplication,
    onClose,
    onSelectPrintApplication,
    onUpdatePrintProperty,
    onCreatePrintConfig,
    // Progress card props
    progressCardVisible,
    progressMessages,
    progressCurrentStep,
    progressTotalSteps,
    onDismissProgressCard
}) {
    const {
        printApplications,
        loading,
        error,
        downloadUrl,
        selectedPrintCapabilities,
        printProperties,
        selectedPrintApplication
    } = sensitivityMappingStore ?? {};

    const localizedPrintApplications = (applications ?? []).filter((application) => {
        application.labelId = getMessageById(messages, application.labelId);
        return (
            !application.restrictions ||
            application.restrictions.some(r => userGroups.includes(r))
        );
    });

    const printAppProperties = selectedPrintApplication?.properties ?? [];

    const hasProp = (name) => printAppProperties.some(p => p.name === name);
    const getPropOptions = (name) =>
        printAppProperties.find(p => p.name === name)?.options ?? [];

    return (
        <>
            {/* ---- Floating progress card ---- */}
            <SensitivityMappingProgressCard
                visible={progressCardVisible}
                loading={loading}
                error={error}
                downloadUrl={downloadUrl}
                currentStep={progressCurrentStep}
                totalSteps={progressTotalSteps}
                messages={progressMessages}
                onDismiss={onDismissProgressCard}
            />

            {/* ---- Right panel ---- */}
            <div className="sensitivity-mapping" style={style}>
                <div className="sensitivity-mapping-head">
                    <div className="sensitivity-mapping-title">
                        <Message msgId="sensitivitymapping.sensitivityMappingTitle" />
                    </div>
                    <Button
                        className="ms-close square-button-md _border-transparent btn btn-default"
                        onClick={onClose}
                    >
                        <Glyphicon glyph="1-close" />
                    </Button>
                </div>

                {printApplications && (
                    <div className="sensitivity-mapping-body">
                        {loading && (
                            <div className="sensitivity-mapping-spinner-container">
                                <Spinner />
                            </div>
                        )}

                        <div className="sensitivity-mapping-body-content">
                            <DropdownList
                                className="sensitivity-mapping-dropdown"
                                defaultValue={getMessageById(messages, defaultApplication)}
                                onChange={onSelectPrintApplication}
                                data={localizedPrintApplications}
                                textField="labelId"
                                valueField="name"
                            />
                        </div>

                        {selectedPrintCapabilities && printProperties && (
                            <div className="sensitivity-mapping-body-content">
                                <form>
                                    {/* Title */}
                                    <div className="form-group">
                                        <label htmlFor="title">
                                            <Message msgId="sensitivitymapping.mapTitle" />
                                        </label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            name="title"
                                            value={printProperties.title}
                                            onChange={({ target: { name, value } }) =>
                                                onUpdatePrintProperty({ name, value })
                                            }
                                        />
                                    </div>

                                    {/* Language */}
                                    <div className="form-group row">
                                        <label htmlFor="language" className="col-sm-4 col-form-label">
                                            <Message msgId="sensitivitymapping.mapLanguage" />
                                        </label>
                                        <div className="col-sm-8">
                                            <select
                                                className="form-control"
                                                name="language"
                                                value={printProperties.language}
                                                onChange={({ target: { name, value } }) =>
                                                    onUpdatePrintProperty({ name, value })
                                                }
                                            >
                                                <option value="en">English</option>
                                                <option value="fr">Français</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Format */}
                                    <div className="form-group row">
                                        <label htmlFor="format" className="col-sm-4 col-form-label">
                                            <Message msgId="sensitivitymapping.mapFormat" />
                                        </label>
                                        <div className="col-sm-8">
                                            <select
                                                className="form-control"
                                                name="format"
                                                value={printProperties.format}
                                                onChange={({ target: { name, value } }) =>
                                                    onUpdatePrintProperty({ name, value })
                                                }
                                            >
                                                {selectedPrintCapabilities.formats.map(fmt => (
                                                    <option key={fmt} value={fmt}>{fmt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Resolution */}
                                    <div className="form-group row">
                                        <label htmlFor="resolution" className="col-sm-4 col-form-label">
                                            <Message msgId="sensitivitymapping.mapResolution" />
                                        </label>
                                        <div className="col-sm-8">
                                            <select
                                                className="form-control"
                                                name="resolution"
                                                value={printProperties.resolution}
                                                onChange={({ target: { name, value } }) =>
                                                    onUpdatePrintProperty({ name, value })
                                                }
                                            >
                                                {selectedPrintApplication.resolutions.map(res => (
                                                    <option key={res} value={res}>{res}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Coordinate system */}
                                    <div className="form-group row">
                                        <label
                                            htmlFor="projection"
                                            className="col-sm-4 col-form-label"
                                        >
                                            <Message msgId="sensitivitymapping.mapCoordinatesSystem" />
                                        </label>
                                        <div className="col-sm-8">
                                            <select
                                                className="form-control"
                                                name="projection"
                                                value={printProperties.projection}
                                                onChange={({ target: { name, value } }) =>
                                                    onUpdatePrintProperty({ name, value })
                                                }
                                            >
                                                {(sensitivityMappingStore.projections ?? []).map(
                                                    proj => (
                                                        <option key={proj.code} value={proj.code}>
                                                            {proj.name}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Scale */}
                                    <div className="form-group row">
                                        <label htmlFor="scale" className="col-sm-4 col-form-label">
                                            <Message msgId="sensitivitymapping.mapScale" />
                                        </label>
                                        <div className="col-sm-8">
                                            <input
                                                className="form-control"
                                                type="number"
                                                name="scale"
                                                value={printProperties.scale}
                                                step={
                                                    Math.round(printProperties.scale / 10000) * 100
                                                }
                                                onChange={({ target: { name, value } }) =>
                                                    onUpdatePrintProperty({ name, value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Orientation */}
                                    {hasProp("orientation") && (
                                        <div className="form-group row">
                                            <label
                                                htmlFor="orientation"
                                                className="col-sm-4 col-form-label"
                                            >
                                                <Message msgId="sensitivitymapping.mapOrientation" />
                                            </label>
                                            <div className="col-sm-8">
                                                <select
                                                    className="form-control"
                                                    name="orientation"
                                                    value={printProperties.orientation}
                                                    onChange={({ target: { name, value } }) =>
                                                        onUpdatePrintProperty({ name, value })
                                                    }
                                                >
                                                    {getPropOptions("orientation").map(o => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Grid layer */}
                                    {hasProp("gridLayer") && (
                                        <div className="checkbox">
                                            <label
                                                className="strong control-label"
                                                htmlFor="gridLayer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="gridLayer"
                                                    checked={!!printProperties.gridLayer}
                                                    onChange={({ target: { name, checked } }) =>
                                                        onUpdatePrintProperty({ name, value: checked })
                                                    }
                                                />
                                                <Message msgId="sensitivitymapping.mapGridLayer" />
                                            </label>
                                        </div>
                                    )}

                                    {/* Legend */}
                                    {hasProp("legend") && (
                                        <div className="checkbox">
                                            <label
                                                className="strong control-label"
                                                htmlFor="legend"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="legend"
                                                    checked={!!printProperties.legend}
                                                    onChange={({ target: { name, checked } }) =>
                                                        onUpdatePrintProperty({ name, value: checked })
                                                    }
                                                />
                                                <Message msgId="sensitivitymapping.mapLegend" />
                                            </label>
                                        </div>
                                    )}

                                    {/* Legend on 2 pages */}
                                    {hasProp("legend2Pages") && (
                                        <div className="checkbox">
                                            <label
                                                className="strong control-label"
                                                htmlFor="legend2Pages"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="legend2Pages"
                                                    checked={!!printProperties.legend2Pages}
                                                    onChange={({ target: { name, checked } }) =>
                                                        onUpdatePrintProperty({ name, value: checked })
                                                    }
                                                />
                                                <Message msgId="sensitivitymapping.mapLegend2Page" />
                                            </label>
                                        </div>
                                    )}

                                    {/* Filter legend */}
                                    {hasProp("filterLegend") && (
                                        <div className="checkbox">
                                            <label
                                                className="strong control-label"
                                                htmlFor="filterLegend"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="filterLegend"
                                                    checked={!!printProperties.filterLegend}
                                                    onChange={({ target: { name, checked } }) =>
                                                        onUpdatePrintProperty({ name, value: checked })
                                                    }
                                                />
                                                <Message msgId="sensitivitymapping.mapFilterLegend" />
                                            </label>
                                        </div>
                                    )}

                                    {/* Report */}
                                    {selectedPrintApplication.report && (
                                        <div className="checkbox">
                                            <label
                                                className="strong control-label"
                                                htmlFor="report"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="report"
                                                    checked={!!printProperties.report}
                                                    onChange={({ target: { name, checked } }) =>
                                                        onUpdatePrintProperty({ name, value: checked })
                                                    }
                                                />
                                                <Message msgId="sensitivitymapping.mapReport" />
                                            </label>
                                        </div>
                                    )}
                                </form>

                                <div className="sensitivity-mapping-buttons">
                                    <Button
                                        type="button"
                                        className="btn btn-primary sensitivity-mapping-print-btn"
                                        onClick={onCreatePrintConfig}
                                        disabled={!!loading}
                                    >
                                        <Message msgId="sensitivitymapping.print" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

SensitivityMapping.propTypes = {
    style: PropTypes.object,
    userGroups: PropTypes.array,
    messages: PropTypes.object,
    sensitivityMappingStore: PropTypes.object,
    applications: PropTypes.array,
    defaultApplication: PropTypes.string,
    onClose: PropTypes.func,
    onSelectPrintApplication: PropTypes.func,
    onUpdatePrintProperty: PropTypes.func,
    onCreatePrintConfig: PropTypes.func,
    progressCardVisible: PropTypes.bool,
    progressMessages: PropTypes.array,
    progressCurrentStep: PropTypes.number,
    progressTotalSteps: PropTypes.number,
    onDismissProgressCard: PropTypes.func
};

SensitivityMapping.defaultProps = {
    userGroups: [],
    applications: [],
    onClose: () => {},
    onSelectPrintApplication: () => {},
    onUpdatePrintProperty: () => {},
    onCreatePrintConfig: () => {},
    progressCardVisible: false,
    progressMessages: [],
    progressCurrentStep: 0,
    progressTotalSteps: 0,
    onDismissProgressCard: () => {}
};

function SensitivityMappingPlugin({ enabled, ...props }) {
    return enabled ? <SensitivityMapping {...props} /> : null;
}

const ConnectedSensitivityMappingPlugin = connect(
    createSelector(
        [
            state => mapLayoutValuesSelector(state, { height: true }),
            enabledSelector,
            state => state?.security?.user?.info?.groups ?? [],
            state => state?.locale?.messages,
            sensitivityMappingStateSelector,
            progressCardVisibleSelector,
            progressMessagesSelector,
            progressCurrentStepSelector,
            progressTotalStepsSelector
        ],
        (
            style,
            enabled,
            userGroups,
            messages,
            sensitivityMappingStore,
            progressCardVisible,
            progressMessages,
            progressCurrentStep,
            progressTotalSteps
        ) => ({
            style,
            enabled,
            userGroups,
            messages,
            sensitivityMappingStore,
            progressCardVisible,
            progressMessages,
            progressCurrentStep,
            progressTotalSteps
        })
    ),
    {
        onClose: setControlProperty.bind(null, 'sensitivityMapping', 'enabled', false),
        onSelectPrintApplication: setPrintApplication,
        onUpdatePrintProperty: updatePrintProperty,
        onCreatePrintConfig: createPrintConfig,
        onDismissProgressCard: dismissProgressCard
    }
)(SensitivityMappingPlugin);

export default createPlugin('SensitivityMapping', {
    component: ConnectedSensitivityMappingPlugin,
    containers: {
        SidebarMenu: {
            name: "SensitivityMapping",
            position: 1,
            tooltip: "sensitivitymapping.sensitivityMapping",
            icon: <Glyphicon glyph="print" />,
            action: setControlProperty.bind(null, 'sensitivityMapping', 'enabled', 'true'),
            doNotHide: true,
            priority: 2
        }
    },
    epics: SensitivityMappingEpics,
    reducers: {
        sensitivityMapping
    }
});

/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useEffect } from 'react';
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
import { setPrintApplication, updatePrintProperty, createPrintConfig } from '@js/actions/sensitivitymapping';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';

const Button = tooltip(GNButton);

/**
* @module SensitivityMapping
*/

/**
 * NEEC GeoPortal printing tool.
 *
 * This plugin replaces the default MapStore print plugin. It uses the MapFish Print 3 printing module,
 * which must be installed for the plugin to work. This plugin allows you to use multiple print templates
 * to print maps with different purposes. Each template (application) can be configured, with printing
 * options specific to each application and default values. The following properties can be configured:
 *    - orientation: map orientation (choice list)
 *    - legend2Pages: the legend on a separate page (checkbox)
 *    - filterLegend: Filter legend by map extent (checkbox)
 *    - gridLayer: Display a grid layer (checkbox)
 *    - coordinatesSystems: Print coordinate system (choice list)
 *    - resolution: Resolution (choice list)
 *    - utmEnabled: Add the NAD83 UTM projection corresponding to the longitude to the list of coordinate systems.
 *    - restrictions: Restrict the selection of this application to members of certain groups.
 *    - report: Create a report to accompany the map. This report must correspond to a management command available via the GeoNode API.
 *
 * @name SensitivityMapping
 * @prop {string} mapfishUrl url of the mapfish print 3 server
 * @prop {string} defaultApplication the default map application
 * @prop {array} applications list of templates available for printing with properties
 * @prop {boolean} disablePluginIf condition for deactivating the plugin
 * @example
 * // Example of configuration for an application
 * {
 *     "name": "sensitivity-mapping",
 *     "labelId": "sensitivitymapping.apps.sensitivityMapping",
 *     "properties": [
 *         {
 *             "name": "orientation",
 *             "options": ["Landscape", "Portrait"],
 *             "default": "Landscape"
 *         }, {
 *             "name": "legend2Pages",
 *             "default": false
 *         }, {
 *             "name": "filterLegend",
 *             "default": true
 *         }, {
 *             "name": "gridLayer",
 *             "default": false
 *         }
 *     ],
 *     "coordinatesSystems": [
 *         {"code": "3857", "name": "Pseudo-Mercator"},
 *         {"code": "3978", "name": "NAD83 / Canada Atlas Lambert"}
 *     ],
 *     "resolutions": ["150", "300"],
 *     "utmEnabled": true,
 *     "restrictions": ["neec"],
 *     "report": {
 *         "id": "sensitivity-mapping",
 *         "command": "create_sensitivity_map_email"
 *     }
 * }
 */

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
    onCreatePrintConfig
}) {
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const localizedPrintApplications = applications.filter((application) => {
        application.labelId = getMessageById(messages, application.labelId);
        return !application.restrictions ||
            application.restrictions.some(restriction => userGroups.includes(restriction));
    });

    return (
        <div
            className="sensitivity-mapping"
            style={style}
        >
            <div className="sensitivity-mapping-head">
                <div className="sensitivity-mapping-title">
                    <Message msgId="sensitivitymapping.sensitivityMappingTitle" />
                </div>
                <Button className="ms-close square-button-md _border-transparent btn btn-default" onClick={() => onClose()}>
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>
            {sensitivityMappingStore.printApplications &&
                <div className="sensitivity-mapping-body">
                    {sensitivityMappingStore.loading &&
                        <div
                            className="sensitivity-mapping-spinner-container">
                            <Spinner />
                        </div>
                    }
                    <div className="sensitivity-mapping-body-content">
                        <DropdownList
                            className="sensitivity-mapping-dropdown"
                            defaultValue={getMessageById(messages, defaultApplication)}
                            onChange={(value) => {
                                onSelectPrintApplication(value);
                            }}
                            data={localizedPrintApplications}
                            textField="labelId"
                            valueField="name"
                        />
                    </div>
                    {sensitivityMappingStore.selectedPrintCapabilities && sensitivityMappingStore.printProperties &&
                        <div className="sensitivity-mapping-body-content">
                            <form>
                                <div className="form-group">
                                    <label htmlFor="title"><Message msgId="sensitivitymapping.mapTitle"/></label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        name="title"
                                        value={sensitivityMappingStore.printProperties.title}
                                        onChange={(event) => {
                                            const { name, value } = event.target;
                                            onUpdatePrintProperty({ name, value });
                                        }}
                                    />
                                </div>
                                <div className="form-group row">
                                    <label htmlFor="format" className="col-sm-4 col-form-label"><Message msgId="sensitivitymapping.mapLanguage"/></label>
                                    <div className="col-sm-8">
                                        <select
                                            className="form-control"
                                            name="language"
                                            value={sensitivityMappingStore.printProperties.language}
                                            onChange={(event) => {
                                                const { name, value } = event.target;
                                                onUpdatePrintProperty({ name, value });
                                            }}
                                        >
                                            <option value="en">English</option>
                                            <option value="fr">Français</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <label htmlFor="format" className="col-sm-4 col-form-label"><Message msgId="sensitivitymapping.mapFormat"/></label>
                                    <div className="col-sm-8">
                                        <select
                                            className="form-control"
                                            name="format"
                                            value={sensitivityMappingStore.printProperties.format}
                                            onChange={(event) => {
                                                const { name, value } = event.target;
                                                onUpdatePrintProperty({ name, value });
                                            }}
                                        >
                                            {sensitivityMappingStore.selectedPrintCapabilities.formats.map((format) => <option value={format}>{format}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <label htmlFor="format" className="col-sm-4 col-form-label"><Message msgId="sensitivitymapping.mapResolution"/></label>
                                    <div className="col-sm-8">
                                        <select
                                            className="form-control"
                                            name="resolution"
                                            value={sensitivityMappingStore.printProperties.resolution}
                                            onChange={(event) => {
                                                const { name, value } = event.target;
                                                onUpdatePrintProperty({ name, value });
                                            }}
                                        >
                                            {sensitivityMappingStore.selectedPrintApplication.resolutions.map((resolution) => <option value={resolution}>{resolution}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <label htmlFor="format" className="col-sm-4 col-form-label"><Message msgId="sensitivitymapping.mapCoordinatesSystem"/></label>
                                    <div className="col-sm-8">
                                        <select
                                            className="form-control"
                                            name="projection"
                                            value={sensitivityMappingStore.printProperties.projection}
                                            onChange={(event) => {
                                                const { name, value } = event.target;
                                                onUpdatePrintProperty({ name, value });
                                            }}
                                        >
                                            {sensitivityMappingStore.projections.map((projection) => <option value={projection.code}>{projection.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <label htmlFor="format" className="col-sm-4 col-form-label"><Message msgId="sensitivitymapping.mapScale"/></label>
                                    <div className="col-sm-8">
                                        <input
                                            className="form-control"
                                            type="number"
                                            name="scale"
                                            value={sensitivityMappingStore.printProperties.scale}
                                            step={Math.round(sensitivityMappingStore.printProperties.scale / 10000) * 100}
                                            onChange={(event) => {
                                                const { name, value } = event.target;
                                                onUpdatePrintProperty({ name, value });
                                            }}
                                        />
                                    </div>
                                </div>
                                {sensitivityMappingStore.selectedPrintApplication.properties.find(property => property.name === "orientation") &&
                                    <div className="form-group row">
                                        <label htmlFor="orientation" className="col-sm-4 col-form-label"><Message msgId="sensitivitymapping.mapOrientation"/></label>
                                        <div className="col-sm-8">
                                            <select
                                                className="form-control"
                                                name="orientation"
                                                defaultValue="Landscape"
                                                onChange={(event) => {
                                                    const { name, value } = event.target;
                                                    onUpdatePrintProperty({ name, value });
                                                }}
                                            >
                                                {sensitivityMappingStore.selectedPrintApplication.properties.find(property => property.name === "orientation").options.map((orientation) => <option value={orientation}>{orientation}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                }
                                {sensitivityMappingStore.selectedPrintApplication.properties.find(property => property.name === "gridLayer") &&
                                    <div className="checkbox">
                                        <label className="strong control-label" htmlFor="gridLayer">
                                            <input
                                                type="checkbox"
                                                name="gridLayer"
                                                defaultChecked={sensitivityMappingStore.printProperties.gridLayer}
                                                onChange={(event) => {
                                                    const { name, checked } = event.target;
                                                    onUpdatePrintProperty({ name, "value": checked });
                                                }}
                                            />
                                            <Message msgId="sensitivitymapping.mapGridLayer"/>
                                        </label>
                                    </div>
                                }
                                {sensitivityMappingStore.selectedPrintApplication.properties.find(property => property.name === "legend") &&
                                    <div className="checkbox">
                                        <label className="strong control-label" htmlFor="legendCheckbox">
                                            <input
                                                type="checkbox"
                                                name="legend"
                                                defaultChecked={sensitivityMappingStore.printProperties.legend}
                                                onChange={(event) => {
                                                    const { name, checked } = event.target;
                                                    onUpdatePrintProperty({ name, "value": checked });
                                                }}
                                            />
                                            <Message msgId="sensitivitymapping.mapLegend"/>
                                        </label>
                                    </div>
                                }
                                {sensitivityMappingStore.selectedPrintApplication.properties.find(property => property.name === "legend2Pages") &&
                                    <div className="checkbox">
                                        <label className="strong control-label" htmlFor="legend2PagesCheckbox">
                                            <input
                                                type="checkbox"
                                                name="legend2Pages"
                                                defaultChecked={sensitivityMappingStore.printProperties.legend2Pages}
                                                onChange={(event) => {
                                                    const { name, checked } = event.target;
                                                    onUpdatePrintProperty({ name, "value": checked });
                                                }}
                                            />
                                            <Message msgId="sensitivitymapping.mapLegend2Page"/>
                                        </label>
                                    </div>
                                }
                                {sensitivityMappingStore.selectedPrintApplication.properties.find(property => property.name === "filterLegend") &&
                                    <div className="checkbox">
                                        <label className="strong control-label" htmlFor="filterLegendCheckbox">
                                            <input
                                                type="checkbox"
                                                name="filterLegend"
                                                defaultChecked={sensitivityMappingStore.printProperties.filterLegend}
                                                onChange={(event) => {
                                                    const { name, checked } = event.target;
                                                    onUpdatePrintProperty({ name, "value": checked });
                                                }}
                                            />
                                            <Message msgId="sensitivitymapping.mapFilterLegend"/>
                                        </label>
                                    </div>
                                }
                                {sensitivityMappingStore.selectedPrintApplication.report &&
                                    <div className="checkbox">
                                        <label className="strong control-label" htmlFor="createReportCheckbox">
                                            <input
                                                type="checkbox"
                                                name="report"
                                                defaultChecked={false}
                                                onChange={(event) => {
                                                    const { name, checked } = event.target;
                                                    onUpdatePrintProperty({ name, "value": checked });
                                                }}
                                            />
                                            <Message msgId="sensitivitymapping.mapReport"/>
                                        </label>
                                    </div>
                                }
                            </form>
                            <div className="sensitivity-mapping-buttons">
                                <Button
                                    type="button"
                                    className="btn btn-primary sensitivity-mapping-print-btn"
                                    onClick={() => onCreatePrintConfig()}
                                >
                                    <Message msgId="sensitivitymapping.print"/>
                                </Button>
                                <div className="btn btn-primary print-download" disabled={!sensitivityMappingStore.downloadUrl}>
                                    <a href={sensitivityMappingStore.downloadUrl} target="_blank"><Glyphicon glyph="save"/></a>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    );
}

SensitivityMapping.propTypes = {
    onClose: PropTypes.func,
    onSelectPrintApplication: PropTypes.func,
    onUpdatePrintProperty: PropTypes.func,
    onCreatePrintConfig: PropTypes.func
};

SensitivityMapping.defaultProps = {
    onClose: () => { },
    onSelectPrintApplication: () => { },
    onUpdatePrintProperty: () => { },
    onCreatePrintConfig: () => { }
};

function SensitivityMappingPlugin({ enabled, ...props }) {
    return enabled ? <SensitivityMapping {...props} /> : null;
}

const ConnectedSensitivityMappingPlugin = connect(
    createSelector([
        state => mapLayoutValuesSelector(state, { height: true }),
        state => state?.controls?.sensitivityMapping?.enabled,
        state => state?.security.user.info.groups,
        state => state?.locale?.messages,
        state => state?.sensitivityMapping
    ], (style, enabled, userGroups, messages, sensitivityMappingStore) => ({
        style,
        enabled,
        userGroups,
        messages,
        sensitivityMappingStore
    })), {
        onClose: setControlProperty.bind(null, 'sensitivityMapping', 'enabled', false),
        onSelectPrintApplication: setPrintApplication,
        onUpdatePrintProperty: updatePrintProperty,
        onCreatePrintConfig: createPrintConfig
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

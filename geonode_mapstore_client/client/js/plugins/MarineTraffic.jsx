import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { Glyphicon } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShip, faXmark, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import Flag from 'react-world-flags';
import moment from 'moment';

import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import GNButton from '@mapstore/framework/components/layout/Button';
import Message from '@mapstore/framework/components/I18N/Message';
import Spinner from '@mapstore/framework/components/layout/Spinner';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';

import MarineTrafficEpics from '@js/epics/marinetraffic';
import marineTraffic from '@js/reducers/marinetraffic';
import {
    addLayerToMap,
    extractHistory,
    searchVessel,
    clearSelection
} from '@js/actions/marinetraffic';
import {
    enabledSelector,
    aisDataSelector,
    selectedFeaturesSelector,
    selectedFeatureSelector,
    trackHistorySelector,
    loadingSelector,
    selectedFeatureIndexSelector
} from '@js/selectors/marinetraffic';
import { findVesselSymbol } from '@js/utils/MarineTrafficUtils';

import MarineTrafficInfo from '@js/components/MarineTrafficInformation/MarineTrafficInfo';
import MarineTrafficSearch from '@js/components/MarineTrafficInformation/MarineTrafficSearch';

// ─── Sub-components ───────────────────────────────────────────────────────────

const Button = tooltip(GNButton);

/**
 * Prev / Next navigation buttons shown when multiple vessels are in the selection.
 */
function VesselNavigationButton({
    selectedFeatureIndex,
    selectedFeatures,
    onSelectPrevious,
    onSelectNext
}) {
    const isFirst = selectedFeatureIndex <= 0;
    const isLast = selectedFeatureIndex >= selectedFeatures.length - 1;

    return (
        <div className="marine-traffic-vessel-navbar">
            <Button
                className="marine-traffic-vessel-navbar-button"
                tooltipId={<Message msgId="marineTraffic.previousVesselTooltip" />}
                disabled={isFirst}
                onClick={() => !isFirst && onSelectPrevious(selectedFeatures[selectedFeatureIndex - 1])}
            >
                <FontAwesomeIcon icon={faAngleLeft} />
            </Button>
            <span className="marine-traffic-vessel-navbar-text">
                <Message
                    msgId="marineTraffic.navBarText"
                    msgParams={{ index: selectedFeatureIndex + 1, length: selectedFeatures.length }}
                />
            </span>
            <Button
                className="marine-traffic-vessel-navbar-button"
                tooltipId={<Message msgId="marineTraffic.nextVesselTooltip" />}
                disabled={isLast}
                onClick={() => !isLast && onSelectNext(selectedFeatures[selectedFeatureIndex + 1])}
            >
                <FontAwesomeIcon icon={faAngleRight} />
            </Button>
        </div>
    );
}

VesselNavigationButton.propTypes = {
    selectedFeatureIndex: PropTypes.number.isRequired,
    selectedFeatures: PropTypes.array.isRequired,
    onSelectPrevious: PropTypes.func.isRequired,
    onSelectNext: PropTypes.func.isRequired
};

/**
 * Connected navigation button — pulls index and features from Redux,
 * and dispatches marineTrafficSelectedFeature directly (no intermediate action needed).
 */
const ConnectedVesselNavigationButton = connect(
    createSelector(
        [selectedFeatureIndexSelector, selectedFeaturesSelector],
        (selectedFeatureIndex, selectedFeatures) => ({ selectedFeatureIndex, selectedFeatures })
    ),
    (dispatch) => ({
        // Dispatch marineTrafficSelectedFeature directly — no need for
        // intermediate SELECT_PREVIOUS / SELECT_NEXT actions
        onSelectPrevious: (feature) =>
            dispatch({ type: 'MARINETRAFFIC:MARINE_TRAFFIC_SELECTED_FEATURE', selectedFeature: feature }),
        onSelectNext: (feature) =>
            dispatch({ type: 'MARINETRAFFIC:MARINE_TRAFFIC_SELECTED_FEATURE', selectedFeature: feature })
    })
)(VesselNavigationButton);

// ─── Main panel component ─────────────────────────────────────────────────────

function MarineTraffic({
    style,
    aisData,
    selectedFeatures,
    selectedFeature,
    trackHistory,
    loading,
    tabs,
    onClose,
    onSearchVessel,
    onExtractHistory,
    onAddLayerToMap,
    onClearSelection
}) {
    return (
        <div className="marine-traffic" style={style}>
            {/* Header */}
            <div className="marine-traffic-head">
                <div className="marine-traffic-title">
                    <Message msgId="marineTraffic.title" />
                </div>
                <Button
                    className="ms-close square-button-md _border-transparent btn btn-default"
                    onClick={onClose}
                >
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>

            {/* Body */}
            <div className="marine-traffic-body">
                <div className="marine-traffic-body-content">
                    {loading && (
                        <div className="marine-traffic-spinner-container">
                            <Spinner />
                        </div>
                    )}

                    {aisData && (
                        <MarineTrafficSearch
                            aisData={aisData.features}
                            onSearchVessel={onSearchVessel}
                        />
                    )}

                    {selectedFeatures && selectedFeature && (
                        <div>
                            <ConnectedVesselNavigationButton />

                            {/* Vessel identity row */}
                            <div className="marine-traffic-vessel-name-container">
                                <div className="marine-traffic-vessel-name">
                                    <Flag code={selectedFeature.properties.flag} height="28" />
                                    <span className="marine-traffic-vessel-name-text">
                                        {selectedFeature.properties.identity_name}
                                    </span>
                                    <span className="marine-traffic-vessel-name-type">
                                        <img
                                            src={findVesselSymbol(selectedFeature.properties.registered_category)}
                                            height="28"
                                            alt={selectedFeature.properties.registered_category}
                                        />
                                    </span>
                                </div>
                                <Button
                                    className="marine-traffic-vessel-navbar-button"
                                    tooltipId={<Message msgId="marineTraffic.clearResultTooltip" />}
                                    onClick={onClearSelection}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </Button>
                            </div>

                            {/* Latest position timestamp */}
                            <span className="marine-traffic-latest-position-text">
                                <Message
                                    msgId="marineTraffic.latestPosition"
                                    msgParams={{
                                        currentTime: moment(
                                            selectedFeature.properties.report_date_time
                                        ).format('YYYY-MM-DD HH:mm'),
                                        elapsedTime: Math.floor(
                                            (Date.now() -
                                                new Date(selectedFeature.properties.report_date_time)) /
                                                60_000
                                        )
                                    }}
                                />
                            </span>

                            <MarineTrafficInfo
                                properties={selectedFeature.properties}
                                tabs={tabs}
                                trackHistory={trackHistory}
                                onExtractHistory={onExtractHistory}
                                onAddLayerToMap={onAddLayerToMap}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

MarineTraffic.propTypes = {
    style: PropTypes.object,
    aisData: PropTypes.object,
    selectedFeatures: PropTypes.array,
    selectedFeature: PropTypes.object,
    trackHistory: PropTypes.object,
    loading: PropTypes.bool,
    tabs: PropTypes.array,
    onClose: PropTypes.func,
    onSearchVessel: PropTypes.func,
    onExtractHistory: PropTypes.func,
    onAddLayerToMap: PropTypes.func,
    onClearSelection: PropTypes.func
};

MarineTraffic.defaultProps = {
    style: {},
    aisData: null,
    selectedFeatures: null,
    selectedFeature: null,
    trackHistory: null,
    loading: false,
    tabs: [],
    onClose: () => {},
    onSearchVessel: () => {},
    onExtractHistory: () => {},
    onAddLayerToMap: () => {},
    onClearSelection: () => {}
};

// ─── Plugin wrapper ───────────────────────────────────────────────────────────

function MarineTrafficPlugin({ enabled, ...props }) {
    return enabled ? <MarineTraffic {...props} /> : null;
}

MarineTrafficPlugin.propTypes = {
    enabled: PropTypes.bool
};

MarineTrafficPlugin.defaultProps = {
    enabled: false
};

const ConnectedMarineTrafficPlugin = connect(
    createSelector(
        [
            (state) => mapLayoutValuesSelector(state, { height: true }),
            enabledSelector,
            aisDataSelector,
            selectedFeaturesSelector,
            selectedFeatureSelector,
            trackHistorySelector,
            loadingSelector
        ],
        (style, enabled, aisData, selectedFeatures, selectedFeature, trackHistory, loading) => ({
            style,
            enabled,
            aisData,
            selectedFeatures,
            selectedFeature,
            trackHistory,
            loading
        })
    ),
    {
        onClose: setControlProperty.bind(null, 'marineTraffic', 'enabled', false),
        onSearchVessel: searchVessel,
        onExtractHistory: extractHistory,
        onAddLayerToMap: addLayerToMap,
        onClearSelection: clearSelection
    }
)(MarineTrafficPlugin);

// ─── Plugin descriptor ────────────────────────────────────────────────────────

export default createPlugin('MarineTraffic', {
    component: ConnectedMarineTrafficPlugin,
    containers: {
        SidebarMenu: {
            name: 'MarineTraffic',
            position: 15,
            tooltip: 'marineTraffic.title',
            icon: <FontAwesomeIcon icon={faShip} size="xl" />,
            // Use boolean true so openMarineTrafficPluginEpic filter matches correctly
            action: setControlProperty.bind(null, 'marineTraffic', 'enabled', true),
            doNotHide: true,
            priority: 2
        }
    },
    epics: MarineTrafficEpics,
    reducers: { marineTraffic }
});
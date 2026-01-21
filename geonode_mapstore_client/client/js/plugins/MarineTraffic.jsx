import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { Glyphicon } from 'react-bootstrap';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import GNButton from '@mapstore/framework/components/layout/Button';
import { createSelector } from 'reselect';
import Message from '@mapstore/framework/components/I18N/Message';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';

import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShip, faXmark, faAngleLeft, faAngleRight  } from '@fortawesome/free-solid-svg-icons';
import MarineTrafficEpics from '@js/epics/marinetraffic';
import marineTraffic from '@js/reducers/marinetraffic';
import { addLayerToMap, extractHistory, searchVessel, selectPreviousVessel, selectNextVessel, clearSelection } from '@js/actions/marinetraffic';
import MarineTrafficInfo from '@js/components/MarineTrafficInformation/MarineTrafficInfo';
import MarineTrafficSearch from '@js/components/MarineTrafficInformation/MarineTrafficSearch';
import Flag from 'react-world-flags';
import Spinner from '@mapstore/framework/components/layout/Spinner';

const Button = tooltip(GNButton);

function VesselNavigationButton({
    selectedFeature,
    selectedFeatures,
    nextVessel,
    previousVessel
}) {
    const selectedFeatureIndex = selectedFeatures.findIndex((x) => x.properties.identity_id === selectedFeature.properties.identity_id);

    return (
        <div className="marine-traffic-vessel-navbar">
            <Button
                className="marine-traffic-vessel-navbar-button"
                tooltipId={<Message msgId={`marineTraffic.previousVesselTooltip`} />}
                disabled={selectedFeatureIndex === 0 ? true : false}
                onClick={() => { previousVessel(selectedFeatures[selectedFeatureIndex - 1]); }}
            >
                <FontAwesomeIcon icon={faAngleLeft} />
            </Button>
            <span className="marine-traffic-vessel-navbar-text">
                <Message
                    msgId="marineTraffic.navBarText"
                    msgParams={
                        {
                            index: selectedFeatureIndex + 1,
                            length: selectedFeatures.length
                        }
                    }
                />
            </span>
            <Button
                className="marine-traffic-vessel-navbar-button"
                tooltipId={<Message msgId={`marineTraffic.nextVesselTooltip`} />}
                disabled={selectedFeatureIndex === selectedFeatures.length - 1 ? true : false}
                onClick={() => { nextVessel(selectedFeatures[selectedFeatureIndex + 1]); }}
            >
                <FontAwesomeIcon icon={faAngleRight} />
            </Button>
        </div>
    );
}

const ConnectedVesselNavigationButton = connect(
    createSelector([
        state => state?.marineTraffic?.selectedFeature,
        state => state?.marineTraffic?.selectedFeatures
    ], (selectedFeature, selectedFeatures) => ({
        selectedFeature,
        selectedFeatures
    })),
    {
        nextVessel: selectNextVessel,
        previousVessel: selectPreviousVessel
    }
)((VesselNavigationButton));

/**
* @module MarineTraffic
*/

/**
 * render a panel for detail information about a resource inside the viewer pages
 * @name MarineTraffic
 * @prop {array} tabs list of attributes organized by categories for the AIS.
 * @example
 */

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
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const findSymbol = registeredCategory => {
        if (registeredCategory === "BULK CARRIERS") {
            return "../../../static/mapstore/img/marine_traffic_cargo.png";
        } else if (["FISHING", "FISHING INDUSTRY"].includes(registeredCategory)) {
            return "../../../static/mapstore/img/marine_traffic_fishing.png";
        } else if (registeredCategory === "DRY CARGO/PASSENGER") {
            return "../../../static/mapstore/img/marine_traffic_passenger.png";
        } else if (registeredCategory === "PLEASURE / LEISURE") {
            return "../../../static/mapstore/img/marine_traffic_pleasure.png";
        } else if (registeredCategory === "TANKERS") {
            return "../../../static/mapstore/img/marine_traffic_tankers.png";
        } else if (["INLAND WATERWAYS", "MISCELLANEOUS", "NAVAL", "OFFSHORE", "RESCUE", "SERVICE VESSELS"].includes(registeredCategory)) {
            return "../../../static/mapstore/img/marine_traffic_special.png";
        }

        return "../../../static/mapstore/img/marine_traffic_other.png";

    };

    return (
        <div
            className="marine-traffic"
            style={style}
        >
            <div className="marine-traffic-head">
                <div className="marine-traffic-title">
                    <Message msgId="marineTraffic.title" />
                </div>
                <Button className="ms-close square-button-md _border-transparent btn btn-default" onClick={() => onClose()}>
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>
            <div className="marine-traffic-body">
                <div className="marine-traffic-body-content">
                    {loading &&
                        <div
                            className="marine-traffic-spinner-container">
                            <Spinner />
                        </div>
                    }
                    {aisData &&
                        <MarineTrafficSearch aisData={aisData.features} onSearchVessel={onSearchVessel}/>
                    }
                    {selectedFeatures && selectedFeature &&
                        <div>
                            <ConnectedVesselNavigationButton />
                            <div className="marine-traffic-vessel-name-container">
                                <div className="marine-traffic-vessel-name">
                                    <Flag code={selectedFeature.properties.flag} height="28" />
                                    <span className="marine-traffic-vessel-name-text">
                                        {selectedFeature.properties.identity_name}
                                    </span>
                                    <span className="marine-traffic-vessel-name-type">
                                        <img src={ findSymbol(selectedFeature.properties.registered_category) } height="28"/>
                                    </span>
                                </div>
                                <Button
                                    className="marine-traffic-vessel-navbar-button"
                                    tooltipId={<Message msgId="marineTraffic.clearResultTooltip" />}
                                    onClick={ () => onClearSelection() }
                                >
                                    <FontAwesomeIcon icon={faXmark} size="m" />
                                </Button>
                            </div>
                            <span className="marine-traffic-latest-position-text">
                                <Message
                                    msgId="marineTraffic.latestPosition"
                                    msgParams={
                                        {
                                            currentTime: moment(selectedFeature.properties.report_date_time).format("YYYY-MM-DD HH:mm"),
                                            elapsedTime: Math.floor((Date.now() - new Date(selectedFeature.properties.report_date_time)) / 60_000)
                                        }
                                    }
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
                    }
                </div>
            </div>
        </div>
    );
}

MarineTraffic.propTypes = {
    onClose: PropTypes.func,
    onSearchVessel: PropTypes.func,
    onExtractHistory: PropTypes.func,
    onAddLayerToMap: PropTypes.func,
    onClearSelection: PropTypes.func
};

MarineTraffic.defaultProps = {
    onClose: () => { },
    onSearchVessel: () => { },
    onExtractHistory: () => { },
    onAddLayerToMap: () => { },
    onClearSelection: () => { }
};

function MarineTrafficPlugin({ enabled, ...props }) {
    return enabled ? <MarineTraffic {...props} /> : null;
}

const ConnectedMarineTrafficPlugin = connect(
    createSelector([
        state => mapLayoutValuesSelector(state, { height: true }),
        state => state?.controls?.marineTraffic?.enabled,
        state => state?.marineTraffic?.aisData,
        state => state?.marineTraffic?.selectedFeatures,
        state => state?.marineTraffic?.selectedFeature,
        state => state?.marineTraffic?.trackHistory,
        state => state?.marineTraffic?.loading || false
    ], (style, enabled, aisData, selectedFeatures, selectedFeature, trackHistory, loading) => ({
        style,
        enabled,
        aisData,
        selectedFeatures,
        selectedFeature,
        trackHistory,
        loading
    })), {
        onClose: setControlProperty.bind(null, 'marineTraffic', 'enabled', false),
        onSearchVessel: searchVessel,
        onExtractHistory: extractHistory,
        onAddLayerToMap: addLayerToMap,
        onClearSelection: clearSelection
    }
)(MarineTrafficPlugin);

export default createPlugin('MarineTraffic', {
    component: ConnectedMarineTrafficPlugin,
    containers: {
        SidebarMenu: {
            name: "MarineTraffic",
            position: 15,
            tooltip: "marineTraffic.title",
            icon: <FontAwesomeIcon icon={faShip} size="xl" />,
            action: setControlProperty.bind(null, 'marineTraffic', 'enabled', 'true'),
            doNotHide: true,
            priority: 2
        }
    },
    epics: MarineTrafficEpics,
    reducers: {
        marineTraffic
    }
});

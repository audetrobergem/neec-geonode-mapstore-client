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
import Spinner from '@js/components/Spinner';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import MaritimeNetworkEpics from '@js/epics/maritimenetwork';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';
import { updateAdditionalLayer } from '@mapstore/framework/actions/additionallayers';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';

const Button = tooltip(GNButton);

/**
* @module ShorelineViewer
*/

/**
 * render a panel for detail information about a resource inside the viewer pages
 * @name MaritimeNetwork
 * @prop {array} regions list of regions where shoreline videos are available
 * @example
 */

function MaritimeNetwork({
    style,
    messages,
    onClose
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
                <div className="shoreline-viewer-title">
                    <Message msgId="maritimenetwork.maritimeNetworkTitle" />
                </div>
                <Button className="square-button" onClick={() => onClose()}>
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>
            <div className="shoreline-viewer-body">
                <p>sdfsdig</p>
            </div>

        </div>);
}

MaritimeNetwork.propTypes = {
    onClose: PropTypes.func
};

MaritimeNetwork.defaultProps = {
    onClose: () => { },
    addMarkers: () => { }
};

function MaritimeNetworkPlugin({ enabled, ...props }) {
    return enabled ? <MaritimeNetwork {...props} /> : null;
}

const ConnectedMaritimeNetworkPlugin = connect(
    createSelector([
        state => mapLayoutValuesSelector(state, { height: true }),
        state => state?.controls?.maritimeNetwork?.enabled,
        state => state?.locale?.messages
    ], (style, enabled, messages) => ({
        style,
        enabled,
        messages
    })), {
        onClose: setControlProperty.bind(null, 'maritimeNetwork', 'enabled', false)
    }
)(MaritimeNetworkPlugin);

const MaritimeNetworkButton = ({
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
            <Message msgId="maritimenewtork.maritimeNetwork" />
        </Button>
    );
};

const ConnectedMaritimeNetworkButton = connect(
    createSelector([], () => ({})),
    {
        onClick: setControlProperty.bind(null, 'maritimeNetwork', 'enabled', true)
    }
)((MaritimeNetworkButton));

export default createPlugin('MaritimeNetwork', {
    component: ConnectedMaritimeNetworkPlugin,
    containers: {
        Toolbar: {
            name: "MaritimeNetwork",
            position: 10000,
            tooltip: <Message msgId="maritimeNewtork.maritimeNetworkTitle"/>,
            icon: <FaIcon name="ship" />,
            // Component: ConnectedMaritimeNetworkButton
            action: setControlProperty.bind(null, 'maritimeNetwork', 'enabled', true)
        }
    },
    epics: MaritimeNetworkEpics,
    reducers: {
    }
});

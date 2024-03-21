/*
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import React from 'react';
import { Glyphicon } from 'react-bootstrap';
import { connect } from 'react-redux';
import { ActionCreators } from 'redux-undo';

import RedoButtonComp from '@mapstore/framework/components/mapcontrols/navigationhistory/RedoButton';
import Message from '@mapstore/framework/plugins/locale/Message';

const {redo} = ActionCreators;
/**
 * Renders a "redo" button in the {@link #plugins.Toolbar|Toolbar} to go forward in
 * map navigation history.
 * @name Redo
 * @class
 * @memberof plugins
 */
const RedoButton = connect((state) => {
    let mapHistory = state.map && state.map.past && {past: state.map.past, future: state.map.future} || {past: [], future: []};
    return {
        disabled: mapHistory.future.length > 0 ? false : true
    };
}, {
    onClick: redo
})(RedoButtonComp);

export default {
    RedoPlugin: assign(RedoButton, {
        Toolbar: {
            name: 'redo',
            position: 6,
            tool: true,
            tooltip: "history.redoBtnTooltip",
            icon: <Glyphicon glyph="step-forward"/>,
            help: <Message msgId="helptexts.historyredo"/>,
            priority: 1
        }
    }),
    reducers: {}
};

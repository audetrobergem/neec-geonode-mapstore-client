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

import UndoButtonComp from '@mapstore/framework/components/mapcontrols/navigationhistory/UndoButton';
import Message from '@mapstore/framework/plugins/locale/Message';

const {undo} = ActionCreators;
/**
 * Renders a "undo" button in the {@link #plugins.Toolbar|Toolbar} to get back in
 * map navigation history.
 * @name Undo
 * @class
 * @memberof plugins
 */
const UndoButton = connect((state) => {
    let mapHistory = state.map && state.map.past && {past: state.map.past, future: state.map.future} || {past: [], future: []};
    return {
        disabled: mapHistory.past.length > 0 ? false : true
    };
}, {
    onClick: undo
})(UndoButtonComp);

export default {
    UndoPlugin: assign(UndoButton, {
        Toolbar: {
            name: 'undo',
            position: 5,
            tool: true,
            tooltip: "history.undoBtnTooltip",
            icon: <Glyphicon glyph="step-backward"/>,
            help: <Message msgId="helptexts.historyundo"/>,
            priority: 1
        }
    }),
    reducers: {}
};

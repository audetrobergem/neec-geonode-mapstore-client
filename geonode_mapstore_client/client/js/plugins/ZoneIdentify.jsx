import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { Glyphicon } from 'react-bootstrap';
import { DropdownList } from 'react-widgets';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import GNButton from '@mapstore/framework/components/layout/Button';
import { createSelector } from 'reselect';
import Message from '@mapstore/framework/components/I18N/Message';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import ZoneIdentifyEpics from '@js/epics/zoneidentify';
import zoneIdentify from '@js/reducers/zoneidentify';
import { changeDrawingStatus } from '@mapstore/framework/actions/draw';
import {
    selectLayer,
    highlightSelectedFeature,
    zoomToSelectedFeature,
    addLayerToMap
} from '@js/actions/zoneidentify';
import Spinner from '@mapstore/framework/components/layout/Spinner';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';
import {
    enabledSelector,
    zoneIdentifyStyleSelector,
    zoneIdentifyFormattedFeaturesSelector,
    zoneIdentifyLoadingSelector,
    zoneIdentifyCurrentLanguageSelector,
    zoneIdentifyMessagesSelector,
    zoneIdentifyVisibleWmsLayersSelector
} from '@js/selectors/zoneidentify';

const Button = tooltip(GNButton);

// ---------------------------------------------------------------------------
// DrawingButton
// ---------------------------------------------------------------------------

function DrawingButton({ extent, selectedFeatures, onChangeDrawingStatus, onAddLayerToMap }) {
    return (
        <div className="zone-identify-menu-buttons">
            <Button
                className="btn-primary"
                tooltipId={<Message msgId="zoneIdentify.drawPolygon" />}
                onClick={() =>
                    onChangeDrawingStatus("start", "BBOX", "zoneIdentify", [], {
                        stopAfterDrawing: true
                    })
                }
            >
                <Glyphicon glyph="polygon-plus" />
            </Button>
            <Button
                className="btn-primary"
                tooltipId={<Message msgId="zoneIdentify.removePolygon" />}
                disabled={selectedFeatures === null}
                onClick={() =>
                    onChangeDrawingStatus("clean", "", "zoneIdentify", [], {})
                }
            >
                <Glyphicon glyph="polygon-trash" />
            </Button>
            <Button
                className="btn-primary"
                tooltipId={<Message msgId="zoneIdentify.addLayer" />}
                disabled={selectedFeatures === null || !extent}
                onClick={() => onAddLayerToMap(extent)}
            >
                <Glyphicon glyph="add-layer" />
            </Button>
        </div>
    );
}

DrawingButton.propTypes = {
    extent: PropTypes.object,
    selectedFeatures: PropTypes.array,
    onChangeDrawingStatus: PropTypes.func,
    onAddLayerToMap: PropTypes.func
};

const ConnectedDrawingButton = connect(
    createSelector(
        (state) => state?.draw?.features?.[0],
        (state) => state?.zoneIdentify?.selectedFeatures,
        (extent, selectedFeatures) => ({ extent, selectedFeatures })
    ),
    {
        onChangeDrawingStatus: changeDrawingStatus,
        onAddLayerToMap: addLayerToMap
    }
)(DrawingButton);

// ---------------------------------------------------------------------------
// AttributeTable
// ---------------------------------------------------------------------------

const AttributeTable = ({ data }) => {
    const rows = Object.entries(data.properties);
    return (
        <div className="zone-identify-attribute-table">
            <div className="zone-identify-info-table">
                <div className="zone-identify-info-fields">
                    {rows.map(([key, value]) => (
                        <div key={key} className="zone-identify-info-row">
                            <div className="zone-identify-info-label">{key}</div>
                            <div className="zone-identify-info-value">
                                {value !== null && value !== undefined
                                    ? String(value)
                                    : '—'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

AttributeTable.propTypes = {
    data: PropTypes.shape({
        properties: PropTypes.object.isRequired
    }).isRequired
};

// ---------------------------------------------------------------------------
// TreeNode
// ---------------------------------------------------------------------------

function TreeNode({
    node,
    language,
    onHighlightSelectedFeature,
    onZoomToSelectedFeature
}) {
    const [isOpen, setIsOpen] = useState(false);

    const nodeTitle =
        node.title && typeof node.title === 'object'
            ? node.title[language] ?? node.title['en'] ?? ''
            : node.title ?? '';

    return (
        <div className="zone-identify-tree-node">
            {/* Title row — always rendered, always a single line */}
            <div className="zone-identify-tree-node-header">
                <Button
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="zone-identify-toggle-icon"
                    tooltipId={<Message msgId="zoneIdentify.expandFeature" />}
                >
                    <Glyphicon glyph={isOpen ? "bottom" : "next"} />
                </Button>

                <span className="zone-identify-layer-title">{nodeTitle}</span>

                {/* Navigation buttons only on leaf nodes (features, not layer groups) */}
                {!node.children && (
                    <div className="zone-identify-navigation-buttons">
                        <Button
                            onClick={() => onHighlightSelectedFeature(node.geometry)}
                            className="zone-identify-navigation-icon"
                            tooltipId={<Message msgId="zoneIdentify.highlightFeature" />}
                        >
                            <Glyphicon glyph="map-filter" />
                        </Button>
                        <Button
                            onClick={() => onZoomToSelectedFeature(node.geometry)}
                            className="zone-identify-navigation-icon"
                            tooltipId={<Message msgId="zoneIdentify.zoomToFeature" />}
                        >
                            <Glyphicon glyph="zoom-to" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Expanded content — rendered below the header row, never affects it */}
            {isOpen && (
                <div className="zone-identify-tree-node-content">
                    {node.children
                        ? <TreeView data={node.children} language={language} />
                        : <AttributeTable data={node} />
                    }
                </div>
            )}
        </div>
    );
}

TreeNode.propTypes = {
    node: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        geometry: PropTypes.object,
        properties: PropTypes.object,
        children: PropTypes.array
    }).isRequired,
    language: PropTypes.string,
    onHighlightSelectedFeature: PropTypes.func,
    onZoomToSelectedFeature: PropTypes.func
};

TreeNode.defaultProps = {
    language: 'en',
    onHighlightSelectedFeature: () => {},
    onZoomToSelectedFeature: () => {}
};

// Connect only the action dispatchers — no state mapping needed here
const ConnectedTreeNode = connect(null, {
    onHighlightSelectedFeature: highlightSelectedFeature,
    onZoomToSelectedFeature: zoomToSelectedFeature
})(TreeNode);

// ---------------------------------------------------------------------------
// TreeView
// ---------------------------------------------------------------------------

const TreeView = ({ data, language }) => (
    <div className="zone-identify-tree-view">
        {data.map((node) => (
            <ConnectedTreeNode key={node.id} node={node} language={language} />
        ))}
    </div>
);

TreeView.propTypes = {
    data: PropTypes.array.isRequired,
    language: PropTypes.string
};

TreeView.defaultProps = {
    language: 'en'
};

// ---------------------------------------------------------------------------
// ZoneIdentify (main panel)
// ---------------------------------------------------------------------------

function ZoneIdentify({
    style,
    formattedFeatures,
    layers,
    loading,
    currentLanguage,
    messages,
    onClose,
    onSelectLayer
}) {
    const lang = (currentLanguage ?? 'en').slice(0, 2);

    // Build dropdown items: first entry is always "all visible layers"
    const visibleLayerItems = layers.map((layer) => ({
        layerName: layer.name,
        layerTitle:
            typeof layer.title === 'object'
                ? layer.title[lang] ?? layer.title['en'] ?? layer.name
                : layer.title ?? layer.name
    }));

    const dropdownItems = [
        {
            layerName: "visible_layers",
            layerTitle: getMessageById(messages, "zoneIdentify.visibleLayers")
        },
        ...visibleLayerItems
    ];

    return (
        <div className="zone-identify" style={style}>
            <div className="zone-identify-head">
                <div className="zone-identify-title">
                    <Message msgId="zoneIdentify.title" />
                </div>
                <Button
                    className="ms-close square-button-md _border-transparent btn btn-default"
                    onClick={onClose}
                >
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>

            <div className="zone-identify-body">
                <div className="zone-identify-menu">
                    <DropdownList
                        className="zone-identify-menu-dropdown"
                        defaultValue={dropdownItems[0]}
                        onChange={(value) => onSelectLayer(value.layerName)}
                        data={dropdownItems}
                        textField="layerTitle"
                        valueField="layerName"
                    />
                    <ConnectedDrawingButton />
                </div>

                <div className="zone-identify-body-content">
                    {loading && (
                        <div className="zone-identify-spinner-container">
                            <Spinner />
                        </div>
                    )}
                    {formattedFeatures && (
                        <TreeView data={formattedFeatures} language={lang} />
                    )}
                </div>
            </div>
        </div>
    );
}

ZoneIdentify.propTypes = {
    style: PropTypes.object,
    formattedFeatures: PropTypes.array,
    layers: PropTypes.array,
    loading: PropTypes.bool,
    currentLanguage: PropTypes.string,
    messages: PropTypes.object,
    onClose: PropTypes.func,
    onSelectLayer: PropTypes.func
};

ZoneIdentify.defaultProps = {
    style: {},
    formattedFeatures: null,
    layers: [],
    loading: false,
    currentLanguage: 'en',
    messages: {},
    onClose: () => {},
    onSelectLayer: () => {}
};

// ---------------------------------------------------------------------------
// ZoneIdentifyPlugin (gate component)
// ---------------------------------------------------------------------------

function ZoneIdentifyPlugin({ enabled, ...props }) {
    return enabled ? <ZoneIdentify {...props} /> : null;
}

ZoneIdentifyPlugin.propTypes = {
    enabled: PropTypes.bool
};

ZoneIdentifyPlugin.defaultProps = {
    enabled: false
};

const ConnectedZoneIdentifyPlugin = connect(
    createSelector(
        zoneIdentifyStyleSelector,
        enabledSelector,
        zoneIdentifyFormattedFeaturesSelector,
        zoneIdentifyVisibleWmsLayersSelector,
        zoneIdentifyLoadingSelector,
        zoneIdentifyCurrentLanguageSelector,
        zoneIdentifyMessagesSelector,
        (style, enabled, formattedFeatures, layers, loading, currentLanguage, messages) => ({
            style,
            enabled,
            formattedFeatures,
            layers,
            loading,
            currentLanguage,
            messages
        })
    ),
    {
        onClose: setControlProperty.bind(null, 'zoneIdentify', 'enabled', false),
        onSelectLayer: selectLayer
    }
)(ZoneIdentifyPlugin);

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export default createPlugin('ZoneIdentify', {
    component: ConnectedZoneIdentifyPlugin,
    containers: {
        SidebarMenu: {
            name: "ZoneIdentify",
            position: 15,
            tooltip: "zoneIdentify.title",
            icon: <Glyphicon glyph="layer-info" />,
            action: setControlProperty.bind(null, 'zoneIdentify', 'enabled', 'true'),
            doNotHide: true,
            priority: 2
        }
    },
    epics: ZoneIdentifyEpics,
    reducers: {
        zoneIdentify
    }
});
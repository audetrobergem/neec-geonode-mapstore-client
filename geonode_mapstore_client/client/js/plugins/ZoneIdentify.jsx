import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { Glyphicon } from 'react-bootstrap';
import { DropdownList } from 'react-widgets';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import GNButton from '@js/components/Button';
import { createSelector } from 'reselect';
import Message from '@mapstore/framework/components/I18N/Message';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import { mapLayoutValuesSelector } from '@mapstore/framework/selectors/maplayout';
import ZoneIdentifyEpics from '@js/epics/zoneidentify';
import zoneIdentify from '@js/reducers/zoneidentify';
import { changeDrawingStatus } from '@mapstore/framework/actions/draw';
import { selectLayer, highlightSelectedFeature, zoomToSelectedFeature, addLayerToMap } from '@js/actions/zoneidentify';
import Spinner from '@js/components/Spinner';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';

const Button = tooltip(GNButton);

function DrawingButton({
    extent,
    selectedFeatures,
    onchangeDrawingStatus,
    onAddLayerToMap
}) {

    return (
        <div className="zone-identify-menu-buttons">
            <Button
                className="btn-primary"
                tooltipId={<Message msgId="zoneIdentify.drawPolygon" />}
                onClick={() => {onchangeDrawingStatus("start", "BBOX", "zoneIdentify", [], { stopAfterDrawing: true });}}
            >
                <Glyphicon glyph="polygon-plus" />
            </Button>
            <Button
                className="btn-primary"
                tooltipId={<Message msgId="zoneIdentify.removePolygon" />}
                disabled={selectedFeatures === null}
                onClick={() => {onchangeDrawingStatus("clean", "", "zoneIdentify", [], {});}}
            >
                <Glyphicon glyph="polygon-trash" />
            </Button>
            <Button
                className="btn-primary"
                tooltipId={<Message msgId="zoneIdentify.addLayer" />}
                disabled={selectedFeatures === null}
                onClick={() => {onAddLayerToMap(extent);}}
            >
                <Glyphicon glyph="add-layer" />
            </Button>
        </div>
    );
}

const ConnectedDrawingButton = connect(
    createSelector([
        state => state?.draw?.features[0],
        state => state?.zoneIdentify?.selectedFeatures
    ], (extent, selectedFeatures) => ({
        extent,
        selectedFeatures
    })),
    {
        onchangeDrawingStatus: changeDrawingStatus,
        onAddLayerToMap: addLayerToMap
    }
)((DrawingButton));


const TreeNode = ({
    node,
    onHighlightSelectedFeature,
    onZoomToSelectedFeature
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleNode = () => setIsOpen(!isOpen);

    return (
        <div className="zone-identify-tree-node">
            <Button
                onClick={toggleNode}
                className="zone-identify-toggle-icon"
                tooltipId={<Message msgId="zoneIdentify.expandFeature" />}
            >
                <Glyphicon glyph={isOpen ? "bottom" : 'next'} />
            </Button>
            <span className="zone-identify-layer-title">{node.title}</span>
            {node.children == null &&
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
            }
            {node.children && isOpen && <TreeView data={node?.children} />}
            {node.children == null && isOpen && <AttributeTable data={node} />}
        </div>
    );
};

const ConnectedTreeNode = connect(
    createSelector([
    ], () => ({
    })),
    {
        onHighlightSelectedFeature: highlightSelectedFeature,
        onZoomToSelectedFeature: zoomToSelectedFeature
    }
)((TreeNode));

const TreeView = ({ data }) => {
    return (
        <div className="zone-identify-tree-view">
            {data.map((node) => (
                <ConnectedTreeNode key={node.id} node={node} />
            ))}
        </div>
    );
};

const AttributeTable = ({ data }) => {
    const rows = Object.entries(data.properties);
    return (
        <div className="zone-identify-attribute-table">
            <div className="zone-identify-info-table">
                <div className="zone-identify-info-fields">
                    {
                        rows.map((row) => {
                            return (
                                <div className="zone-identify-info-row">
                                    <div className="zone-identify-info-label">{row[0]}</div>
                                    <div className="zone-identify-info-value">{row[1]}</div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </div>
    );
};

/**
* @module ZoneIdentify
*/

/**
 * render a panel for detail information about a resource inside the viewer pages
 * @name ZoneIdentify
 * @prop {array} regions list of regions where shoreline videos are available
 * @example
 */

function ZoneIdentify({
    style,
    formattedFeatures,
    layers,
    loading,
    messages,
    onClose,
    onSelectLayer
}) {
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const layerList = layers.filter((layer) => 
        layer.visibility === true && 
        layer.type === "wms" && 
        layer.group !== "background" &&
        layer.name.includes("neec_geodb") &&
        layer.loadingError !== "Error"
    );
    const dropdownItems = [
        {
            layerName: "visible_layers",
            layerTitle: getMessageById(messages, "zoneIdentify.visibleLayers")
        }
    ];
    layerList.forEach((layer) => {
        dropdownItems.push({
            layerName: layer.name,
            layerTitle: layer.title
        });
    });

    return (
        <div
            className="zone-identify"
            style={style}
        >
            <div className="zone-identify-head">
                <div className="zone-identify-title">
                    <Message msgId="zoneIdentify.title" />
                </div>
                <Button className="square-button" onClick={() => onClose()}>
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>
            <div className="zone-identify-body">
                <div className="zone-identify-menu">
                    <DropdownList
                        className="zone-identify-menu-dropdown"
                        defaultValue="visible_layers"
                        onChange={(value) => {
                            onSelectLayer(value.layerName);
                        }}
                        data={dropdownItems}
                        textField="layerTitle"
                        valueField="layerName"
                    />
                    <ConnectedDrawingButton />
                </div>
                <div className="zone-identify-body-content">
                    {loading && <div
                        className="zone-identify-spinner-container">
                        <Spinner />
                    </div>}
                    {formattedFeatures &&
                        <TreeView data={formattedFeatures} />
                    }
                </div>
            </div>
        </div>
    );
}

ZoneIdentify.propTypes = {
    onClose: PropTypes.func,
    onSelectLayer: PropTypes.func
};

ZoneIdentify.defaultProps = {
    onClose: () => { },
    onSelectLayer: () => { }
};

function ZoneIdentifyPlugin({ enabled, ...props }) {
    return enabled ? <ZoneIdentify {...props} /> : null;
}

const ConnectedZoneIdentifyPlugin = connect(
    createSelector([
        state => mapLayoutValuesSelector(state, { height: true }),
        state => state?.controls?.zoneIdentify?.enabled,
        state => state?.zoneIdentify?.formattedFeatures,
        state => state?.layers?.flat,
        state => state?.zoneIdentify?.loading || false,
        state => state?.locale?.messages
    ], (style, enabled, formattedFeatures, layers, loading, messages) => ({
        style,
        enabled,
        formattedFeatures,
        layers,
        loading,
        messages
    })), {
        onClose: setControlProperty.bind(null, 'zoneIdentify', 'enabled', false),
        onSelectLayer: selectLayer
    }
)(ZoneIdentifyPlugin);

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

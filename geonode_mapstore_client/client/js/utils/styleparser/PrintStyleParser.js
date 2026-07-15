/*
 * Copyright 2023, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { flatten } from 'lodash';
import turfFlatten from '@turf/flatten';
import {
    resolveAttributeTemplate,
    geoStylerStyleFilter,
    drawWellKnownNameImageFromSymbolizer,
    parseSymbolizerExpressions,
    getCachedImageById
} from '@mapstore/framework/utils/styleparser/StyleParserUtils';
import { drawIcons } from '@mapstore/framework/utils/styleparser/IconUtils';

const anchorToGraphicOffset = (anchor, width, height) => {
    switch (anchor) {
    case 'top-left':
        return [0, 0];
    case 'top':
        return [-(width / 2), 0];
    case 'top-right':
        return [-width, 0];
    case 'left':
        return [0, -(height / 2)];
    case 'center':
        return [-(width / 2), -(height / 2)];
    case 'right':
        return [-width, -(height / 2)];
    case 'bottom-left':
        return [0, -height];
    case 'bottom':
        return [-(width / 2), -height];
    case 'bottom-right':
        return [-width, -height];
    default:
        return [-(width / 2), -(height / 2)];
    }
};

const anchorToLabelAlign = (anchor) => {
    switch (anchor) {
    case 'top-left':
        return 'lt';
    case 'top':
        return 'ct';
    case 'top-right':
        return 'rt';
    case 'left':
        return 'lm';
    case 'center':
        return 'cm';
    case 'right':
        return 'rm';
    case 'bottom-left':
        return 'lb';
    case 'bottom':
        return 'cb';
    case 'bottom-right':
        return 'rb';
    default:
        return 'cm';
    }
};

/**
 * This function converts vector layer symbols from MapStore format to Mapfish Print format.
 * Note: This is a modified version of MapStore's symbolizerToPrintMSStyle function:
 * MapStore2/web/client/utils/styleparser/PrintStyleParser.js
 * @param {object} symbolizer
 * @param {object} feature
 * @param {object} layer
 * @param {object} originalSymbolizer
 * @returns {object}
 */
const symbolizerToPrintMSStyle = (symbolizer, feature, layer, originalSymbolizer) => {
    const globalOpacity = layer.opacity === undefined ? 1 : layer.opacity;
    if (symbolizer.kind === 'Mark') {
        const { width, height, canvas }  = drawWellKnownNameImageFromSymbolizer(symbolizer);
        return {
            graphicWidth: width,
            graphicHeight: height,
            externalGraphic: canvas.toDataURL(),
            graphicXOffset: -width / 2,
            graphicYOffset: -height / 2,
            rotation: symbolizer.rotate || 0,
            graphicOpacity: globalOpacity
        };
    }
    if (symbolizer.kind === 'Icon') {
        const { width = symbolizer.size, height = symbolizer.size }  = getCachedImageById(originalSymbolizer);
        const aspect = width / height;
        let iconSizeW = symbolizer.size;
        let iconSizeH = iconSizeW / aspect;
        if (height > width) {
            iconSizeH = symbolizer.size;
            iconSizeW = iconSizeH * aspect;
        }
        const [graphicXOffset, graphicYOffset] = anchorToGraphicOffset(symbolizer.anchor, iconSizeW, iconSizeH);
        return {
            graphicWidth: iconSizeW,
            graphicHeight: iconSizeH,
            externalGraphic: symbolizer.image,
            graphicXOffset,
            graphicYOffset,
            rotation: symbolizer.rotate || 0,
            graphicOpacity: symbolizer.opacity * globalOpacity
        };
    }
    if (symbolizer.kind === 'Text') {
        return {
            fontColor: symbolizer.color,
            fontFamily: (symbolizer.font || ['TIMES_ROMAN'])[0],
            fontSize: symbolizer.size - 3,
            fontStyle: symbolizer.fontStyle,
            fontWeight: symbolizer.fontWeight,
            label: resolveAttributeTemplate(feature, symbolizer.label, ''),
            labelAlign: anchorToLabelAlign(symbolizer.anchor),
            labelRotation: -(symbolizer.rotate || 0),
            labelXOffset: symbolizer?.offset?.[0] || 0,
            labelYOffset: -(symbolizer?.offset?.[1] || 0),
            ...(symbolizer.haloColor && {haloColor: symbolizer.haloColor}),
            ...(symbolizer.haloWidth && {haloRadius: symbolizer.haloWidth})
        };
    }
    if (symbolizer.kind === 'Line') {
        return {
            strokeColor: symbolizer.color,
            strokeOpacity: symbolizer.opacity * globalOpacity,
            strokeWidth: symbolizer.width,
            ...(symbolizer.dasharray && { strokeDashstyle: symbolizer.dasharray.join(" ") }),
            ...(feature.properties.label && {
                label: feature.properties.label,
                fontFamily: "Courier New",
                fontSize: 9,
                fontStyle: "normal",
                fontWeight: "bold",
                labelAlign: anchorToLabelAlign("bottom"),
                haloColor: "#FFFFFF",
                haloRadius: 3
            })
        };
    }
    if (symbolizer.kind === 'Fill') {
        return {
            strokeColor: symbolizer.outlineColor,
            strokeOpacity: (symbolizer.outlineOpacity ?? 0) * globalOpacity,
            strokeWidth: symbolizer.outlineWidth ?? 0,
            ...(symbolizer.outlineDasharray && { strokeDashstyle: symbolizer.outlineDasharray.join(" ") }),
            fillColor: symbolizer.color,
            fillOpacity: symbolizer.fillOpacity * globalOpacity,
            ...(feature.properties.label && {
                label: feature.properties.label,
                fontFamily: "Courier New",
                fontSize: 9,
                fontStyle: "normal",
                fontWeight: "bold",
                labelAlign: anchorToLabelAlign("bottom"),
                haloColor: "#FFFFFF",
                haloRadius: 3
            })
        };
    }
    if (symbolizer.kind === 'Circle') {
        return {
            strokeColor: symbolizer.outlineColor,
            strokeOpacity: (symbolizer.outlineOpacity ?? 0) * globalOpacity,
            strokeWidth: symbolizer.outlineWidth ?? 0,
            ...(symbolizer.outlineDasharray && { strokeDashstyle: symbolizer.outlineDasharray.join(" ") }),
            fillColor: symbolizer.color,
            fillOpacity: symbolizer.opacity * globalOpacity,
            ...(feature.properties.label && {
                label: feature.properties.label,
                fontFamily: "Courier New",
                fontSize: 9,
                fontStyle: "normal",
                fontWeight: "bold",
                labelAlign: anchorToLabelAlign("bottom"),
                haloColor: "#FFFFFF",
                haloRadius: 3
            })
        };
    }
    return {
        display: 'none'
    };
};

/**
 * This function extracts the various symbol rules in a vector layer.
 * Note: This is a modified version of MapStore's getPrintStyleFuncFromRules function:
 * MapStore2/web/client/utils/styleparser/PrintStyleParser.js
 * @param {object} geoStylerStyle
 * @returns
 */
export const getPrintStyleFuncFromRules = (geoStylerStyle) => {
    return ({
        layer
    }) => {
        if (!layer?.features) {
            return [];
        }
        const collection = turfFlatten({ type: 'FeatureCollection', features: layer.features});
        let styleObj = {
            version: 1,
            styleProperty: "id"
        };
        flatten(collection.features
            .map((feature) => {
                const validRules = geoStylerStyle?.rules?.filter((rule) => !rule.filter || geoStylerStyleFilter(feature, rule.filter));
                if (validRules.length > 0) {
                    const geometryType = feature.geometry.type;
                    const symbolizers = validRules.reduce((acc, rule) => [...acc, ...rule?.symbolizers], []);
                    const pointGeometrySymbolizers = symbolizers.filter((symbolizer) =>
                        ['Mark', 'Icon', 'Text', 'Model'].includes(symbolizer.kind) && ['Point'].includes(geometryType)
                    );
                    const polylineGeometrySymbolizers = symbolizers.filter((symbolizer) =>
                        symbolizer.kind === 'Line' && ['LineString'].includes(geometryType)
                    );
                    const polygonGeometrySymbolizers = symbolizers.filter((symbolizer) =>
                        symbolizer.kind === 'Fill' && ['Polygon'].includes(geometryType)
                    );

                    const circleGeometrySymbolizers = symbolizers.filter((symbolizer) =>
                        symbolizer.kind === 'Circle' && ['Point'].includes(geometryType)
                    );

                    const originalSymbolizer = circleGeometrySymbolizers[circleGeometrySymbolizers.length - 1]
                    || pointGeometrySymbolizers[pointGeometrySymbolizers.length - 1]
                    || polylineGeometrySymbolizers[polylineGeometrySymbolizers.length - 1]
                    || polygonGeometrySymbolizers[polygonGeometrySymbolizers.length - 1];

                    const symbolizer = parseSymbolizerExpressions(originalSymbolizer, feature);

                    styleObj[feature.properties.id] = symbolizerToPrintMSStyle(symbolizer, feature, layer, originalSymbolizer);
                }
            }));
        return styleObj;
    };
};

class PrintStyleParser {

    readStyle() {
        return new Promise((resolve, reject) => {
            try {
                resolve(null);
            } catch (error) {
                reject(error);
            }
        });
    }

    writeStyle(geoStylerStyle, sync) {
        if (sync) {
            return getPrintStyleFuncFromRules(geoStylerStyle);
        }
        return new Promise((resolve, reject) => {
            try {
                const styleFunc = (options) => drawIcons(geoStylerStyle)
                    .then((images = []) => {
                        return getPrintStyleFuncFromRules(geoStylerStyle, { images })(options);
                    });
                resolve(styleFunc);
            } catch (error) {
                reject(error);
            }
        });
    }
}

export default PrintStyleParser;

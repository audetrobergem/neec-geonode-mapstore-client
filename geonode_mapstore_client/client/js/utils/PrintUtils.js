/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Proj4js from 'proj4';
const proj4 = Proj4js;
import assign from 'object-assign';
import url from 'url';
import { isArray, isNumber, cloneDeep } from 'lodash';
import { addAuthenticationParameter } from '@mapstore/framework/utils/SecurityUtils';
import { getPrintVendorParams, normalizeUrl } from '@mapstore/framework/utils/PrintUtils';
import { optionsToVendorParams } from '@mapstore/framework/utils/VendorParamsUtils';
import PrintStyleParser from './styleparser/PrintStyleParser';

const printStyleParser = new PrintStyleParser();

/**
 * Maps can be printed in UTM projection. The following function finds the area corresponding to
 * the longitude of the map center.
 * @param {int} longitude - The longitude of the map center
 * @returns {object} - The dictionary containing information on the corresponding UTM projection
 */
export const findUtmZoneFromLongitude = (longitude) => {
    if (longitude >= -150 && longitude < -144) {
        return {
            "code": "26906",
            "name": "NAD83 / UTM zone 6N",
            "definition": "+proj=utm +zone=6 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -144 && longitude < -138) {
        return {
            "code": "26907",
            "name": "NAD83 / UTM zone 7N",
            "definition": "+proj=utm +zone=7 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -138 && longitude < -132) {
        return {
            "code": "26908",
            "name": "NAD83 / UTM zone 8N",
            "definition": "+proj=utm +zone=8 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -132 && longitude < -126) {
        return {
            "code": "26909",
            "name": "NAD83 / UTM zone 9N",
            "definition": "+proj=utm +zone=9 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -126 && longitude < -120) {
        return {
            "code": "26910",
            "name": "NAD83 / UTM zone 10N",
            "definition": "+proj=utm +zone=10 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -120 && longitude < -114) {
        return {
            "code": "26911",
            "name": "NAD83 / UTM zone 11N",
            "definition": "+proj=utm +zone=11 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -114 && longitude < -108) {
        return {
            "code": "26912",
            "name": "NAD83 / UTM zone 12N",
            "definition": "+proj=utm +zone=12 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -108 && longitude < -102) {
        return {
            "code": "26913",
            "name": "NAD83 / UTM zone 13N",
            "definition": "+proj=utm +zone=13 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -102 && longitude < -96) {
        return {
            "code": "26914",
            "name": "NAD83 / UTM zone 14N",
            "definition": "+proj=utm +zone=14 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -96 && longitude < -90) {
        return {
            "code": "26915",
            "name": "NAD83 / UTM zone 15N",
            "definition": "+proj=utm +zone=15 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -90 && longitude < -84) {
        return {
            "code": "26916",
            "name": "NAD83 / UTM zone 16N",
            "definition": "+proj=utm +zone=16 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -84 && longitude < -78) {
        return {
            "code": "26917",
            "name": "NAD83 / UTM zone 17N",
            "definition": "+proj=utm +zone=17 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -78 && longitude < -72) {
        return {
            "code": "26918",
            "name": "NAD83 / UTM zone 18N",
            "definition": "+proj=utm +zone=18 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -72 && longitude < -66) {
        return {
            "code": "26919",
            "name": "NAD83 / UTM zone 19N",
            "definition": "+proj=utm +zone=19 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -66 && longitude < -60) {
        return {
            "code": "26920",
            "name": "NAD83 / UTM zone 20N",
            "definition": "+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -60 && longitude < -54) {
        return {
            "code": "26921",
            "name": "NAD83 / UTM zone 21N",
            "definition": "+proj=utm +zone=21 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -54 && longitude < -48) {
        return {
            "code": "26922",
            "name": "NAD83 / UTM zone 22N",
            "definition": "+proj=utm +zone=22 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    } else if (longitude >= -48 && longitude < -42) {
        return {
            "code": "26923",
            "name": "NAD83 / UTM zone 23N",
            "definition": "+proj=utm +zone=23 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
        };
    }
    return {};
};

/**
 * This function determines the list of coordinate systems that will be offered in the form's
 * choice list based on the printing application, map scale, and longitude.
 * @param {object} selectedPrintApplication
 * @param {number} scale
 * @param {number} longitude
 * @returns {array} - updatedCoordinatesSystems
 */
export const getProjections = (selectedPrintApplication, scale, longitude) => {
    const coordinatesSystems = selectedPrintApplication.coordinatesSystems;
    let updatedCoordinatesSystems = [...coordinatesSystems];
    if (selectedPrintApplication.utmEnabled && scale < 300000) {
        const utmZone = findUtmZoneFromLongitude(longitude);
        if (utmZone) {
            updatedCoordinatesSystems = coordinatesSystems.concat(utmZone);
        }
    }
    // The printout extent polygon is not displayed correctly at small scale when the Canada Atlas
    // Lambert coordinate system is selected by the user. We remove it from the selection list when
    // the map scale is smaller than 1: 10,000,000.
    if (scale > 10000000) {
        const atlasLambertProj = coordinatesSystems.findIndex(coordinateSystem => coordinateSystem.code === "3978");
        if (atlasLambertProj !== -1) {
            updatedCoordinatesSystems.splice(atlasLambertProj, 1);
        }
    }
    return updatedCoordinatesSystems;
};

/**
 * This function allows you to normalize the structure of a point object.
 * Note: this function is extracted from the MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {object} point
 * @returns {void}
 */
export const normalizePoint = (point) => {
    return {
        x: point.x || 0.0,
        y: point.y || 0.0,
        srs: point.srs || point.crs || 'EPSG:4326',
        crs: point.srs || point.crs || 'EPSG:4326'
    };
};

/**
 * This function validates if the x and y coordinates of a point are in a numeric format. They
 * are converted if not.
 * Note: this function is extracted from the MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {object} point
 * @returns {object} outpoint
 */
const numberize = (point) => {
    let outpoint = point;
    if (!isNumber(point.x)) {
        outpoint.x = parseFloat(point.x);
    }
    if (!isNumber(point.y)) {
        outpoint.y = parseFloat(point.y);
    }
    return outpoint;
};

/**
 * This function reprojects a point into a given coordinate system.
 * Note: This is a modified version to work around an error with reprojection to UTM coordinate systems.
 * The function is extracted from MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {object} point
 * @param {object} source
 * @param {object} dest
 * @param {boolean} normalize
 * @returns {object} transformed
 */
export const reproject = (point, source, dest, normalize = true) => {
    const sourceProj = source && proj4(source) ? new proj4.Proj(source) : null;
    const destProj = dest && proj4(dest) ? new proj4.Proj(dest) : null;
    if (sourceProj && destProj) {
        let p = isArray(point) ? proj4.toPoint(point) : proj4.toPoint([point.x, point.y]);

        const transformed = assign({}, source === dest ? numberize(p) : proj4.transform(sourceProj, destProj, numberize(p)), {srs: dest});
        if (normalize) {
            return normalizePoint(transformed);
        }
        return transformed;
    }
    return null;
};

/**
 * Note: this function is extracted from the MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {object} geojson
 * @param {*} leafCallback
 * @param {*} nodeCallback
 * @returns
 */
function traverseGeoJson(geojson, leafCallback, nodeCallback) {
    if (geojson === null) return geojson;

    let r = cloneDeep(geojson);

    if (geojson.type === 'Feature') {
        r.geometry = traverseGeoJson(geojson.geometry, leafCallback, nodeCallback);
    } else if (geojson.type === 'FeatureCollection') {
        r.features = r.features.map(function(gj) { return traverseGeoJson(gj, leafCallback, nodeCallback); });
    } else if (geojson.type === 'GeometryCollection') {
        r.geometries = r.geometries.map(function(gj) { return traverseGeoJson(gj, leafCallback, nodeCallback); });
    } else {
        if (leafCallback) leafCallback(r);
    }

    if (nodeCallback) nodeCallback(r);

    return r;
}

/**
 * Checks if `list` looks like a `[x, y]`.
 * Note: this function is extracted from the MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {array} list
 * @returns
 */
function isXY(list) {
    return list.length >= 2 &&
        typeof list[0] === 'number' &&
        typeof list[1] === 'number';
}

/**
 * This function validates whether the coordinates received when reprojecting the geojson are in the [x, y]
 * format and uses a callback function to project the coordinates.
 * Note: this function is extracted from the MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {*array} coordinates
 * @param {@function} callback
 * @returns Projected coordinates
 */
function traverseCoords(coordinates, callback) {
    if (isXY(coordinates)) return callback(coordinates);
    return coordinates.map(function(coord) { return traverseCoords(coord, callback); });
}

/**
 * This function reproduces a geojson in a coordinate system specified at the time of the call.
 * Note: this function is extracted from the MapStore core: MapStore2/web/client/utils/CoordinatesUtils.js
 * @param {object} geojson
 * @param {string} fromParam
 * @param {string} toParam
 * @returns
 */
export const reprojectGeoJson = function(geojson, fromParam = "EPSG:4326", toParam = "EPSG:4326") {
    let from = fromParam;
    let to = toParam;
    if (typeof from === 'string') {
        from = proj4(from) ? new proj4.Proj(from) : null;
    }
    if (typeof to === 'string') {
        to = proj4(to) ? new proj4.Proj(to) : null;
    }
    let transform = proj4(from, to);

    return traverseGeoJson(geojson, (gj) => {
        // No easy way to put correct CRS info into the GeoJSON,
        // and definitely wrong to keep the old, so delete it.
        if (gj.crs) {
            delete gj.crs;
        }
        // Strip Z coord if present fixes #2638 Proj4 transform only bidimensional coordinates
        gj.coordinates = traverseCoords(gj.coordinates, ([x, y]) => {
            return transform.forward([x, y]);
        });
    }, (gj) => {
        if (gj.bbox) {
            // A bbox can't easily be reprojected, just reprojecting
            // the min/max coords definitely will not work since
            // the transform is not linear (in the general case).
            // Workaround is to just re-compute the bbox after the
            // transform.
            gj.bbox = (() => {
                let min = [Number.MAX_VALUE, Number.MAX_VALUE];
                let max = [-Number.MAX_VALUE, -Number.MAX_VALUE];
                traverseGeoJson(gj, function(_gj) {
                    traverseCoords(_gj.coordinates, function(xy) {
                        min[0] = Math.min(min[0], xy[0]);
                        min[1] = Math.min(min[1], xy[1]);
                        max[0] = Math.max(max[0], xy[0]);
                        max[1] = Math.max(max[1], xy[1]);
                    });
                });
                return [min[0], min[1], max[0], max[1]];
            })();
        }
    });
};

/**
 * This function is used to create layer objects that will be sent to MapFish Print 3
 * depending on the layer format (WMS, WFS, vector or OSM).
 * Note: This is a modified version of MapStore's specCreators function:
 * MapStore2/web/client/utils/PrintUtils.js.
 * @param {object} layer - The layer object from MapStore
 * @param {object} state - The actual state of MapStore
 * @returns {object} - The layer object
 */
export const formatPrintLayer = (layer, state) => {
    if (layer.type === "wms") {
        const layerObject = {
            baseURL: layer.url.slice(-1) === "?" ? layer.url : `${layer.url}?`,
            opacity: layer.opacity || (layer.opacity === 0 ? 0 : 1.0),
            type: "WMS",
            layers: [
                layer.name
            ],
            imageFormat: layer.format || "image/png",
            styles: [
                layer.style || ""
            ],
            "customParams": addAuthenticationParameter(layer.url, assign({
                "TRANSPARENT": true,
                ...getPrintVendorParams(layer),
                // "EXCEPTIONS": "application/vnd.ogc.se_inimage",
                "scaleMethod": "accurate"
            }, layer.baseParams || {}, layer.params || {}, {
                ...optionsToVendorParams({
                    layerFilter: layer.layerFilter,
                    filterObj: layer.filterObj
                })
            }
            )),
            serverType: "geoserver"
        };
        return layerObject;

    } else if (layer.type === "vector") {
        const printProjection = state.sensitivityMapping.printProperties.projection;
        const projectionDefinition = state.sensitivityMapping.projections.find((projection) => projection.code === printProjection);
        const layerObject = {
            type: 'Vector',
            name: layer.title,
            opacity: layer.opacity || (layer.opacity === 0 ? 0 : 1.0),
            style: printStyleParser.writeStyle(layer.style.body, true)({ layer }),
            geoJson: reprojectGeoJson({
                type: "FeatureCollection",
                features: layer.features.map( f => ({...f, properties: {...f.properties}}))
            },
            "EPSG:4326",
            projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`)
        };
        return layerObject;

    } else if (layer.type === "osm") {
        // The OSM web service only works in Web Mercator. We use the GeoSolutions OSM service in
        // WMS format when the selected base map is OSM and the coordinate system is different from Web Mercator.
        if (state.sensitivityMapping.printProperties.projection === "3857") {
            return {
                "baseURL": "http://a.tile.openstreetmap.org/",
                "opacity": layer.opacity || (layer.opacity === 0 ? 0 : 1.0),
                "type": "OSM",
                "maxExtent": [
                    -20037508.3392,
                    -20037508.3392,
                    20037508.3392,
                    20037508.3392
                ],
                "tileSize": [
                    256,
                    256
                ],
                "imageExtension": "png",
                "resolutions": [
                    156543.03390625,
                    78271.516953125,
                    39135.7584765625,
                    19567.87923828125,
                    9783.939619140625,
                    4891.9698095703125,
                    2445.9849047851562,
                    1222.9924523925781,
                    611.4962261962891,
                    305.74811309814453,
                    152.87405654907226,
                    76.43702827453613,
                    38.218514137268066,
                    19.109257068634033,
                    9.554628534317017,
                    4.777314267158508,
                    2.388657133579254,
                    1.194328566789627,
                    0.5971642833948135
                ]
            };
        }
        return {
            baseURL: "https://maps.geosolutionsgroup.com/geoserver/osm/wms",
            imageFormat: "image/png",
            layers: ["osm"],
            opacity: 1,
            type: "WMS"
        };

    } else if (layer.type === "wfs") {
        const printProjection = state.sensitivityMapping.printProperties.projection;
        const projectionDefinition = state.sensitivityMapping.projections.find((projection) => projection.code === printProjection);
        let geoJson = undefined;
        try {
            geoJson = reprojectGeoJson({
                type: "FeatureCollection",
                features: layer.geoJson.features.map( f => ({...f, properties: {...f.properties, id: layer.style.body.rules[0].ruleId}}))
            },
            "EPSG:3857",
            projectionDefinition.definition ? projectionDefinition.definition : `EPSG:${printProjection}`);
        } catch (error) {
            return {};
        }
        if (geoJson) {
            return {
                type: 'Vector',
                name: layer.title,
                opacity: layer.opacity || (layer.opacity === 0 ? 0 : 1.0),
                style: printStyleParser.writeStyle(layer.style.body, true)({ layer: { ...layer, features: geoJson.features } }),
                // NOTE: data in this case have to be pre-loaded, in the correct projection
                geoJson: geoJson
            };
        }
        return {};
    }
    return {};
};

/**
 * Layer titles can be in list format (object), when multilingual titles are configured, or in text format.
 * If it's a list, we extract the map's print language title if it exists. The default title will be
 * returned if the title in the selected language does not exist or is empty.
 * @param {object} layer - The layer object from MapStore
 * @param {string} mapLanguage - The language of the map
 * @returns {string} - The layer title
 */
export const getLayerTitle = (layer, mapLanguage) => {
    if (typeof(layer.title) === "object") {
        let layerTitle = layer.title[`${mapLanguage}`];
        if (layerTitle && layerTitle !== "") {
            return layerTitle;
        }
        return layer.title.default;

    }
    return layer.title;

};

/**
 * Generates the legend object for a specific layer. The object is a list that includes
 * the layer title and the URL of the GetLegendGraphic request that will be used by
 * Mapfish Print to create the image.
 * @param {object} layer - The layer object from MapStore
 * @param {object} bbox - The BBOX ([bottomLeft.x, bottomLeft.y, topRight.x, topRight.y])
 * @param {object} state - The current state of the application
 * @returns {object} - The legend object
 */
export const formatLegend = (layer, bbox, state) => {
    if (layer.type === "wms") {
        const layoutMainMap = state.sensitivityMapping.printLayout.attributes
            .find((attribute) => attribute.name === "mainMap");
        const legendTitle = getLayerTitle(layer, state.sensitivityMapping.printProperties.language);

        // Legend options let you configure the appearance of the legend. We use a default set of options
        // for sensitivity maps. The list of options is available here:
        // https://docs.geoserver.org/main/en/user/services/wms/get_legend_graphic/index.html#controlling-legend-appearance-with-legend-options.
        let legendOptions = "forceLabels:on;fontAntialiasing:true;dpi:300;fontName:Open%20Sans;fontSize:12;wrap:true;wrap_limit:2000";
        // The following options are added when the user selects the option to filter the legend according to map content.
        if (state.sensitivityMapping.printProperties.filterLegend) {
            legendOptions += ";countMatched:true;hideEmptyRules:true";
        }

        // See if layer is local
        let localLayer = layer.url.includes(state.gnsettings?.geonodeUrl) ? true : false;

        // Calculation of the number of rules in the layer style. The legend for layers with a single rule is
        // not displayed in the same way as those with multiple rules: the legend object title is not displayed
        // for single symbols (a single rule) and the legend label is bold, but is displayed for multiple symbols
        // (more than one rule). Note that labels in a style are included in a rule. It is therefore possible
        // for a style with a single symbol containing labels to be displayed as a style with several symbols.
        const selectedStyle = layer.selectedStyle;
        let legendName = undefined;
        if (selectedStyle) {
            const ruleCount = selectedStyle.match(/Rule/g).length / 2;
            if (ruleCount && ruleCount > 1) {
                legendName = legendTitle;
            } else {
                legendName = "";
                legendOptions += ";fontStyle:bold";
            }
        } else {
            legendName = legendTitle;
        }

        // Creation of the legend object. Much of this code comes from the creation of the MapStore default print
        // tool legend (utils/PrintUtils.js) and has been adapted to the needs of NEEC sensitivity mapping.
        return {
            "name": legendName,
            "icons": [
                normalizeUrl(layer.url) + url.format({
                    query: addAuthenticationParameter(normalizeUrl(layer.url), {
                        SERVICE: "WMS",
                        REQUEST: "GetLegendGraphic",
                        FORMAT: "image/png",
                        TRANSPARENT: true,
                        LAYER: layer.name,
                        STYLE: layer.style ? layer.style.replace(" ", "%20") : "",
                        SLD_VERSION: "1.1.0",
                        srcheight: layoutMainMap.clientInfo.height,
                        srcwidth: layoutMainMap.clientInfo.width,
                        VERSION: "1.3.0",
                        SCALE: state.sensitivityMapping.printProperties.scale,
                        HEIGHT: 24,
                        WIDTH: 24,
                        LANGUAGE: state.sensitivityMapping.printProperties.language,
                        LEGEND_OPTIONS: legendOptions,
                        ...optionsToVendorParams({
                            layerFilter: layer.layerFilter,
                            filterObj: layer.filterObj
                        }),
                        ...(localLayer && {BBOX: bbox.toString()}),
                        ...(localLayer && {CRS: `EPSG:${state.sensitivityMapping.printProperties.projection}`})
                    })
                })
            ]
        };
    } else if (layer.type === "vector") {
        if (layer.features[0].geometry.type === "Point") {
            if (layer.style.body.rules[0].symbolizers[0].image && typeof(layer.style.body.rules[0].symbolizers[0].image) === "string") {
                return {
                    "name": layer.title,
                    "dpi": 100,
                    "icons": [layer.style.body.rules[0].symbolizers[0].image]
                };
            }
        }
        if (layer.title) {
            return {
                "name": layer.title
            };
        }
    }
    return {};
};

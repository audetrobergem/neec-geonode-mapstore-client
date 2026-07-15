import Rx from 'rxjs';
import axios from 'axios';
import bbox from '@turf/bbox';
import uuid from "uuid";

import { SET_CONTROL_PROPERTY } from '@mapstore/framework/actions/controls';
import { updateMapLayout, UPDATE_MAP_LAYOUT } from '@mapstore/framework/actions/maplayout';
import { changeDrawingStatus, CHANGE_DRAWING_STATUS } from '@mapstore/framework/actions/draw';
import {
    selectFeatures,
    selectLayer,
    formatFeatures,
    setZoneIdentifyLoading,
    setGeometryColumns,
    describeFeatureTypeError,
    SELECT_FEATURES,
    HIGHLIGHT_SELECTED_FEATURE,
    ZOOM_TO_SELECTED_FEATURE,
    ADD_LAYER_TO_MAP,
    FORMAT_SELECTION
} from '@js/actions/zoneidentify';
import {
    mapLayoutSelector,
    boundingSidebarRectSelector
} from '@mapstore/framework/selectors/maplayout';
import { LayoutSections } from "@js/utils/LayoutUtils";
import {
    hideMapinfoMarker,
    purgeMapInfoResults,
    toggleMapInfoState
} from '@mapstore/framework/actions/mapInfo';
import { zoomToExtent } from '@mapstore/framework/actions/map';
import {
    removeAdditionalLayer,
    updateAdditionalLayer
} from '@mapstore/framework/actions/additionallayers';
import { addLayer } from '@mapstore/framework/actions/layers';
import {
    reproject,
    reprojectGeoJson
} from '@mapstore/framework/utils/CoordinatesUtils';

// ---------------------------------------------------------------------------
// Geometry highlight styles
// ---------------------------------------------------------------------------

export const POINT_STYLE = {
    radius: 10,
    weight: 3,
    color: '#33eeff',
    opacity: 1,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

export const LINE_STYLE = {
    weight: 8,
    color: '#33eeff',
    opacity: 0.8,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

export const POLY_STYLE = {
    weight: 3,
    color: '#33eeff',
    opacity: 0.8,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default geometry column name used as a fallback when DescribeFeatureType
 * does not return a recognisable geometry attribute.
 */
const DEFAULT_GEOMETRY_COLUMN = 'wkb_geometry';

/**
 * XSD / GML type strings that identify a geometry attribute in a
 * DescribeFeatureType response.
 */
const GEOMETRY_XSD_TYPES = [
    'gml:PointPropertyType',
    'gml:MultiPointPropertyType',
    'gml:LineStringPropertyType',
    'gml:MultiLineStringPropertyType',
    'gml:CurvePropertyType',
    'gml:MultiCurvePropertyType',
    'gml:PolygonPropertyType',
    'gml:MultiPolygonPropertyType',
    'gml:SurfacePropertyType',
    'gml:MultiSurfacePropertyType',
    'gml:GeometryPropertyType',
    'gml:MultiGeometryPropertyType',
    'gml:AbstractGeometryType'
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the display title for a feature.
 * Priority: label_<lang> → name_<lang> → label_en → name_en → feature id.
 *
 * @param {Object} properties - Feature properties object
 * @param {string} lang       - Two-letter language code, e.g. "en" or "fr"
 * @param {string} featureId  - Fallback identifier string
 * @returns {string}
 */
const resolveFeatureTitle = (properties, lang, featureId) => {
    const labelKey = `label_${lang}`;
    const nameKey  = `name_${lang}`;

    return (
        properties[labelKey]   ||
        properties[nameKey]    ||
        properties.label_en ||
        properties.name_en  ||
        featureId
    );
};

/**
 * Return the appropriate highlight style for a geometry type.
 * @param {string} geometryType
 * @returns {Object}
 */
const getStyleForGeometry = (geometryType) => {
    if (["Point", "POINT", "MultiPoint"].includes(geometryType)) {
        return POINT_STYLE;
    }
    if (["LINE", "Line", "LineString", "MultiLineString"].includes(geometryType)) {
        return LINE_STYLE;
    }
    return POLY_STYLE;
};

/**
 * Build a GeoJSON Polygon geometry from a [minx, miny, maxx, maxy] extent.
 * Used as a fallback when the drawn feature does not carry a geometry object.
 *
 * @param {number[]} extent - [minx, miny, maxx, maxy]
 * @returns {Object} GeoJSON Polygon geometry
 */
const buildPolygonFromExtent = ([minx, miny, maxx, maxy]) => ({
    type: "Polygon",
    coordinates: [[
        [minx, miny],
        [maxx, miny],
        [maxx, maxy],
        [minx, maxy],
        [minx, miny]
    ]]
});

/**
 * Parse a WFS DescribeFeatureType XML response and return the name of the
 * first attribute whose xsd type is a recognised GML geometry type.
 *
 * The response looks like:
 *
 *   <xsd:complexType name="my_layerType">
 *     <xsd:complexContent>
 *       <xsd:extension>
 *         <xsd:sequence>
 *           <xsd:element name="wkb_geometry" type="gml:MultiPolygonPropertyType" .../>
 *           <xsd:element name="id"           type="xsd:long" .../>
 *           ...
 *         </xsd:sequence>
 *       </xsd:extension>
 *     </xsd:complexContent>
 *   </xsd:complexType>
 *
 * @param {string} xmlString - Raw XML string from DescribeFeatureType
 * @returns {string} geometry column name, or DEFAULT_GEOMETRY_COLUMN
 */
const parseGeometryColumnFromDescribeFeatureType = (xmlString) => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'application/xml');

        // xsd:element nodes carry name="" and type="" attributes
        const elements = doc.querySelectorAll('element');

        for (const el of elements) {
            const type = el.getAttribute('type') ?? '';
            const name = el.getAttribute('name') ?? '';

            if (
                name &&
                GEOMETRY_XSD_TYPES.some((gt) => type.includes(gt))
            ) {
                return name;
            }
        }
    } catch (e) {
        console.warn('ZoneIdentify: failed to parse DescribeFeatureType response', e);
    }

    return DEFAULT_GEOMETRY_COLUMN;
};

/**
 * Build an OGC XML GetFeature request body containing one Query per layer,
 * each with an INTERSECTS spatial filter using the layer's actual geometry
 * column name.
 *
 * Using INTERSECTS (rather than BBOX) forces GeoServer to test against the
 * actual feature geometry, not just its envelope.
 *
 * @param {Array<{ typeName: string, geometryColumn: string }>} layerDefs
 * @param {Object} geometry - GeoJSON Polygon geometry
 * @param {string} srsName  - SRS of the geometry, e.g. "EPSG:4326"
 * @returns {string} OGC XML body
 */
const buildIntersectsFilter = (layerDefs, geometry, srsName) => {
    const coordinatesString = geometry.coordinates[0]
        .map((coord) => `${coord[0]} ${coord[1]}`)
        .join(' ');

    const queries = layerDefs
        .map(
            ({ typeName, geometryColumn }) => `
    <wfs:Query typeName="${typeName}" srsName="${srsName}">
        <ogc:Filter>
            <ogc:Intersects>
                <ogc:PropertyName>${geometryColumn}</ogc:PropertyName>
                <gml:Polygon srsName="${srsName}">
                    <gml:exterior>
                        <gml:LinearRing>
                            <gml:posList>${coordinatesString}</gml:posList>
                        </gml:LinearRing>
                    </gml:exterior>
                </gml:Polygon>
            </ogc:Intersects>
        </ogc:Filter>
    </wfs:Query>`
        )
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature
    service="WFS"
    version="1.1.0"
    outputFormat="application/json"
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:gml="http://www.opengis.net/gml"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.opengis.net/wfs
        http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
${queries}
</wfs:GetFeature>`;
};

// ---------------------------------------------------------------------------
// Epics
// ---------------------------------------------------------------------------

/**
 * Keeps the right-side panel offset in sync with the map layout whenever
 * the zoneIdentify panel is open.
 */
export const gnUpdateZoneIdentifyMapLayoutEpic = (action$, store) =>
    action$.ofType(UPDATE_MAP_LAYOUT)
        .filter(() => store.getState()?.controls?.zoneIdentify?.enabled)
        .filter(({ source }) => source !== LayoutSections.PANEL)
        .map(({ layout }) => {
            const mapLayout = {
                left: { sm: 300, md: 500, lg: 600 },
                right: { md: 550 },
                bottom: { sm: 30 }
            };
            const state = store.getState();
            const boundingSidebarRect = boundingSidebarRectSelector(state);
            const left = state?.controls?.drawer?.enabled
                ? mapLayout.left.sm
                : null;

            const action = updateMapLayout({
                ...mapLayoutSelector(state),
                ...layout,
                right: mapLayout.right.md,
                ...(left && { left }),
                boundingMapRect: {
                    ...(layout?.boundingMapRect ?? {}),
                    right: mapLayout.right.md,
                    ...(left && { left })
                },
                boundingSidebarRect: {
                    ...boundingSidebarRect,
                    ...layout.boundingSidebarRect
                }
            });

            return { ...action, source: LayoutSections.PANEL };
        });

/**
 * Reacts to the zoneIdentify panel being OPENED:
 * - Clears previous identify results
 * - Disables the default map-info click handler
 * - Resets plugin state
 * - Triggers DescribeFeatureType for all relevant visible layers
 */
export const openZoneIdentifyEpic = (action$, store) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter(
            (action) =>
                action.control === "zoneIdentify" &&
                action.property === "enabled" &&
                (action.value === true || action.value === 'true')
        )
        .filter(() => store.getState()?.controls?.zoneIdentify?.enabled)
        .switchMap(() =>
            Rx.Observable.of(
                purgeMapInfoResults(),
                hideMapinfoMarker(),
                toggleMapInfoState(),
                selectFeatures(null),
                selectLayer("visible_layers"),
                formatFeatures(null)
            )
        );

/**
 * Reacts to the zoneIdentify panel being CLOSED.
 */
export const closeZoneIdentifyEpic = (action$) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter(
            (action) =>
                action.control === "zoneIdentify" &&
                action.property === "enabled" &&
                (action.value === false || action.value === 'false')
        )
        .switchMap(() =>
            Rx.Observable.of(
                toggleMapInfoState(),
                selectFeatures(null),
                selectLayer(null),
                formatFeatures(null),
                removeAdditionalLayer({ owner: "ZoneIdentify" }),
                changeDrawingStatus("clean", "", "zoneIdentify", [], {})
            )
        );

/**
 * When the panel opens, call DescribeFeatureType for every relevant visible
 * layer that does not already have a resolved geometry column in the store.
 *
 * Each DescribeFeatureType request is made individually so that a single
 * failing layer does not block the others. Results are merged into one
 * SET_GEOMETRY_COLUMNS dispatch.
 *
 * The epic also re-runs whenever the layer list changes while the panel is
 * open (e.g. the user toggles layer visibility) by also listening to the
 * SET_CONTROL_PROPERTY open action — a separate watcher epic handles the
 * layer-change case if needed, but for now opening the panel is the trigger.
 */
export const describeFeatureTypeEpic = (action$, store) =>
    action$.ofType(SET_CONTROL_PROPERTY)
        .filter(
            (action) =>
                action.control === "zoneIdentify" &&
                action.property === "enabled" &&
                (action.value === true || action.value === 'true')
        )
        .filter(() => store.getState()?.controls?.zoneIdentify?.enabled)
        .switchMap(() => {
            const state = store.getState();
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const accessToken = state.security?.user?.info?.access_token;
            const alreadyResolved = state.zoneIdentify?.geometryColumns ?? {};

            const layersToDescribe = state.layers.flat.filter(
                (layer) =>
                    layer.visibility === true &&
                    layer.type === "wms" &&
                    layer.group !== "background" &&
                    layer.name.includes("neec_geodb") &&
                    layer.loadingError !== "Error" &&
                    // Skip layers whose geometry column is already known
                    !alreadyResolved[layer.name]
            );

            if (layersToDescribe.length === 0) {
                // Nothing new to describe
                return Rx.Observable.empty();
            }

            const requestUrl = `${geoserverUrl}wfs`;

            // Fire one DescribeFeatureType request per layer and collect all
            // results, tolerating individual failures
            const requests = layersToDescribe.map((layer) =>
                Rx.Observable.defer(() =>
                    axios.get(requestUrl, {
                        params: {
                            service: 'WFS',
                            version: '1.1.0',
                            request: 'DescribeFeatureType',
                            typeName: layer.name,
                            ...(accessToken && { access_token: accessToken })
                        }
                    })
                )
                    .map((response) => ({
                        layerName: layer.name,
                        geometryColumn: parseGeometryColumnFromDescribeFeatureType(
                            response.data
                        )
                    }))
                    .catch((error) => {
                        console.warn(
                            `ZoneIdentify: DescribeFeatureType failed for ${layer.name}`,
                            error
                        );
                        // Resolve to the default so this layer is still usable
                        return Rx.Observable.of({
                            layerName: layer.name,
                            geometryColumn: DEFAULT_GEOMETRY_COLUMN
                        });
                    })
            );

            // Wait for all requests to complete, then dispatch a single action
            return Rx.Observable.forkJoin(requests)
                .switchMap((results) => {
                    const geometryColumns = results.reduce(
                        (acc, { layerName, geometryColumn }) => ({
                            ...acc,
                            [layerName]: geometryColumn
                        }),
                        {}
                    );
                    return Rx.Observable.of(setGeometryColumns(geometryColumns));
                })
                .catch((error) => {
                    console.error(
                        'ZoneIdentify: DescribeFeatureType batch failed',
                        error
                    );
                    return Rx.Observable.of(
                        describeFeatureTypeError(error.message ?? String(error))
                    );
                });
        });

/**
 * When the user finishes drawing a bbox:
 * 1. Sets loading = true immediately
 * 2. Posts an OGC INTERSECTS filter to WFS — tests actual geometry, not bbox
 * 3. Each Query uses the geometry column name from the store (resolved by
 *    describeFeatureTypeEpic), falling back to DEFAULT_GEOMETRY_COLUMN
 * 4. Dispatches selectFeatures with the results, or resets on error
 */
export const getFeaturesInfoClickEpic = (action$, store) =>
    action$.ofType(CHANGE_DRAWING_STATUS)
        .filter(
            (action) =>
                action.owner === "zoneIdentify" && action.status === "stop"
        )
        .switchMap(({ features }) => {
            const state = store.getState();
            const geometryColumns = state.zoneIdentify?.geometryColumns ?? {};

            // Resolve the list of layers to query, with their geometry columns
            let layerDefs;
            if (state.zoneIdentify.selectedLayer === "visible_layers") {
                layerDefs = state.layers.flat
                    .filter(
                        (layer) =>
                            layer.visibility === true &&
                            layer.type === "wms" &&
                            layer.group !== "background" &&
                            layer.name.includes("neec_geodb") &&
                            layer.loadingError !== "Error"
                    )
                    .map((layer) => ({
                        typeName: layer.name,
                        // Use the store value if available, otherwise fall back
                        geometryColumn:
                            geometryColumns[layer.name] ?? DEFAULT_GEOMETRY_COLUMN
                    }));
            } else {
                const layerName = state.zoneIdentify.selectedLayer;
                layerDefs = [{
                    typeName: layerName,
                    geometryColumn:
                        geometryColumns[layerName] ?? DEFAULT_GEOMETRY_COLUMN
                }];
            }

            if (!layerDefs || layerDefs.length === 0) {
                return Rx.Observable.of(
                    setZoneIdentifyLoading(false),
                    selectFeatures([]),
                    formatFeatures([])
                );
            }

            const mapProjection = state.map.present.projection;
            const geoserverUrl = state.gnsettings?.geoserverUrl;
            const requestUrl = `${geoserverUrl}wfs`;
            const accessToken = state.security?.user?.info?.access_token;

            // Prefer actual drawn geometry; fall back to extent-derived polygon
            const drawnFeature = features[0];
            const drawnGeometry = drawnFeature.geometry
                ?? buildPolygonFromExtent(drawnFeature.extent);

            // Reproject to EPSG:4326 for the WFS filter
            const geometryIn4326 =
                mapProjection !== "EPSG:4326"
                    ? reprojectGeoJson(
                        { type: "Feature", geometry: drawnGeometry },
                        mapProjection,
                        "EPSG:4326"
                    ).geometry
                    : drawnGeometry;

            const xmlBody = buildIntersectsFilter(
                layerDefs,
                geometryIn4326,
                "EPSG:4326"
            );

            return Rx.Observable.concat(
                Rx.Observable.of(setZoneIdentifyLoading(true)),
                Rx.Observable.defer(() =>
                    axios.post(requestUrl, xmlBody, {
                        headers: { 'Content-Type': 'application/xml' },
                        params: accessToken
                            ? { access_token: accessToken }
                            : undefined
                    })
                )
                    .map((response) => selectFeatures(response.data.features))
                    .catch((error) => {
                        console.error("ZoneIdentify WFS request failed:", error);
                        return Rx.Observable.of(
                            setZoneIdentifyLoading(false),
                            selectFeatures([]),
                            formatFeatures([])
                        );
                    })
            );
        });

/**
 * When the drawing is cleared, reset all identify state and remove the
 * highlight overlay.
 */
export const cleanSelectionEpic = (action$) =>
    action$.ofType(CHANGE_DRAWING_STATUS)
        .filter(
            (action) =>
                action.owner === "zoneIdentify" && action.status === "clean"
        )
        .switchMap(() =>
            Rx.Observable.of(
                selectFeatures(null),
                formatFeatures(null),
                removeAdditionalLayer({ owner: "ZoneIdentify" })
            )
        );

/**
 * Converts the flat WFS feature array into a hierarchical tree structure
 * grouped by layer, using a single-pass Map for O(n) performance.
 */
export const convertFeaturesForTreeEpic = (action$, store) =>
    action$.ofType(SELECT_FEATURES)
        .filter((action) => action.selectedFeatures !== null)
        .switchMap((action) => {
            const state = store.getState();
            const selectedFeatures = action.selectedFeatures;
            const lang = (state.locale?.current ?? 'en').slice(0, 2);

            const layerMap = new Map();
            const layerList = state.layers.flat.filter(
                (layer) =>
                    layer.visibility === true &&
                    layer.type === "wms" &&
                    layer.group !== "background"
            );

            layerList.forEach((layer) => {
                const shortName = layer.name.split(":")[1] || layer.name;
                layerMap.set(shortName, {
                    title: layer.title,
                    children: []
                });
            });

            selectedFeatures.forEach((feature) => {
                const featureTypeName = feature.id?.split(".")[0] ?? "";
                const entry = layerMap.get(featureTypeName);
                if (!entry) return;

                const featureTitle = resolveFeatureTitle(
                    feature.properties,
                    lang,
                    feature.id
                );

                entry.children.push({
                    id: feature.id,
                    title: featureTitle,
                    geometry: feature.geometry,
                    properties: feature.properties
                });
            });

            let parentIndex = 1;
            const formattedFeatures = [];

            layerMap.forEach((entry, shortName) => {
                if (entry.children.length === 0) return;
                formattedFeatures.push({
                    id: parentIndex++,
                    name: shortName,
                    title: entry.title,
                    children: entry.children
                });
            });

            return Rx.Observable.of(formatFeatures(formattedFeatures));
        });

/**
 * Highlights the geometry of the selected feature on the map.
 */
export const highlightSelectedFeatureEpic = (action$) =>
    action$.ofType(HIGHLIGHT_SELECTED_FEATURE)
        .switchMap((action) => {
            const geometry = action.selectedFeature;
            const style = getStyleForGeometry(geometry?.type);

            return Rx.Observable.of(
                updateAdditionalLayer(
                    "zone-identify-selected-feature",
                    "ZoneIdentify",
                    'overlay',
                    {
                        id: "zone-identify-selected-feature",
                        name: "zone-identify-selected-feature",
                        type: "vector",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: geometry.type,
                                    coordinates: geometry.coordinates
                                },
                                style
                            }
                        ]
                    }
                )
            );
        });

/**
 * Zooms the map to the bounding box of the selected feature.
 */
export const zoomToSelectedFeatureEpic = (action$) =>
    action$.ofType(ZOOM_TO_SELECTED_FEATURE)
        .switchMap((action) =>
            Rx.Observable.of(
                zoomToExtent(bbox(action.selectedFeature), "EPSG:4326", 17)
            )
        );

/**
 * Adds the drawn query extent to the map as a permanent styled vector layer.
 */
export const addExtentToMapEpic = (action$) =>
    action$.ofType(ADD_LAYER_TO_MAP)
        .switchMap((action) => {
            const reprojectedCoordinates = action.layer.coordinates[0]
                .map((coords) => reproject(coords, "EPSG:3857", "EPSG:4326"))
                .map((coords) => [coords.x, coords.y]);

            const extentLayer = {
                id: `zoneidentify:${uuid()}`,
                title: "Query Extent",
                type: "vector",
                visibility: true,
                invalidFeatures: null,
                features: [
                    {
                        type: "Feature",
                        id: uuid(),
                        properties: { name: "Query Extent" },
                        geometry: {
                            type: "Polygon",
                            coordinates: [reprojectedCoordinates]
                        }
                    }
                ],
                style: {
                    format: "geostyler",
                    body: {
                        rules: [
                            {
                                name: "Query Extent",
                                symbolizers: [
                                    {
                                        symbolizerId: "d4f18121-501f-11ef-952e-5f52f1343b22",
                                        kind: "Fill",
                                        color: "#eb0951",
                                        fillOpacity: 0.1,
                                        outlineColor: "#eb0951",
                                        outlineWidth: 2,
                                        msClassificationType: "both"
                                    }
                                ]
                            }
                        ]
                    }
                }
            };

            return Rx.Observable.of(addLayer(extentLayer));
        });

/**
 * Stops the loading indicator once formatted features have been stored.
 */
export const zoneIdentifyStopLoadingEpic = (action$, store) =>
    action$.ofType(FORMAT_SELECTION)
        .filter(() => store.getState()?.controls?.zoneIdentify?.enabled)
        .switchMap(() =>
            Rx.Observable.of(setZoneIdentifyLoading(false))
        );

export default {
    gnUpdateZoneIdentifyMapLayoutEpic,
    openZoneIdentifyEpic,
    closeZoneIdentifyEpic,
    describeFeatureTypeEpic,
    getFeaturesInfoClickEpic,
    cleanSelectionEpic,
    convertFeaturesForTreeEpic,
    highlightSelectedFeatureEpic,
    zoomToSelectedFeatureEpic,
    addExtentToMapEpic,
    zoneIdentifyStopLoadingEpic
};

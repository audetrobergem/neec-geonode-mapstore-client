/*
 * Copyright 2023, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useEffect } from "react";
import moment from 'moment';
import turfCenter from "@turf/center";
import turfBbox from "@turf/bbox";
import BaseMap from "@mapstore/framework/components/map/BaseMap";
import mapTypeHOC from "@mapstore/framework/components/map/enhancers/mapType";
import ZoomTo from "@js/components/ZoomTo/ZoomTo";
import Message from "@mapstore/framework/components/I18N/Message";

import { Form, ControlLabel, Table, Glyphicon } from 'react-bootstrap';
import { DateTimePicker } from 'react-widgets';
import tooltip from "@mapstore/framework/components/misc/enhancers/tooltip";
import GNButton from '@js/components/Button';
import FaIcon from "@js/components/FaIcon/FaIcon";
import {navStatusTranslator} from '@js/utils/MarineTrafficUtils';

const Button = tooltip(GNButton);

const Map = mapTypeHOC(BaseMap);
Map.displayName = "Map";

const BoundingBoxAndCenter = ({trackHistory}) => {
    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const [dataToDisplay, setDataToDisplay] = useState([]);
    const TOTAL_VALUES_PER_PAGE = 10;
    const length = Math.ceil(trackHistory.features.length / TOTAL_VALUES_PER_PAGE);

    const goOnFirstPage = () => {
        if (currentPageNumber === 1) return;
        setCurrentPageNumber(1);
    };

    const goOnPrevPage = () => {
        if (currentPageNumber === 1) return;
        setCurrentPageNumber((prev) => prev - 1);
    };

    const goOnNextPage = () => {
        if (currentPageNumber === trackHistory.features.length / TOTAL_VALUES_PER_PAGE) return;
        setCurrentPageNumber((prev) => prev + 1);
    };

    const goOnLastPage = () => {
        if (currentPageNumber === trackHistory.features.length / TOTAL_VALUES_PER_PAGE) return;
        setCurrentPageNumber(length);
    };

    useEffect(() => {
        const start = (currentPageNumber - 1) * TOTAL_VALUES_PER_PAGE;
        const end = currentPageNumber * TOTAL_VALUES_PER_PAGE;
        setDataToDisplay(trackHistory.features.slice(start, end));
    }, [currentPageNumber]);

    return (
        <div className="marine-traffic-history-table">
            <Table>
                <thead>
                    <tr>
                        <th><Message msgId="marineTraffic.date" /></th>
                        <th><Message msgId="marineTraffic.source" /></th>
                        <th><Message msgId="marineTraffic.speed" /></th>
                        <th><Message msgId="marineTraffic.course" /></th>
                        <th><Message msgId="marineTraffic.navStatus" /></th>
                    </tr>
                </thead>
                <tbody>
                    {dataToDisplay.map((item) => (
                        <tr key={trackHistory.features.findIndex((x) => x.properties.identity_id === item.properties.identity_id)}>
                            <td>{moment(item.properties.report_date_time).format("YYYY-MM-DD HH:mm")}</td>
                            <td>{item.properties.data_source}</td>
                            <td>{item.properties.speed}kt</td>
                            <td>{item.properties.course}°</td>
                            <td>{navStatusTranslator(item.properties.nav_status)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <div className="marine-traffic-vessel-navbar">
                <div className="marine-traffic-page-navigation">
                    <Button
                        className="marine-traffic-vessel-navbar-button"
                        tooltipId={<Message msgId="marineTraffic.firstPageTooltip" />}
                        disabled={currentPageNumber === 1 ? true : false}
                        onClick={goOnFirstPage}
                    >
                        <FaIcon name="angle-double-left" />
                    </Button>
                    <Button
                        className="marine-traffic-vessel-navbar-button"
                        tooltipId={<Message msgId="marineTraffic.previousPageTooltip" />}
                        disabled={currentPageNumber === 1 ? true : false}
                        onClick={goOnPrevPage}
                    >
                        <FaIcon name="angle-left" />
                    </Button>
                    <span className="marine-traffic-vessel-navbar-text">
                        <Message
                            msgId="marineTraffic.navBarResultText"
                            msgParams={
                                {
                                    index: currentPageNumber,
                                    length: length
                                }
                            }
                        />
                    </span>
                    <Button
                        className="marine-traffic-vessel-navbar-button"
                        tooltipId={<Message msgId={`marineTraffic.nextPagelTooltip`} />}
                        disabled={currentPageNumber === length ? true : false}
                        onClick={goOnNextPage}
                    >
                        <FaIcon name="angle-right" />
                    </Button>
                    <Button
                        className="marine-traffic-vessel-navbar-button"
                        tooltipId={<Message msgId="marineTraffic.lastPageTooltip" />}
                        disabled={currentPageNumber === length ? true : false}
                        onClick={goOnLastPage}
                    >
                        <FaIcon name="angle-double-right" />
                    </Button>
                </div>
                <span className="marine-traffic-vessel-navbar-text">
                    <Message
                        msgId="marineTraffic.historyTableHeader"
                        msgParams={
                            {
                                minIndex: (currentPageNumber - 1) * 10 + 1,
                                maxIndex: currentPageNumber === length ? trackHistory.features.length  : (currentPageNumber - 1) * 10 + 10,
                                length: trackHistory.features.length
                            }
                        }
                    />
                </span>
            </div>
        </div>
    );
};

const MarineTrafficHistory = ({ onExtractHistory, onAddLayerToMap, properties, trackHistory } = {}) => {
    const [dateFromValue, setdateFromValue] = useState(new Date());
    const [dateToValue, setdateToValue] = useState(new Date());

    let mapCenter;
    let mapBbox;
    let mapName;
    if (trackHistory && trackHistory.features && trackHistory.features.length > 0) {
        mapCenter = turfCenter(trackHistory);
        mapBbox = turfBbox(trackHistory);
        mapName = `${properties.identity_name} (${moment(dateFromValue).format("YYYY-MM-DD HH:mm")} - ${moment(dateToValue).format("YYYY-MM-DD HH:mm")})`;
    }

    const exportData = () => {
        const fileName = `${moment(new Date()).format("YYYYMMDD")}_${moment(dateToValue).format("HHmm")}_${properties.identity_name}.json`;
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(trackHistory))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = fileName;

        link.click();
    };

    return (
        <div>
            <Form>
                <div className="marine-traffic-history-date-form">
                    <div className="marine-traffic-history-date-col">
                        <ControlLabel><Message msgId="marineTraffic.from"/></ControlLabel>
                        <DateTimePicker
                            className="marine-traffic-history-date-picker"
                            value={dateFromValue}
                            min={new Date("2020-01-01")}
                            max={dateToValue}
                            onChange={(value) => setdateFromValue(value)}
                        />
                    </div>
                    <div className="marine-traffic-history-date-col">
                        <ControlLabel><Message msgId="marineTraffic.to"/></ControlLabel>
                        <DateTimePicker
                            className="marine-traffic-history-date-picker"
                            value={dateToValue}
                            min={new Date("2020-01-01")}
                            onChange={(value) => setdateToValue(value)}
                        />
                    </div>

                </div>
                <div className="marine-traffic-buttons">
                    <Button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onExtractHistory({
                            identityId: properties.identity_id,
                            startDate: dateFromValue.toISOString(),
                            endDate: dateToValue.toISOString()
                        })}
                    >
                        <Message msgId="marineTraffic.extract"/>
                    </Button>
                </div>
            </Form>

            {trackHistory && trackHistory.features && trackHistory.features.length > 0 ?
                <div>
                    <div className="marine-traffic-history-title">
                        <div className="marine-traffic-history-title-text">
                            {mapName}
                        </div>
                        <div className="marine-traffic-history-title-tools">
                            <Button
                                variant="default"
                                tooltipId={<Message msgId="marineTraffic.download" />}
                                onClick={() => exportData()}>
                                <Glyphicon glyph="download" />
                            </Button>
                            <Button
                                variant="default"
                                tooltipId={<Message msgId="marineTraffic.addLayer" />}
                                onClick={() => onAddLayerToMap({
                                    features: trackHistory.features,
                                    layerTitle: mapName
                                }
                                )}>
                                <Glyphicon glyph="add-layer" />
                            </Button>
                        </div>
                    </div>
                    <div className="marine-traffic-history-map">
                        <div className="map-wrapper">
                            <Map
                                id="gn-locations-map"
                                key="gn-locations-map"
                                mapType={"openlayers"}
                                map={{
                                    registerHooks: false,
                                    projection: "EPSG:3857",
                                    center: {
                                        x: mapCenter.geometry.coordinates[0],
                                        y: mapCenter.geometry.coordinates[1],
                                        crs: "EPSG:4326"
                                    }
                                }}
                                options={{interactive: true}}
                                styleMap={{
                                    height: '100%',
                                    width: '100%'
                                }}
                                layers={[
                                    {
                                        type: 'osm',
                                        title: 'Open Street Map',
                                        name: 'mapnik',
                                        source: 'osm',
                                        group: 'background',
                                        visibility: true
                                    },
                                    {
                                        id: "extent-location",
                                        type: "vector",
                                        features: trackHistory.features,
                                        style: {
                                            kind: "Icon",
                                            size: 15,
                                            image: "https://localhost:8081/static/mapstore/symbols/ais.png"
                                        }
                                    }
                                ]}
                            >
                                <ZoomTo extent={mapBbox?.join(",")} nearest={false} />
                            </Map>
                        </div>
                    </div>
                    <BoundingBoxAndCenter trackHistory={trackHistory}/>
                </div>
                : <div>
                    <Message msgId="marineTraffic.nothingToDisplay"/>
                </div>
            }
        </div>
    );
};

export default MarineTrafficHistory;

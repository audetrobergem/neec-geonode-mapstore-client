import React from 'react';
import Message from '@mapstore/framework/components/I18N/Message';

/**
 * Map from the AIS registered_category field value to a static image path.
 * Keys match the uppercase values stored in the layer attribute.
 */
const CATEGORY_SYMBOL_MAP = {
    'BULK CARRIERS': 'marine_traffic_cargo.png',
    'FISHING': 'marine_traffic_fishing.png',
    'FISHING INDUSTRY': 'marine_traffic_fishing.png',
    'DRY CARGO/PASSENGER': 'marine_traffic_passenger.png',
    'PLEASURE / LEISURE': 'marine_traffic_pleasure.png',
    'TANKERS': 'marine_traffic_tankers.png',
    'INLAND WATERWAYS': 'marine_traffic_special.png',
    'MISCELLANEOUS': 'marine_traffic_special.png',
    'NAVAL': 'marine_traffic_special.png',
    'OFFSHORE': 'marine_traffic_special.png',
    'RESCUE': 'marine_traffic_special.png',
    'SERVICE VESSELS': 'marine_traffic_special.png'
};

const SYMBOL_BASE_PATH = '../../../static/mapstore/img/';
const DEFAULT_SYMBOL = 'marine_traffic_other.png';

/**
 * Return the static image path for a given AIS vessel category.
 * Falls back to the "other" icon for unknown categories.
 * @param {string} registeredCategory value of the `registered_category` feature property
 * @returns {string} relative URL to the vessel type icon
 */
export const findVesselSymbol = (registeredCategory) => {
    const file = CATEGORY_SYMBOL_MAP[registeredCategory] ?? DEFAULT_SYMBOL;
    return `${SYMBOL_BASE_PATH}${file}`;
};

/**
 * Translate an AIS navigation status code into a localised React element.
 * Returns a generic "unknown" label for unrecognised status values instead of throwing.
 * @param {string} status value of the `nav_status` feature property (e.g. "MOORED")
 * @returns {React.ReactElement}
 */
const NAV_STATUS_MESSAGE_MAP = {
    AGROUND: 'marineTraffic.status.aground',
    AT_ANCHOR: 'marineTraffic.status.atAnchor',
    CONSTRAINED_BY_HER_DRAUGHT: 'marineTraffic.status.constrainedByHerDraught',
    ENGAGED_IN_FISHING: 'marineTraffic.status.engagedInFishing',
    MOORED: 'marineTraffic.status.moored',
    NOT_UNDER_COMMAND: 'marineTraffic.status.notUnderCommand',
    RESTRICTED_MANOEUVERABILITY: 'marineTraffic.status.restrictedManoeuverability',
    UNDER_WAY_SAILING: 'marineTraffic.status.underWaySailing',
    UNDER_WAY_USING_ENGINE: 'marineTraffic.status.underWayUsingEngine',
    UNKNOWN: 'marineTraffic.status.unknown'
};

export const navStatusTranslator = (status) => {
    const msgId = NAV_STATUS_MESSAGE_MAP[status] ?? NAV_STATUS_MESSAGE_MAP.UNKNOWN;
    return <Message msgId={msgId} />;
};
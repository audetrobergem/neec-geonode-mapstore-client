import React from "react";
import Message from '@mapstore/framework/components/I18N/Message';

/**
 * This function allows you to format and translate the navigation status of ships.
 * It is written in uppercase and spaces are replaced by _ in the layer attributes.
 */
export const navStatusTranslator = (status) => {
    const navStatus = [
        {
            status: "AGROUND",
            message: "marineTraffic.status.aground"
        },
        {
            status: "AT_ANCHOR",
            message: "marineTraffic.status.atAnchor"
        },
        {
            status: "CONSTRAINED_BY_HER_DRAUGHT",
            message: "marineTraffic.status.constrainedByHerDraught"
        },
        {
            status: "ENGAGED_IN_FISHING",
            message: "marineTraffic.status.engagedInFishing"
        },
        {
            status: "MOORED",
            message: "marineTraffic.status.moored"
        },
        {
            status: "NOT_UNDER_COMMAND",
            message: "marineTraffic.status.notUnderCommand"
        },
        {
            status: "RESTRICTED_MANOEUVERABILITY",
            message: "marineTraffic.status.restrictedManoeuverability"
        },
        {
            status: "UNDER_WAY_SAILING",
            message: "marineTraffic.status.underWaySailing"
        },
        {
            status: "UNDER_WAY_USING_ENGINE",
            message: "marineTraffic.status.underWayUsingEngine"
        },
        {
            status: "UNKNOWN",
            message: "marineTraffic.status.unknown"
        }
    ];

    const selectedStatus = navStatus.find((x) => x.status === status);

    return <Message msgId={selectedStatus.message} />;
};

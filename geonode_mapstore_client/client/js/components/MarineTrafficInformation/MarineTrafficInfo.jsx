/*
 * Copyright 2022, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState } from 'react';
import castArray from 'lodash/castArray';
import isEmpty from 'lodash/isEmpty';
import moment from 'moment';

import Button from '@mapstore/framework/components/layout/Button';
import Tabs from '@mapstore/framework/plugins/ResourcesCatalog/components/Tabs';
import Message from '@mapstore/framework/components/I18N/Message';
import MarineTrafficHistory from './MarineTrafficHistory';
import {navStatusTranslator} from '@js/utils/MarineTrafficUtils';

const replaceTemplateString = (properties, str) => {
    return Object.keys(properties).reduce((updatedStr, key) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        return updatedStr.replace(regex, properties[key]);
    }, str);
};

const getDateRangeValue = (startValue, endValue, format) => {
    if (startValue && endValue) {
        return `${moment(startValue).format(format)} - ${moment(endValue).format(format)}`;
    }
    return moment(startValue ? startValue : endValue).format(format);
};
const isEmptyValue = (value) => {
    if (Array.isArray(value)) {
        return isEmpty(value);
    }
    if (typeof value === 'object') {
        return isEmpty(value) || (isEmpty(value.start) && isEmpty(value.end));
    }
    return value === 'None' || !value;
};
const isStyleLabel = (style) => style === "label";
const isFieldLabelOnly = ({style, value}) => isEmptyValue(value) && isStyleLabel(style);

const DetailInfoFieldLabel = ({ field }) => {
    const label = field.labelId ? <Message msgId={field.labelId} /> : field.label;
    return isStyleLabel(field.style) && field.href
        ? (<a href={field.href} target={field.target}>{label}</a>)
        : label;
};

function MarineTrafficInfoField({ field, children }) {
    const values = castArray(field.value);
    const isLinkLabel = isFieldLabelOnly(field);
    return (
        <div className={`marine-traffic-info-row${isLinkLabel ? ' link' : ''}`}>
            <div className={`marine-traffic-info-label`}><DetailInfoFieldLabel field={field} /></div>
            {!isLinkLabel && <div className="marine-traffic-info-value">{children(values)}</div>}
        </div>
    );
}

function MarineTrafficHTML({ value, placeholder }) {
    const [expand, setExpand] = useState(false);
    if (placeholder) {
        return (
            <div className={`marine-traffic-info-html${expand ? '' : ' collapsed'}`}>
                {expand
                    ? <div className="marine-traffic-info-html-value" dangerouslySetInnerHTML={{ __html: value }} />
                    : <div className="marine-traffic-info-html-value">{placeholder}</div>}
                <Button onClick={() => setExpand(!expand)}>
                    <Message msgId={expand ? 'gnviewer.readLess' : 'gnviewer.readMore'} />
                </Button>
            </div>);
    }
    return (
        <div dangerouslySetInnerHTML={{ __html: value }} />
    );
}

function MarineTrafficInfoFields({ fields, formatHref }) {
    return (<div className="marine-traffic-info-fields">
        {fields.map((field, filedIndex) => {
            if (field.type === 'link') {
                return (
                    <MarineTrafficInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => {
                            return field.href
                                ? <a key={idx} href={field.href}>{value}</a>
                                : <a key={idx} href={value.href}>{value.value}</a>;
                        })}
                    </MarineTrafficInfoField>
                );
            }
            if (field.type === 'query') {
                return (
                    <MarineTrafficInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <a key={idx} href={formatHref({
                                query: field.queryTemplate
                                    ? Object.keys(field.queryTemplate)
                                        .reduce((acc, key) => ({
                                            ...acc,
                                            [key]: replaceTemplateString(value, field.queryTemplate[key])
                                        }), {})
                                    : field.query,
                                pathname: field.pathname
                            })}>{field.valueKey ? value[field.valueKey] : value}</a>
                        ))}
                    </MarineTrafficInfoField>
                );
            }
            if (field.type === 'date') {
                return (
                    <MarineTrafficInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <span key={idx}>{(value?.start || value?.end) ? getDateRangeValue(value.start, value.end, field.format || 'MMMM Do YYYY') : moment(value).format(field.format || 'MMMM Do YYYY')}</span>
                        ))}
                    </MarineTrafficInfoField>
                );
            }
            if (field.type === 'html') {
                return (
                    <MarineTrafficInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <MarineTrafficHTML key={idx} value={value} placeholder={field.placeholder} />
                        ))}
                    </MarineTrafficInfoField>
                );
            }
            if (field.type === 'text') {
                return (
                    <MarineTrafficInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <span key={idx}>{value}</span>
                        ))}
                    </MarineTrafficInfoField>
                );
            }
            if (field.type === 'navStatus') {
                return (
                    <MarineTrafficInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <span key={idx}>{navStatusTranslator(value)}</span>
                        ))}
                    </MarineTrafficInfoField>
                );
            }
            return null;
        })}
    </div>);
}

const tabTypes = {
    'history': MarineTrafficHistory,
    'tab': MarineTrafficInfoFields
};

const parseTabItems = (items) => {
    return (items || []).filter(({value, style}) => {
        return !(isEmptyValue(value) && !isStyleLabel(style));
    });
};
const isDefaultTabType = (type) => type === 'tab';

function MarineTrafficInfo({
    tabs = [],
    ...props
}) {
    const filteredTabs = tabs
        .filter((tab) => !tab?.disableIf)
        .map((tab) =>
            ({
                ...tab,
                items: isDefaultTabType(tab.type) ? parseTabItems(tab?.items) : tab?.items,
                Component: tabTypes[tab.type] || tabTypes.tab
            }))
        .filter(tab => !isEmpty(tab?.items));
    const [selectedTabId, onSelect] = useState(filteredTabs?.[0]?.id);
    return (
        <Tabs
            className="marine-traffic-info tabs-underline"
            selectedTabId={selectedTabId}
            onSelect={onSelect}
            tabs={filteredTabs.map(({Component, ...tab} = {}) => ({
                title: <DetailInfoFieldLabel field={tab} />,
                eventKey: tab?.id,
                component: <Component fields={tab?.items} {...props} />
            }))}
        />
    );
}

export default MarineTrafficInfo;

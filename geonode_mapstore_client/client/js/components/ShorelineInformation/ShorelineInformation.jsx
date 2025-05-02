/*
 * Copyright 2025, ECCC.
 * All rights reserved.
 *
 * This section is a copy of the DetailsPanel/DetailsInfo.jsx file, where a few modifications have
 * been made to match the specific needs of certain fields in the Shoreline model.
 */

import React, { useState } from 'react';
import castArray from 'lodash/castArray';
import isEmpty from 'lodash/isEmpty';
import moment from 'moment';

import Button from '@js/components/Button';
import Tabs from '@js/components/Tabs';
import Message from '@mapstore/framework/components/I18N/Message';

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

function DetailsInfoField({ field, children }) {
    const values = castArray(field.value);
    const isLinkLabel = isFieldLabelOnly(field);
    return (
        <div className={`shoreline-viewer-info-row${isLinkLabel ? ' link' : ''}`}>
            <div className={`shoreline-viewer-info-label`}><DetailInfoFieldLabel field={field} /></div>
            {!isLinkLabel && <div className="shoreline-viewer-info-value">{children(values)}</div>}
        </div>
    );
}

function DetailsHTML({ value, placeholder }) {
    const [expand, setExpand] = useState(false);
    if (placeholder) {
        return (
            <div className={`shoreline-viewer-info-html${expand ? '' : ' collapsed'}`}>
                {expand
                    ? <div className="shoreline-viewer-info-html-value" dangerouslySetInnerHTML={{ __html: value }} />
                    : <div className="shoreline-viewer-info-html-value">{placeholder}</div>}
                <Button onClick={() => setExpand(!expand)}>
                    <Message msgId={expand ? 'gnviewer.readLess' : 'gnviewer.readMore'} />
                </Button>
            </div>);
    }
    return (
        <div dangerouslySetInnerHTML={{ __html: value }} />
    );
}

function DetailsInfoFields({ fields, formatHref }) {
    return (<div className="shoreline-viewer-info-fields">
        {fields.map((field, filedIndex) => {
            if (field.type === 'link') {
                return (
                    <DetailsInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => {
                            return field.href
                                ? <a key={idx} href={field.href}>{value}</a>
                                : <a key={idx} href={value.href}>{value.value}</a>;
                        })}
                    </DetailsInfoField>
                );
            }
            if (field.type === 'query') {
                return (
                    <DetailsInfoField key={filedIndex} field={field}>
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
                    </DetailsInfoField>
                );
            }
            if (field.type === 'date') {
                return (
                    <DetailsInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <span key={idx}>{(value?.start || value?.end) ? getDateRangeValue(value.start, value.end, field.format || 'MMMM Do YYYY') : moment(value).format(field.format || 'MMMM Do YYYY')}</span>
                        ))}
                    </DetailsInfoField>
                );
            }
            if (field.type === 'html') {
                return (
                    <DetailsInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <DetailsHTML key={idx} value={value} placeholder={field.placeholder} />
                        ))}
                    </DetailsInfoField>
                );
            }
            if (field.type === 'text') {
                return (
                    <DetailsInfoField key={filedIndex} field={field}>
                        {(values) => values.map((value, idx) => (
                            <span key={idx}>{value}</span>
                        ))}
                    </DetailsInfoField>
                );
            }
            if (field.type === 'list') {
                if (field.value) {
                    return (
                        <DetailsInfoField key={filedIndex} field={field}>
                            {(values) => values.map((value, idx) => {
                                return (
                                    <ul key={idx} style={{paddingLeft: 0, listStyle: "none"}}>
                                        {value.split(",").map(listItem => <li>{listItem}</li>)}
                                    </ul>
                                );
                            })}
                        </DetailsInfoField>
                    );
                }
            }
            if (field.type === 'generalComment') {
                try {
                    const generalCommentArray = field.value.split(" | ");
                    let formattedArray = [];
                    generalCommentArray.map(comment => {
                        let commentDict = undefined;
                        let commentJson = '{' + comment.replace((/^([^:]+)/g), "\"$1\"") + '}';
                        try {
                            commentDict = JSON.parse(commentJson);
                        } catch (err) {
                            console.warn(err);
                            commentJson = '{' + comment.replace((/^([^:]+): ([^\]]+)/g), "\"$1\":\"$2\"") + '}';
                            commentDict = JSON.parse(commentJson);
                        }

                        const commentValues = Object.values(commentDict)[0];
                        const commentType = Object.entries(commentDict)[0][0];
                        if (["General comment", "Infrastructure", "Water feature"].includes(commentType)) {
                            if (commentValues.length > 0) {
                                let value = undefined;
                                try {
                                    value = commentValues.join(", ");
                                } catch (err) {
                                    console.warn(err);
                                    value = commentValues;
                                }
                                formattedArray.push(<li>{commentType}: {value}</li>);
                            }
                        } else {
                            if (commentValues.length > 0) {
                                let values = [];
                                const intertidal = Object.groupBy(commentValues, ({zone}) => zone === "intertidal" ? "intertidal" : "");
                                let formattedIntertidal = [];
                                if (intertidal.intertidal) {
                                    intertidal.intertidal.forEach(item => formattedIntertidal.push(`${item.value} (${item.cover})`));
                                }
                                formattedIntertidal.length > 0 ? values.push(<li>Intertidal: {formattedIntertidal.join(", ")}</li>) : {};
                                const supratidal = Object.groupBy(commentValues, ({zone}) => zone === "supratidal" ? "supratidal" : "");
                                let formattedSupratidal = [];
                                if (supratidal.supratidal) {
                                    supratidal.supratidal.forEach(item => formattedSupratidal.push(`${item.value} (${item.cover})`));
                                }
                                formattedSupratidal.length > 0 ? values.push(<li>Supratidal: {formattedSupratidal.join(", ")} </li>) : {};
                                formattedArray.push(<li>{commentType}: <ul className="shoreline-viewer-info-list-indent">{values}</ul></li>);
                            }
                        }
                    });
                    return (
                        <DetailsInfoField key={filedIndex} field={field}>
                            {(values) => values.map((value, idx) => {
                                return (
                                    <ul key={idx} className="shoreline-viewer-info-list">
                                        {formattedArray}
                                    </ul>
                                );
                            })}
                        </DetailsInfoField>
                    );
                } catch {
                    return (
                        <DetailsInfoField key={filedIndex} field={field}>
                            {(values) => values.map((value, idx) => (
                                <span key={idx}>{value}</span>
                            ))}
                        </DetailsInfoField>
                    );
                }

            }
            return null;
        })}
    </div>);
}

function ShorelineInformation(props) {

    const tabs = props.tabs;

    const [selectedTabId, onSelect] = useState(tabs?.[0]?.id);

    return (
        <Tabs
            className="shoreline-viewer-info tabs-underline"
            selectedTabId={selectedTabId}
            onSelect={onSelect}
            tabs={tabs.map(({Component, ...tab} = {}) => ({
                title: <DetailInfoFieldLabel field={tab} />,
                eventKey: tab?.id,
                component: <DetailsInfoFields fields={tab?.items} />
            }))}
        />
    );
}

export default ShorelineInformation;

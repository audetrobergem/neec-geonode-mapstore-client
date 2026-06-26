/*
 * Copyright 2025, ECCC.
 * All rights reserved.
 *
 * Displays structured attribute tabs for a selected shoreline classification
 * feature. Field *values* are resolved from the live `segmentProperties` prop
 * so that the static tab configuration (from localConfig) is kept separate
 * from the runtime data.
 */

import React, { useState } from 'react';
import castArray from 'lodash/castArray';
import isEmpty from 'lodash/isEmpty';
import moment from 'moment';
import groupBy from 'lodash/groupBy';  // replaces Object.groupBy for broad browser support

import Button from '@mapstore/framework/components/layout/Button';
import Tabs from '@mapstore/framework/plugins/ResourcesCatalog/components/Tabs';
import Message from '@mapstore/framework/components/I18N/Message';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const replaceTemplateString = (properties, str) =>
    Object.keys(properties).reduce((updatedStr, key) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        return updatedStr.replace(regex, properties[key]);
    }, str);

const getDateRangeValue = (startValue, endValue, format) => {
    if (startValue && endValue) {
        return `${moment(startValue).format(format)} - ${moment(endValue).format(format)}`;
    }
    return moment(startValue ?? endValue).format(format);
};

const isEmptyValue = (value) => {
    if (Array.isArray(value)) return isEmpty(value);
    if (value && typeof value === 'object') {
        return isEmpty(value) || (isEmpty(value.start) && isEmpty(value.end));
    }
    return value === 'None' || !value;
};

const isStyleLabel = (style) => style === 'label';
const isFieldLabelOnly = ({ style, value }) =>
    isEmptyValue(value) && isStyleLabel(style);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const DetailInfoFieldLabel = ({ field }) => {
    const label = field.labelId
        ? <Message msgId={field.labelId} />
        : field.label;

    return isStyleLabel(field.style) && field.href
        ? <a href={field.href} target={field.target}>{label}</a>
        : label;
};

function DetailsInfoField({ field, children }) {
    const values = castArray(field.value);
    const isLinkLabel = isFieldLabelOnly(field);
    return (
        <div className={`shoreline-viewer-info-row${isLinkLabel ? ' link' : ''}`}>
            <div className="shoreline-viewer-info-label">
                <DetailInfoFieldLabel field={field} />
            </div>
            {!isLinkLabel && (
                <div className="shoreline-viewer-info-value">
                    {children(values)}
                </div>
            )}
        </div>
    );
}

function DetailsHTML({ value, placeholder }) {
    const [expand, setExpand] = useState(false);

    if (placeholder) {
        return (
            <div className={`shoreline-viewer-info-html${expand ? '' : ' collapsed'}`}>
                {expand
                    ? <div
                        className="shoreline-viewer-info-html-value"
                        dangerouslySetInnerHTML={{ __html: value }}
                    />
                    : <div className="shoreline-viewer-info-html-value">
                        {placeholder}
                    </div>}
                <Button onClick={() => setExpand(!expand)}>
                    <Message msgId={expand ? 'gnviewer.readLess' : 'gnviewer.readMore'} />
                </Button>
            </div>
        );
    }

    return <div dangerouslySetInnerHTML={{ __html: value }} />;
}

/**
 * Renders the formatted general-comment field value.
 * Uses lodash groupBy instead of Object.groupBy for broad browser compatibility.
 */
function GeneralCommentValue({ value }) {
    try {
        const items = value.split(' | ').reduce((acc, comment) => {
            // Try strict JSON parse first, then fall back to a looser pattern
            let commentDict;
            try {
                commentDict = JSON.parse(
                    '{' + comment.replace(/^([^:]+)/, '"$1"') + '}'
                );
            } catch {
                commentDict = JSON.parse(
                    '{' +
                    comment.replace(/^([^:]+): ([^\]]+)/, '"$1":"$2"') +
                    '}'
                );
            }

            const commentType = Object.keys(commentDict)[0];
            const commentValues = commentDict[commentType];

            if (
                ['General comment', 'Infrastructure', 'Water feature'].includes(
                    commentType
                )
            ) {
                if (commentValues.length > 0) {
                    const display =
                        Array.isArray(commentValues)
                            ? commentValues.join(', ')
                            : commentValues;
                    acc.push(
                        <li key={commentType}>
                            {commentType}: {display}
                        </li>
                    );
                }
            } else if (commentValues.length > 0) {
                const byZone = groupBy(commentValues, (item) => item.zone);

                const intertidal = (byZone.intertidal ?? []).map(
                    (item) => `${item.value} (${item.cover})`
                );
                const supratidal = (byZone.supratidal ?? []).map(
                    (item) => `${item.value} (${item.cover})`
                );

                acc.push(
                    <li key={commentType}>
                        {commentType}:
                        <ul className="shoreline-viewer-info-list-indent">
                            {intertidal.length > 0 && (
                                <li>Intertidal: {intertidal.join(', ')}</li>
                            )}
                            {supratidal.length > 0 && (
                                <li>Supratidal: {supratidal.join(', ')}</li>
                            )}
                        </ul>
                    </li>
                );
            }

            return acc;
        }, []);

        return (
            <ul className="shoreline-viewer-info-list">{items}</ul>
        );
    } catch (err) {
        console.warn('GeneralCommentValue parse error:', err);
        return <span>{value}</span>;
    }
}

function DetailsInfoFields({ fields, formatHref }) {
    return (
        <div className="shoreline-viewer-info-fields">
            {fields.map((field, fieldIndex) => {
                // Skip fields with no value to display (unless they are label-only links)
                if (isEmptyValue(field.value) && !isFieldLabelOnly(field)) {
                    return null;
                }

                switch (field.type) {
                case 'link':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) =>
                                    field.href
                                        ? <a key={idx} href={field.href}>{value}</a>
                                        : <a key={idx} href={value.href}>{value.value}</a>
                                )
                            }
                        </DetailsInfoField>
                    );

                case 'query':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) => (
                                    <a
                                        key={idx}
                                        href={formatHref({
                                            query: field.queryTemplate
                                                ? Object.keys(
                                                    field.queryTemplate
                                                ).reduce(
                                                    (acc, key) => ({
                                                        ...acc,
                                                        [key]: replaceTemplateString(
                                                            value,
                                                            field.queryTemplate[key]
                                                        )
                                                    }),
                                                    {}
                                                )
                                                : field.query,
                                            pathname: field.pathname
                                        })}
                                    >
                                        {field.valueKey ? value[field.valueKey] : value}
                                    </a>
                                ))
                            }
                        </DetailsInfoField>
                    );

                case 'date':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) => (
                                    <span key={idx}>
                                        {value?.start || value?.end
                                            ? getDateRangeValue(
                                                value.start,
                                                value.end,
                                                field.format ?? 'MMMM Do YYYY'
                                            )
                                            : moment(value).format(
                                                field.format ?? 'MMMM Do YYYY'
                                            )}
                                    </span>
                                ))
                            }
                        </DetailsInfoField>
                    );

                case 'html':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) => (
                                    <DetailsHTML
                                        key={idx}
                                        value={value}
                                        placeholder={field.placeholder}
                                    />
                                ))
                            }
                        </DetailsInfoField>
                    );

                case 'text':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) => (
                                    <span key={idx}>{value}</span>
                                ))
                            }
                        </DetailsInfoField>
                    );

                case 'list':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) => (
                                    <ul
                                        key={idx}
                                        style={{ paddingLeft: 0, listStyle: 'none' }}
                                    >
                                        {String(value)
                                            .split(',')
                                            .map((item, i) => (
                                                <li key={i}>{item.trim()}</li>
                                            ))}
                                    </ul>
                                ))
                            }
                        </DetailsInfoField>
                    );

                case 'generalComment':
                    return (
                        <DetailsInfoField key={fieldIndex} field={field}>
                            {(values) =>
                                values.map((value, idx) => (
                                    <GeneralCommentValue key={idx} value={value} />
                                ))
                            }
                        </DetailsInfoField>
                    );

                default:
                    return null;
                }
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Displays tabbed attribute information for a selected shoreline feature.
 *
 * @param {object}   segmentProperties - live GeoJSON feature properties
 * @param {object[]} tabs              - static tab configuration from localConfig
 * @param {function} [formatHref]      - optional href formatter for query fields
 */
function ShorelineInformation({ segmentProperties, tabs, formatHref }) {
    const [selectedTabId, onSelect] = useState(tabs?.[0]?.id);

    if (!tabs || tabs.length === 0) {
        return null;
    }

    // Inject live values from segmentProperties into each tab's field list
    const resolvedTabs = tabs.map((tab) => ({
        ...tab,
        items: (tab.items ?? []).map((field) => ({
            ...field,
            value: segmentProperties?.[field.attribute] ?? field.value
        }))
    }));

    return (
        <Tabs
            className="shoreline-viewer-info tabs-underline"
            selectedTabId={selectedTabId}
            onSelect={onSelect}
            tabs={resolvedTabs.map(({ ...tab } = {}) => ({
                title: <DetailInfoFieldLabel field={tab} />,
                eventKey: tab?.id,
                component: (
                    <DetailsInfoFields
                        fields={tab?.items ?? []}
                        formatHref={formatHref}
                    />
                )
            }))}
        />
    );
}

export default ShorelineInformation;
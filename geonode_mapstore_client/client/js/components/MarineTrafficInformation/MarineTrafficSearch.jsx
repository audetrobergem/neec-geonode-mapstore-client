import React, { useState } from 'react';
import { Form, ControlLabel } from 'react-bootstrap';
import Message from '@mapstore/framework/components/I18N/Message';
import tooltip from '@mapstore/framework/components/misc/enhancers/tooltip';
import GNButton from '@mapstore/framework/components/layout/Button';

const Button = tooltip(GNButton);

const MarineTrafficSearch = ({
    aisData,
    onSearchVessel
}) => {
    const [inputVesselNameValue, setInputVesselNameValue] = useState('');
    const [inputMMSIValue, setInputMMSIValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    const handleVesselNameInputChange = (event) => {
        const value = event.target.value;
        setInputVesselNameValue(value);
        if (value.length > 0) {
            const filteredSuggestions = aisData.filter(suggestion =>
                suggestion.properties.identity_name.toLowerCase().includes(value.toLowerCase())
            );
            const vesselNamesSuggestions = filteredSuggestions.map(suggestion => suggestion.properties.identity_name);
            setSuggestions(vesselNamesSuggestions.slice(0, 10));
        } else {
            setSuggestions([]);
        }
    };

    const handleMMSIInputChange = (event) => {
        const value = event.target.value;
        setInputMMSIValue(value);
    };


    const handleSuggestionClick = (value) => {
        setInputVesselNameValue(value);
        setSuggestions([]);
    };

    const handleSearchClick = () => {
        if (inputVesselNameValue && inputVesselNameValue.length > 0) {
            onSearchVessel({
                attribute: "identity_name",
                value: inputVesselNameValue
            });
        } else if (inputMMSIValue && inputMMSIValue.length > 0) {
            onSearchVessel({
                attribute: "mmsi",
                value: inputMMSIValue
            });
        }
    };

    return (
        <div className="marine-traffic-search-panel">
            <Form>
                <div className="autocomplete-wrapper">
                    <ControlLabel htmlFor="searchIdentityName"><Message msgId="marineTraffic.searchIdentityName"/></ControlLabel>
                    <input
                        className="form-control"
                        type="text"
                        value={inputVesselNameValue}
                        onChange={handleVesselNameInputChange}
                        aria-autocomplete="list"
                        aria-controls="autocomplete-list"
                    />
                    {suggestions.length > 0 && (
                        <ul id="autocomplete-list" className="suggestions-list" role="listbox">
                            {suggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    role="option"
                                >
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <ControlLabel htmlFor="searchMMSI"><Message msgId="marineTraffic.searchMMSI"/></ControlLabel>
                    <input
                        className="form-control"
                        type="text"
                        value={inputMMSIValue}
                        onChange={handleMMSIInputChange}
                    />
                </div>
                <div className="marine-traffic-buttons">
                    <Button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSearchClick()}
                    >
                        <Message msgId="marineTraffic.search"/>
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default MarineTrafficSearch;

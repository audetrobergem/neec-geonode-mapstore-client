export const extractRegionsBbox = (regions) => {
    let extents = regions.map((region) => region.extent);
    var minxList = extents.map(function(x) {
        return x[0];
    });
    var minyList = extents.map(function(x) {
        return x[1];
    });
    var maxxList = extents.map(function(x) {
        return x[2];
    });
    var maxyList = extents.map(function(x) {
        return x[3];
    });

    return ([Math.min(...minxList), Math.min(...minyList), Math.max(...maxxList), Math.max(...maxyList)]);
};

export const extractBboxFromGeometry = (geometry) => {
    var xList = geometry.map(function(x) {
        return x.x;
    });
    var yList = geometry.map(function(y) {
        return y.y;
    });

    return ([Math.min(...xList), Math.min(...yList), Math.max(...xList), Math.max(...yList)]);
};

export const POINT_SELECTION_STYLE = {
    "format": "geostyler",
    "body": {
        "name": "Selected Point",
        "rules": [
            {
                "name": "Selected Point",
                "symbolizers": [
                    {
                        kind: "Mark",
                        color: '#33eeff',
                        fillOpacity: 0.5,
                        strokeColor: '#33eeff',
                        strokeOpacity: 0.9,
                        radius: 11
                    }
                ]
            }
        ]
    }
};

export const LINE_SELECTION_STYLE = {
    "format": "geostyler",
    "body": {
        "name": "Selected Line",
        "rules": [
            {
                "name": "Selected Line",
                "symbolizers": [
                    {
                        kind: "Line",
                        color: '#33eeff',
                        opacity: 0.5,
                        width: 11
                    }
                ]
            }
        ]
    }
};

export const VIDEO_POINT_STYLE = {
    "format": "geostyler",
    "body": {
        "name": "Selected Video Feature",
        "rules": [
            {
                "name": "Selected Video Feature",
                "symbolizers": [
                    {
                        "kind": "Icon",
                        "size": 32
                    }
                ]
            }
        ]
    }
};

export const PROJECT_EXTENT_STYLE = {
    "format": "geostyler",
    "body": {
        "name": "Project Extents",
        "rules": [
            {
                "name": "Project Extents",
                "symbolizers": [
                    {
                        kind: "Fill",
                        outlineWidth: 2,
                        outlineOpacity: 1,
                        outlineColor: '#6a0ced'
                    }
                ]
            }
        ]
    }
};

export const REGION_EXTENT_STYLE = {
    "format": "geostyler",
    "body": {
        "name": "Region Extents",
        "rules": [
            {
                "name": "Region Extents",
                "symbolizers": [
                    {
                        kind: "Fill",
                        outlineWidth: 3,
                        outlineOpacity: 1,
                        outlineColor: '#007d4d'
                    }
                ]
            }
        ]
    }
};

export const generateExtentLayer = (layerList) => {
    const jsonLayer = layerList.map(layer => ({
        type: "Feature",
        properties: {
            "datasetName": layer.datasetName
        },
        geometry: {
            type: "Polygon",
            coordinates: [[
                [layer.extent[0], layer.extent[1]],
                [layer.extent[0], layer.extent[3]],
                [layer.extent[2], layer.extent[3]],
                [layer.extent[2], layer.extent[1]],
                [layer.extent[0], layer.extent[1]]
            ]]
        }
    }));
    return jsonLayer;
};

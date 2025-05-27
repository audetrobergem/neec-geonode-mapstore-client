/**
 * This function extracts the bounding box of all the regions. It extracts all the geometry's 
 * coordinates and returns the bounding box in the format [xmin, ymin, xmax, ymax].
 */
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

/**
 * This function extracts the bounding box of an entity. It extracts all the geometry's 
 * coordinates and returns the bounding box in the format [xmin, ymin, xmax, ymax].
 */
export const extractBboxFromGeometry = (geometry) => {
    var xList = geometry.map(function(x) {
        return x.x;
    });
    var yList = geometry.map(function(y) {
        return y.y;
    });

    return ([Math.min(...xList), Math.min(...yList), Math.max(...xList), Math.max(...yList)]);
};

/**
 * This function creates the json structure of an additional layer to be added to the map.
 */
export const generateExtentLayer = (layerList) => {
    const jsonLayer = layerList.map(layer => ({
        type: "Feature",
        properties: {
            datasetName: layer.datasetName,
            type: "project"
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

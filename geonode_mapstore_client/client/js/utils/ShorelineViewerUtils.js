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

export const DEFAULT_POINT_STYLE = {
    radius: 10,
    weight: 3,
    color: '#33eeff',
    opacity: 0.9,
    fillColor: '#33eeff',
    fillOpacity: 0
};

export const DEFAULT_LINE_STYLE = {
    weight: 8,
    color: '#33eeff',
    opacity: 0.8,
    fillColor: '#33eeff',
    fillOpacity: 0.8
};

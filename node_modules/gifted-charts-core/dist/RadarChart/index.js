var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { radarChartDefaults } from '../utils/constants';
export var useRadarChart = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    var _4 = props.circular, circular = _4 === void 0 ? false : _4, _5 = props.gridConfig, gridConfig = _5 === void 0 ? {} : _5, _6 = props.polygonConfig, polygonConfig = _6 === void 0 ? {} : _6, _7 = props.data, data = _7 === void 0 ? [] : _7, dataSet = props.dataSet, _8 = props.noOfSections, noOfSections = _8 === void 0 ? radarChartDefaults.noOfSections : _8, _9 = props.chartSize, chartSize = _9 === void 0 ? radarChartDefaults.chartSize : _9, _10 = props.labelConfig, labelConfig = _10 === void 0 ? {} : _10, labelConfigArray = props.labelConfigArray, _11 = props.asterLinesConfig, asterLinesConfig = _11 === void 0 ? {} : _11, _12 = props.hideGrid, hideGrid = _12 === void 0 ? radarChartDefaults.hideGrid : _12, _13 = props.hideLabels, hideLabels = _13 === void 0 ? radarChartDefaults.hideLabels : _13, _14 = props.hideAsterLines, hideAsterLines = _14 === void 0 ? (_a = props.hideGrid) !== null && _a !== void 0 ? _a : radarChartDefaults.hideAsterLines : _14, _15 = props.dataLabelsConfig, dataLabelsConfig = _15 === void 0 ? {} : _15, _16 = props.labelsPositionOffset, labelsPositionOffset = _16 === void 0 ? radarChartDefaults.labelsPositionOffset : _16, _17 = props.dataLabelsPositionOffset, dataLabelsPositionOffset = _17 === void 0 ? radarChartDefaults.dataLabelsPositionOffset : _17, _18 = props.isAnimated, isAnimated = _18 === void 0 ? radarChartDefaults.isAnimated : _18, _19 = props.animationDuration, animationDuration = _19 === void 0 ? radarChartDefaults.animationDuration : _19, _20 = props.animateTogether, animateTogether = _20 === void 0 ? radarChartDefaults.animateTogether : _20, _21 = props.startAngle, startAngle = _21 === void 0 ? radarChartDefaults.startAngle : _21, _22 = props.isClockWise, isClockWise = _22 === void 0 ? radarChartDefaults.isClockWise : _22;
    var chartContainerProps = {
        height: (_c = (_b = props.chartContainerProps) === null || _b === void 0 ? void 0 : _b.height) !== null && _c !== void 0 ? _c : chartSize,
        width: (_e = (_d = props.chartContainerProps) === null || _d === void 0 ? void 0 : _d.width) !== null && _e !== void 0 ? _e : chartSize,
        shiftX: (_g = (_f = props.chartContainerProps) === null || _f === void 0 ? void 0 : _f.shiftX) !== null && _g !== void 0 ? _g : radarChartDefaults.chartContainerProps.shiftX,
        shiftY: (_j = (_h = props.chartContainerProps) === null || _h === void 0 ? void 0 : _h.shiftY) !== null && _j !== void 0 ? _j : radarChartDefaults.chartContainerProps.shiftY,
        backgroundColor: (_l = (_k = props.chartContainerProps) === null || _k === void 0 ? void 0 : _k.backgroundColor) !== null && _l !== void 0 ? _l : radarChartDefaults.chartContainerProps.backgroundColor
    };
    var labels = (_q = (_m = props.labels) !== null && _m !== void 0 ? _m : (_p = ((_o = dataSet === null || dataSet === void 0 ? void 0 : dataSet[0]) !== null && _o !== void 0 ? _o : data)) === null || _p === void 0 ? void 0 : _p.map(function (_, index) { return "Label".concat(index + 1); })) !== null && _q !== void 0 ? _q : [];
    var getMax = function (dataSet) {
        return dataSet.reduce(function (acc, set) {
            var max = Math.max.apply(Math, __spreadArray([], __read(set), false));
            return max > acc ? max : acc;
        }, 0);
    };
    var maxValue = (_r = props.maxValue) !== null && _r !== void 0 ? _r : (dataSet ? Math.max(getMax(dataSet !== null && dataSet !== void 0 ? dataSet : [])) : Math.max.apply(Math, __spreadArray([], __read((data !== null && data !== void 0 ? data : [])), false)));
    var dataLabels = (_s = props.dataLabels) !== null && _s !== void 0 ? _s : (polygonConfig.showDataValuesAsLabels
        ? data.map(function (d) { return d.toString(); })
        : null);
    var polarToCartesian = function (angle, value) {
        var radians = (Math.PI / 180) * angle;
        return {
            x: center + radius * (value / maxValue) * Math.cos(radians),
            y: center - radius * (value / maxValue) * Math.sin(radians)
        };
    };
    var center = chartSize / 2;
    var radius = center * 0.8;
    var _23 = gridConfig.stroke, gridStroke = _23 === void 0 ? radarChartDefaults.gridSection.stroke : _23, _24 = gridConfig.strokeWidth, gridStrokeWidth = _24 === void 0 ? radarChartDefaults.gridSection.strokeWidth : _24, _25 = gridConfig.strokeDashArray, gridStrokeDashArray = _25 === void 0 ? radarChartDefaults.gridSection
        .strokeDashArray : _25, _26 = gridConfig.fill, gridFill = _26 === void 0 ? radarChartDefaults.gridSection.fill : _26, _27 = gridConfig.gradientColor, gridGradientColor = _27 === void 0 ? radarChartDefaults.gridSection
        .gradientColor : _27, _28 = gridConfig.showGradient, gridShowGradient = _28 === void 0 ? radarChartDefaults.gridSection
        .showGradient : _28, _29 = gridConfig.opacity, gridOpacity = _29 === void 0 ? radarChartDefaults.gridSection.opacity : _29, _30 = gridConfig.gradientOpacity, gridGradientOpacity = _30 === void 0 ? radarChartDefaults.gridSection
        .gradientOpacity : _30;
    var gridSections = (_u = (_t = gridConfig.gridSections) === null || _t === void 0 ? void 0 : _t.map(function (i) { return (__assign(__assign({}, radarChartDefaults.gridSection), i)); })) !== null && _u !== void 0 ? _u : Array(noOfSections).fill({});
    var _31 = labelConfig.fontSize, fontSize = _31 === void 0 ? radarChartDefaults.labelConfig.fontSize : _31, _32 = labelConfig.stroke, stroke = _32 === void 0 ? radarChartDefaults.labelConfig.stroke : _32, _33 = labelConfig.textAnchor, textAnchor = _33 === void 0 ? radarChartDefaults.labelConfig.textAnchor : _33, _34 = labelConfig.alignmentBaseline, alignmentBaseline = _34 === void 0 ? radarChartDefaults.labelConfig.alignmentBaseline : _34, _35 = labelConfig.fontWeight, fontWeight = _35 === void 0 ? radarChartDefaults.labelConfig.fontWeight : _35, _36 = labelConfig.fontFamily, fontFamily = _36 === void 0 ? radarChartDefaults.labelConfig.fontFamily : _36;
    var _37 = dataLabelsConfig.fontSize, dataLabelsFontSize = _37 === void 0 ? fontSize : _37, // defaults to labelConfig (from above)
    _38 = dataLabelsConfig.stroke, // defaults to labelConfig (from above)
    dataLabelsColor = _38 === void 0 ? stroke : _38, // defaults to labelConfig (from above)
    _39 = dataLabelsConfig.textAnchor, // defaults to labelConfig (from above)
    dataLabelsTextAnchor = _39 === void 0 ? textAnchor : _39, // defaults to labelConfig (from above)
    _40 = dataLabelsConfig.alignmentBaseline, // defaults to labelConfig (from above)
    dataLabelsAlignmentBaseline = _40 === void 0 ? alignmentBaseline : _40, // defaults to labelConfig (from above)
    _41 = dataLabelsConfig.fontWeight, // defaults to labelConfig (from above)
    dataLabelsFontWeight = _41 === void 0 ? fontWeight : _41, // defaults to labelConfig (from above)
    _42 = dataLabelsConfig.fontFamily // defaults to labelConfig (from above)
    , // defaults to labelConfig (from above)
    dataLabelsFontFamily = _42 === void 0 ? fontFamily : _42 // defaults to labelConfig (from above)
    ;
    var _43 = polygonConfig.stroke, polygonStroke = _43 === void 0 ? radarChartDefaults.polygonConfig.stroke : _43, _44 = polygonConfig.strokeWidth, polygonStrokeWidth = _44 === void 0 ? radarChartDefaults.polygonConfig
        .strokeWidth : _44, _45 = polygonConfig.strokeDashArray, polygonStrokeDashArray = _45 === void 0 ? radarChartDefaults.polygonConfig
        .strokeDashArray : _45, _46 = polygonConfig.fill, polygonFill = _46 === void 0 ? radarChartDefaults.polygonConfig.fill : _46, _47 = polygonConfig.gradientColor, polygonGradientColor = _47 === void 0 ? radarChartDefaults.polygonConfig
        .gradientColor : _47, _48 = polygonConfig.showGradient, polygonShowGradient = _48 === void 0 ? radarChartDefaults.polygonConfig
        .showGradient : _48, _49 = polygonConfig.opacity, polygonOpacity = _49 === void 0 ? radarChartDefaults.polygonConfig.opacity : _49, _50 = polygonConfig.gradientOpacity, polygonGradientOpacity = _50 === void 0 ? polygonOpacity : _50, showDataValuesAsLabels = polygonConfig.showDataValuesAsLabels, _51 = polygonConfig.isAnimated, polygonIsAnimated = _51 === void 0 ? isAnimated : _51, _52 = polygonConfig.animationDuration, polygonAnimationDuration = _52 === void 0 ? animationDuration : _52;
    var polygonConfigArray = (_w = (_v = props.polygonConfigArray) === null || _v === void 0 ? void 0 : _v.map(function (set) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        return ({
            stroke: (_a = set.stroke) !== null && _a !== void 0 ? _a : polygonStroke,
            strokeWidth: (_b = set.strokeWidth) !== null && _b !== void 0 ? _b : polygonStrokeWidth,
            strokeDashArray: (_c = set.strokeDashArray) !== null && _c !== void 0 ? _c : polygonStrokeDashArray,
            fill: (_d = set.fill) !== null && _d !== void 0 ? _d : polygonFill,
            gradientColor: (_e = set.gradientColor) !== null && _e !== void 0 ? _e : polygonGradientColor,
            showGradient: (_f = set.showGradient) !== null && _f !== void 0 ? _f : polygonShowGradient,
            opacity: (_g = set.opacity) !== null && _g !== void 0 ? _g : polygonOpacity,
            gradientOpacity: (_h = set.gradientOpacity) !== null && _h !== void 0 ? _h : polygonGradientOpacity,
            showDataValuesAsLabels: (_j = set.showDataValuesAsLabels) !== null && _j !== void 0 ? _j : showDataValuesAsLabels,
            isAnimated: (_k = set.isAnimated) !== null && _k !== void 0 ? _k : polygonIsAnimated,
            animationDuration: (_l = set.animationDuration) !== null && _l !== void 0 ? _l : polygonAnimationDuration
        });
    })) !== null && _w !== void 0 ? _w : (dataSet
        ? Array(dataSet.length).fill({
            stroke: polygonStroke,
            strokeWidth: polygonStrokeWidth,
            strokeDashArray: polygonStrokeDashArray,
            fill: polygonFill,
            gradientColor: polygonGradientColor,
            showGradient: polygonShowGradient,
            opacity: polygonOpacity,
            gradientOpacity: polygonGradientOpacity,
            showDataValuesAsLabels: showDataValuesAsLabels,
            isAnimated: polygonIsAnimated,
            animationDuration: polygonAnimationDuration
        })
        : null);
    var dataLabelsArray = (_x = props.dataLabelsArray) !== null && _x !== void 0 ? _x : polygonConfigArray === null || polygonConfigArray === void 0 ? void 0 : polygonConfigArray.map(function (polygonItem, index) {
        return polygonItem.showDataValuesAsLabels ? data.map(function (d) { return d.toString(); }) : null;
    });
    var dataLabelsConfigArray = (_z = (_y = props.dataLabelsConfigArray) === null || _y === void 0 ? void 0 : _y.map(function (dataLabelsConfigItem) {
        var _a, _b, _c, _d, _e, _f;
        return ({
            fontSize: (_a = dataLabelsConfigItem.fontSize) !== null && _a !== void 0 ? _a : dataLabelsFontSize,
            stroke: (_b = dataLabelsConfigItem.stroke) !== null && _b !== void 0 ? _b : dataLabelsColor,
            textAnchor: (_c = dataLabelsConfigItem.textAnchor) !== null && _c !== void 0 ? _c : dataLabelsTextAnchor,
            alignmentBaseline: (_d = dataLabelsConfigItem.alignmentBaseline) !== null && _d !== void 0 ? _d : dataLabelsAlignmentBaseline,
            fontWeight: (_e = dataLabelsConfigItem.fontWeight) !== null && _e !== void 0 ? _e : dataLabelsFontWeight,
            fontFamily: (_f = dataLabelsConfigItem.fontFamily) !== null && _f !== void 0 ? _f : dataLabelsFontFamily
        });
    })) !== null && _z !== void 0 ? _z : Array(data.length).fill({
        fontSize: dataLabelsFontSize,
        stroke: dataLabelsColor,
        textAnchor: dataLabelsTextAnchor,
        alignmentBaseline: dataLabelsAlignmentBaseline,
        fontWeight: dataLabelsFontWeight,
        fontFamily: dataLabelsFontFamily
    });
    var dataLabelsConfigSet = (_1 = (_0 = props.dataLabelsConfigSet) === null || _0 === void 0 ? void 0 : _0.map(function (dataLabelConfigSetItem) {
        return dataLabelConfigSetItem.map(function (dataLabelConfigItem) {
            var _a, _b, _c, _d, _e, _f;
            return ({
                fontSize: (_a = dataLabelConfigItem.fontSize) !== null && _a !== void 0 ? _a : dataLabelsFontSize,
                stroke: (_b = dataLabelConfigItem.stroke) !== null && _b !== void 0 ? _b : dataLabelsColor,
                textAnchor: (_c = dataLabelConfigItem.textAnchor) !== null && _c !== void 0 ? _c : dataLabelsTextAnchor,
                alignmentBaseline: (_d = dataLabelConfigItem.alignmentBaseline) !== null && _d !== void 0 ? _d : dataLabelsAlignmentBaseline,
                fontWeight: (_e = dataLabelConfigItem.fontWeight) !== null && _e !== void 0 ? _e : dataLabelsFontWeight,
                fontFamily: (_f = dataLabelConfigItem.fontFamily) !== null && _f !== void 0 ? _f : dataLabelsFontFamily
            });
        });
    })) !== null && _1 !== void 0 ? _1 : (dataSet ? Array(dataSet.length).fill(dataLabelsConfigArray) : null);
    var _53 = asterLinesConfig.stroke, asterLinesStroke = _53 === void 0 ? gridStroke : _53, _54 = asterLinesConfig.strokeWidth, asterLinesStrokeWidth = _54 === void 0 ? gridStrokeWidth : _54, _55 = asterLinesConfig.strokeDashArray, asterLinesStrokeDashArray = _55 === void 0 ? radarChartDefaults.asterLineStrokeDashArray : _55;
    // Calculate angles for each category
    var angleStep = (360 / labels.length) * (isClockWise ? -1 : 1);
    // Generate coordinates for the data points
    var points = data.map(function (value, index) {
        var angle = index * angleStep + startAngle;
        return polarToCartesian(angle, value);
    });
    var initialPoints = data.map(function (value, index) {
        var angle = index * angleStep + startAngle;
        return polarToCartesian(angle, 0);
    });
    var pointsArray = (_2 = dataSet === null || dataSet === void 0 ? void 0 : dataSet.map(function (set) {
        return set.map(function (value, index) {
            var angle = index * angleStep + startAngle;
            return polarToCartesian(angle, value);
        });
    })) !== null && _2 !== void 0 ? _2 : [];
    var initialPointsArray = (_3 = dataSet === null || dataSet === void 0 ? void 0 : dataSet.map(function (set) {
        return set.map(function (value, index) {
            var angle = index * angleStep + startAngle;
            return polarToCartesian(angle, 0);
        });
    })) !== null && _3 !== void 0 ? _3 : [];
    // Generate the polygon points for the radar chart (in SVG "x,y" format)
    var polygonPoints = points.map(function (point) { return "".concat(point.x, ",").concat(point.y); }).join(' ');
    var initialPolygonPoints = initialPoints
        .map(function (point) { return "".concat(point.x, ",").concat(point.y); })
        .join(' ');
    var polygonPointsArray = pointsArray.map(function (set) {
        return set.map(function (point) { return "".concat(point.x, ",").concat(point.y); }).join(' ');
    });
    var initialPolygonPointsArray = initialPointsArray.map(function (set) {
        return set.map(function (point) { return "".concat(point.x, ",").concat(point.y); }).join(' ');
    });
    var getGridLevelProps = function (gridItem, ind) {
        var level = noOfSections - ind;
        var gridGradientColorLocal = gridItem.gradientColor || gridGradientColor;
        var gridFillColorLocal = gridItem.fill || gridFill;
        var gridOpacityLocal = gridItem.opacity || gridOpacity;
        var gridGradientOpacityLocal = gridItem.gradientOpacity || gridGradientOpacity;
        var gridStrokeLocal = gridItem.stroke || gridStroke;
        var gridStrokeWidthLocal = gridItem.strokeWidth || gridStrokeWidth;
        var gridShowGradientLocal = gridItem.showGradient || gridShowGradient;
        var gridStrokeDashArrayLocal = gridItem.strokeDashArray || gridStrokeDashArray;
        var levelPoints = labels.map(function (_, index) {
            var angle = index * angleStep + startAngle;
            return polarToCartesian(angle, (level / noOfSections) * maxValue);
        });
        var levelPolygonPoints = levelPoints
            .map(function (point) { return "".concat(point.x, ",").concat(point.y); })
            .join(' ');
        var r = radius * (level / noOfSections);
        return {
            level: level,
            gridGradientColorLocal: gridGradientColorLocal,
            gridFillColorLocal: gridFillColorLocal,
            gridOpacityLocal: gridOpacityLocal,
            gridGradientOpacityLocal: gridGradientOpacityLocal,
            gridStrokeLocal: gridStrokeLocal,
            gridStrokeWidthLocal: gridStrokeWidthLocal,
            gridShowGradientLocal: gridShowGradientLocal,
            gridStrokeDashArrayLocal: gridStrokeDashArrayLocal,
            levelPoints: levelPoints,
            levelPolygonPoints: levelPolygonPoints,
            r: r
        };
    };
    return {
        data: data,
        dataSet: dataSet,
        center: center,
        radius: radius,
        chartSize: chartSize,
        chartContainerProps: chartContainerProps,
        noOfSections: noOfSections,
        polarToCartesian: polarToCartesian,
        labels: labels,
        labelConfigArray: labelConfigArray,
        labelsPositionOffset: labelsPositionOffset,
        dataLabelsConfigArray: dataLabelsConfigArray,
        maxValue: maxValue,
        dataLabels: dataLabels,
        dataLabelsArray: dataLabelsArray,
        dataLabelsConfigSet: dataLabelsConfigSet,
        gridSections: gridSections,
        gridStroke: gridStroke,
        gridStrokeWidth: gridStrokeWidth,
        gridStrokeDashArray: gridStrokeDashArray,
        gridFill: gridFill,
        gridGradientColor: gridGradientColor,
        gridShowGradient: gridShowGradient,
        gridOpacity: gridOpacity,
        gridGradientOpacity: gridGradientOpacity,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontFamily: fontFamily,
        stroke: stroke,
        textAnchor: textAnchor,
        alignmentBaseline: alignmentBaseline,
        dataLabelsFontSize: dataLabelsFontSize,
        dataLabelsColor: dataLabelsColor,
        dataLabelsTextAnchor: dataLabelsTextAnchor,
        dataLabelsAlignmentBaseline: dataLabelsAlignmentBaseline,
        dataLabelsPositionOffset: dataLabelsPositionOffset,
        dataLabelsFontWeight: dataLabelsFontWeight,
        dataLabelsFontFamily: dataLabelsFontFamily,
        polygonStroke: polygonStroke,
        polygonStrokeWidth: polygonStrokeWidth,
        polygonStrokeDashArray: polygonStrokeDashArray,
        polygonFill: polygonFill,
        polygonGradientColor: polygonGradientColor,
        polygonShowGradient: polygonShowGradient,
        polygonOpacity: polygonOpacity,
        polygonGradientOpacity: polygonGradientOpacity,
        polygonConfigArray: polygonConfigArray,
        polygonIsAnimated: polygonIsAnimated,
        polygonAnimationDuration: polygonAnimationDuration,
        asterLinesStroke: asterLinesStroke,
        asterLinesStrokeWidth: asterLinesStrokeWidth,
        asterLinesStrokeDashArray: asterLinesStrokeDashArray,
        points: points,
        initialPoints: initialPoints,
        polygonPoints: polygonPoints,
        initialPolygonPoints: initialPolygonPoints,
        polygonPointsArray: polygonPointsArray,
        initialPolygonPointsArray: initialPolygonPointsArray,
        angleStep: angleStep,
        circular: circular,
        hideGrid: hideGrid,
        hideLabels: hideLabels,
        hideAsterLines: hideAsterLines,
        getGridLevelProps: getGridLevelProps,
        animateTogether: animateTogether,
        startAngle: startAngle
    };
};

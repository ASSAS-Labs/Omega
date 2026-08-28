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
import { AxesAndRulesDefaults, BarDefaults, RANGE_ENTER, RANGE_EXIT, STOP, defaultCurvature, defaultLineConfig, loc } from './constants';
import { CurveType, Framework } from './types';
export var getCumulativeWidth = function (data, index, spacing) {
    var cumWidth = 0;
    for (var i = 0; i < index; i++) {
        var barWidth = data[i].barWidth;
        barWidth = barWidth !== null && barWidth !== void 0 ? barWidth : 30;
        cumWidth += barWidth + (spacing !== null && spacing !== void 0 ? spacing : 20);
    }
    return cumWidth;
};
export var getLighterColor = function (color) {
    var r;
    var g;
    var b;
    var lighter = '#';
    if (color.startsWith('#')) {
        if (color.length < 7) {
            r = parseInt(color[1], 16);
            g = parseInt(color[2], 16);
            b = parseInt(color[3], 16);
            if (r < 14) {
                r += 2;
                lighter += r.toString(16);
            }
            if (g < 14) {
                g += 2;
                lighter += g.toString(16);
            }
            if (b < 14) {
                b += 2;
                lighter += b.toString(16);
            }
        }
        else {
            r = parseInt(color[1] + color[2], 16);
            g = parseInt(color[3] + color[4], 16);
            b = parseInt(color[5] + color[6], 16);
            if (r < 224) {
                r += 32;
                lighter += r.toString(16);
            }
            if (g < 224) {
                g += 32;
                lighter += g.toString(16);
            }
            if (b < 224) {
                b += 32;
                lighter += b.toString(16);
            }
        }
    }
    return lighter;
};
export var svgQuadraticCurvePath = function (points) {
    var path = 'M' + points[0][0] + ',' + points[0][1];
    for (var i = 0; i < points.length - 1; i++) {
        var xMid = (points[i][0] + points[i + 1][0]) / 2;
        var yMid = (points[i][1] + points[i + 1][1]) / 2;
        var cpX1 = (xMid + points[i][0]) / 2;
        var cpX2 = (xMid + points[i + 1][0]) / 2;
        path +=
            ' Q ' +
                cpX1 +
                ',' +
                points[i][1] +
                ', ' +
                xMid +
                ',' +
                yMid +
                (' Q' +
                    cpX2 +
                    ',' +
                    points[i + 1][1] +
                    ', ' +
                    points[i + 1][0] +
                    ',' +
                    points[i + 1][1]);
    }
    return path;
};
export var svgPath = function (points, curveType, curvature) {
    if (!(points === null || points === void 0 ? void 0 : points.length))
        return '';
    if (curveType === CurveType.QUADRATIC) {
        return svgQuadraticCurvePath(points);
    }
    // build the d attributes by looping over the points
    var d = points.reduce(function (acc, point, i, a) {
        return i === 0
            ? "M".concat(point[0], ",").concat(point[1])
            : "".concat(acc, " ").concat(bezierCommand(point, i, a, curvature !== null && curvature !== void 0 ? curvature : defaultCurvature));
    }, '');
    return d;
};
var line = function (pointA, pointB) {
    var lengthX = pointB[0] - pointA[0];
    var lengthY = pointB[1] - pointA[1];
    return {
        length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
        angle: Math.atan2(lengthY, lengthX)
    };
};
var controlPoint = function (curvature, current, previous, next, reverse) {
    // When 'current' is the first or last point of the array
    // 'previous' or 'next' don't exist.
    // Replace with 'current'
    var p = previous !== null && previous !== void 0 ? previous : current;
    var n = next !== null && next !== void 0 ? next : current;
    // The smoothing ratio
    var smoothing = curvature;
    // Properties of the opposed-line
    var o = line(p, n);
    // If is end-control-point, add PI to the angle to go backward
    var angle = o.angle + (reverse ? Math.PI : 0);
    var length = o.length * smoothing;
    // The control point position is relative to the current point
    var x = current[0] + Math.cos(angle) * length;
    var y = current[1] + Math.sin(angle) * length;
    return [x, y];
};
export var bezierCommand = function (point, i, a, curvature) {
    // start control point
    var _a = __read(controlPoint(curvature, a[i - 1], a[i - 2], point), 2), cpsX = _a[0], cpsY = _a[1];
    // end control point
    var _b = __read(controlPoint(curvature, point, a[i - 1], a[i + 1], true), 2), cpeX = _b[0], cpeY = _b[1];
    return "C".concat(cpsX, ",").concat(cpsY, " ").concat(cpeX, ",").concat(cpeY, " ").concat(point[0], ",").concat(point[1]);
};
export var getSegmentString = function (lineSegment, index, startDelimeter, endDelimeter, stepChart) {
    var _a;
    var segment = lineSegment === null || lineSegment === void 0 ? void 0 : lineSegment.find(function (segment) { return segment.startIndex === index; });
    if (segment) {
        if (stepChart) {
            segment = __assign(__assign({}, segment), { endIndex: ((_a = segment === null || segment === void 0 ? void 0 : segment.endIndex) !== null && _a !== void 0 ? _a : 0) * 2 });
        }
        return startDelimeter + JSON.stringify(segment) + endDelimeter;
    }
    return '';
};
export var getCurvePathWithSegments = function (path, lineSegment, startDelimeter, endDelimeter, curveType) {
    if (!(lineSegment === null || lineSegment === void 0 ? void 0 : lineSegment.length))
        return path;
    var char = curveType === CurveType.QUADRATIC ? 'Q ' : 'C'; // space after Q is intentional, it signifies the first Q as their are 2 Qs equivalent to 1 C, and to counter this, we placed space after the 1st Q
    var newPath = '';
    var pathArray = path.split(char);
    var _loop_1 = function (i) {
        var segment = lineSegment === null || lineSegment === void 0 ? void 0 : lineSegment.find(function (segment) { return segment.startIndex === i; });
        newPath +=
            (pathArray[i].startsWith('M') ? '' : char) +
                pathArray[i] +
                (segment ? startDelimeter + JSON.stringify(segment) + endDelimeter : '');
    };
    for (var i = 0; i < pathArray.length; i++) {
        _loop_1(i);
    }
    return newPath;
};
export var getPreviousSegmentsLastPoint = function (isCurved, previousSegment) {
    var prevSegmentLastPoint = isCurved
        ? previousSegment.substring(previousSegment.trim().lastIndexOf(' '))
        : previousSegment
            .substring(previousSegment.lastIndexOf('L'))
            .replace('L', 'M');
    return ((prevSegmentLastPoint.trim()[0] === 'M' ? '' : 'M') + prevSegmentLastPoint);
};
export var getPathWithHighlight = function (data, i, highlightedRange, startIndex, endIndex, spacingArray, getX, getY) {
    var path = '';
    var from = highlightedRange.from, to = highlightedRange.to;
    var currentPointRegion = data[i].value < from ? loc.DOWN : data[i].value > to ? loc.UP : loc.IN;
    if (i !== endIndex) {
        var nextPointRegion = data[i + 1].value < from
            ? loc.DOWN
            : data[i + 1].value > to
                ? loc.UP
                : loc.IN;
        if (currentPointRegion !== nextPointRegion ||
            (i === startIndex && currentPointRegion === loc.IN)) {
            var x1 = getX(spacingArray, i);
            var y1 = getY(data[i].value);
            var x2 = getX(spacingArray, i + 1);
            var y2 = getY(data[i + 1].value);
            var m = (y2 - y1) / (x2 - x1);
            var x = 0;
            var y = 0;
            if (i === startIndex && currentPointRegion === loc.IN) {
                // If the 1st point lies IN
                y = y1;
                x = x1;
                path +=
                    'L' +
                        x +
                        ' ' +
                        y +
                        ' ' +
                        RANGE_ENTER +
                        JSON.stringify(highlightedRange) +
                        STOP;
                if (nextPointRegion === loc.UP) {
                    y = getY(to);
                    x = (y - y1) / m + x1;
                    path += 'L' + x + ' ' + y + ' ' + RANGE_EXIT;
                }
                else if (nextPointRegion === loc.DOWN) {
                    y = getY(from);
                    x = (y - y1) / m + x1;
                    path += 'L' + x + ' ' + y + ' ' + RANGE_EXIT;
                }
            }
            else if (currentPointRegion !== nextPointRegion) {
                if (currentPointRegion === loc.DOWN && nextPointRegion === loc.UP) {
                    // if current point is in DOWN and next point is in UP, then we will add 2 points to the the path
                    y = getY(from);
                    x = (y - y1) / m + x1;
                    path +=
                        'L' +
                            x +
                            ' ' +
                            y +
                            ' ' +
                            RANGE_ENTER +
                            JSON.stringify(highlightedRange) +
                            STOP;
                    y = getY(to);
                    x = (y - y1) / m + x1;
                    path += 'L' + x + ' ' + y + ' ' + RANGE_EXIT;
                }
                else if (currentPointRegion === loc.UP &&
                    nextPointRegion === loc.DOWN) {
                    // if current point is in UP and next point is in DOWN, then we will add 2 points to the the path
                    y = getY(to);
                    x = (y - y1) / m + x1;
                    path +=
                        'L' +
                            x +
                            ' ' +
                            y +
                            ' ' +
                            RANGE_ENTER +
                            JSON.stringify(highlightedRange) +
                            STOP;
                    y = getY(from);
                    x = (y - y1) / m + x1;
                    path += 'L' + x + ' ' + y + ' ' + RANGE_EXIT;
                }
                else {
                    if ((currentPointRegion === loc.UP && nextPointRegion === loc.IN) ||
                        (currentPointRegion === loc.IN && nextPointRegion === loc.UP)) {
                        y = getY(to);
                    }
                    else if ((currentPointRegion === loc.IN && nextPointRegion === loc.DOWN) ||
                        (currentPointRegion === loc.DOWN && nextPointRegion === loc.IN)) {
                        y = getY(from);
                    }
                    m = (y2 - y1) / (x2 - x1);
                    x = (y - y1) / m + x1;
                    var prefix = nextPointRegion === loc.IN
                        ? RANGE_ENTER + JSON.stringify(highlightedRange) + STOP
                        : RANGE_EXIT;
                    path += 'L' + x + ' ' + y + ' ' + prefix;
                }
            }
        }
    }
    else if (currentPointRegion === loc.IN) {
        // If the last point lies IN, add RANGE_EXIT
        path += RANGE_EXIT;
    }
    return path;
};
export var getRegionPathObjects = function (points, color, currentLineThickness, thickness, strokeDashArray, isCurved, startDelimeter, stop, endDelimeter, curveType) {
    var _a, _b;
    var ar = [{ d: '', color: '', strokeWidth: 0 }];
    var tempStr = points;
    var char = curveType === CurveType.QUADRATIC ? 'Q' : 'C';
    if (!points.startsWith(startDelimeter)) {
        /** ********************            line upto first segment                 *****************/
        var lineSvgProps = {
            d: points.substring(0, points.indexOf(startDelimeter)),
            color: color,
            strokeWidth: currentLineThickness || thickness
        };
        if (strokeDashArray) {
            lineSvgProps.strokeDashArray = strokeDashArray;
        }
        ar.push(lineSvgProps);
    }
    while (tempStr.includes(startDelimeter)) {
        var startDelimeterIndex = tempStr.indexOf(startDelimeter);
        var stopIndex = tempStr.indexOf(stop);
        var endDelimeterIndex = tempStr.indexOf(endDelimeter);
        var segmentConfigString = tempStr.substring(startDelimeterIndex + startDelimeter.length, stopIndex);
        var segmentConfig = JSON.parse(segmentConfigString);
        var segment = tempStr.substring(stopIndex + stop.length, endDelimeterIndex);
        var previousSegment = ar[ar.length - 1].d;
        var moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(isCurved, previousSegment);
        /** ********************            segment line                 *****************/
        var lineSvgProps = {
            d: moveToLastPointOfPreviousSegment + segment,
            color: (_a = segmentConfig.color) !== null && _a !== void 0 ? _a : color,
            strokeWidth: (_b = segmentConfig.thickness) !== null && _b !== void 0 ? _b : (currentLineThickness || thickness)
        };
        if (segmentConfig.strokeDashArray) {
            lineSvgProps.strokeDashArray = segmentConfig.strokeDashArray;
        }
        ar.push(lineSvgProps);
        tempStr = tempStr.substring(endDelimeterIndex + endDelimeter.length);
        var nextDelimiterIndex = tempStr.indexOf(startDelimeter);
        var stringUptoNextSegment = tempStr.substring(0, nextDelimiterIndex);
        /** ********************            line upto the next segment            *****************/
        if (nextDelimiterIndex !== -1 &&
            stringUptoNextSegment.includes(isCurved ? char : 'L')) {
            var previousSegment_1 = ar[ar.length - 1].d;
            var moveToLastPointOfPreviousSegment_1 = getPreviousSegmentsLastPoint(isCurved, previousSegment_1);
            var lineSvgProps_1 = {
                d: moveToLastPointOfPreviousSegment_1 + ' ' + stringUptoNextSegment,
                color: color,
                strokeWidth: currentLineThickness || thickness
            };
            if (strokeDashArray) {
                lineSvgProps_1.strokeDashArray = strokeDashArray;
            }
            ar.push(lineSvgProps_1);
        }
    }
    /** ********************            line after the last segment            *****************/
    if (tempStr.length) {
        var previousSegment = ar[ar.length - 1].d;
        var moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(isCurved, previousSegment);
        var lineSvgProps = {
            d: moveToLastPointOfPreviousSegment + tempStr,
            color: color,
            strokeWidth: currentLineThickness || thickness
        };
        if (strokeDashArray) {
            lineSvgProps.strokeDashArray = strokeDashArray;
        }
        ar.push(lineSvgProps);
    }
    ar.shift();
    return ar;
};
export var getSegmentedPathObjects = function (points, color, currentLineThickness, thickness, strokeDashArray, isCurved, startDelimeter, endDelimeter, curveType) {
    var _a, _b;
    var ar = [{ d: '', color: '', strokeWidth: 0 }];
    var tempStr = points;
    var char = curveType === CurveType.QUADRATIC ? 'Q' : 'C';
    if (!points.startsWith(startDelimeter)) {
        /** ********************            line upto first segment                 *****************/
        var lineSvgProps = {
            d: points.substring(0, points.indexOf(startDelimeter)),
            color: color,
            strokeWidth: currentLineThickness || thickness
        };
        if (strokeDashArray) {
            lineSvgProps.strokeDashArray = strokeDashArray;
        }
        ar.push(lineSvgProps);
    }
    while (tempStr.includes(startDelimeter)) {
        var startDelimeterIndex = tempStr.indexOf(startDelimeter);
        var endDelimeterIndex = tempStr.indexOf(endDelimeter);
        var segmentConfigString = tempStr.substring(startDelimeterIndex + startDelimeter.length, endDelimeterIndex);
        var segmentConfig = JSON.parse(segmentConfigString);
        var startIndex = segmentConfig.startIndex, endIndex = segmentConfig.endIndex;
        var segmentLength = endIndex - startIndex;
        var segment = tempStr.substring(endDelimeterIndex + endDelimeter.length);
        var c = 0;
        var s = 0;
        var i = void 0;
        for (i = 0; i < segment.length; i++) {
            if (segment[i] === (isCurved ? char : 'L')) {
                if (curveType === CurveType.QUADRATIC) {
                    if (segment[i + 1] == ' ')
                        c++;
                }
                else {
                    c++;
                }
            }
            if (c >= segmentLength) {
                if (segment[i] === ' ')
                    s++;
                if (s === (isCurved ? (char === 'Q' ? 5 : 3) : 2)) {
                    break;
                }
            }
        }
        segment = segment.substring(0, i);
        var previousSegment = ar[ar.length - 1].d;
        var moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(isCurved, previousSegment);
        /** ********************            segment line                 *****************/
        var lineSvgProps = {
            d: moveToLastPointOfPreviousSegment + segment,
            color: (_a = segmentConfig.color) !== null && _a !== void 0 ? _a : color,
            strokeWidth: (_b = segmentConfig.thickness) !== null && _b !== void 0 ? _b : (currentLineThickness || thickness)
        };
        if (segmentConfig.strokeDashArray) {
            lineSvgProps.strokeDashArray = segmentConfig.strokeDashArray;
        }
        ar.push(lineSvgProps);
        tempStr = tempStr.substring(endDelimeterIndex + endDelimeter.length + i);
        var nextDelimiterIndex = tempStr.indexOf(startDelimeter);
        var stringUptoNextSegment = tempStr.substring(0, nextDelimiterIndex);
        /** ********************            line upto the next segment            *****************/
        if (nextDelimiterIndex !== -1 &&
            stringUptoNextSegment.includes(isCurved ? char : 'L')) {
            var previousSegment_2 = ar[ar.length - 1].d;
            var moveToLastPointOfPreviousSegment_2 = getPreviousSegmentsLastPoint(isCurved, previousSegment_2);
            var lineSvgProps_2 = {
                d: moveToLastPointOfPreviousSegment_2 + ' ' + stringUptoNextSegment,
                color: color,
                strokeWidth: currentLineThickness || thickness
            };
            if (strokeDashArray) {
                lineSvgProps_2.strokeDashArray = strokeDashArray;
            }
            ar.push(lineSvgProps_2);
        }
    }
    /** ********************            line after the last segment            *****************/
    if (tempStr.length) {
        var previousSegment = ar[ar.length - 1].d;
        var moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(isCurved, previousSegment);
        var lineSvgProps = {
            d: moveToLastPointOfPreviousSegment + tempStr,
            color: color,
            strokeWidth: currentLineThickness || thickness
        };
        if (strokeDashArray) {
            lineSvgProps.strokeDashArray = strokeDashArray;
        }
        ar.push(lineSvgProps);
    }
    ar.shift();
    return ar;
};
export var getArrowPoints = function (arrowTipX, arrowTipY, x1, y1, arrowLength, arrowWidth, showArrowBase) {
    var dataLineSlope = (arrowTipY - y1) / (arrowTipX - x1);
    var d = arrowLength !== null && arrowLength !== void 0 ? arrowLength : 0;
    var d2 = (arrowWidth !== null && arrowWidth !== void 0 ? arrowWidth : 0) / 2;
    var interSectionX = arrowTipX - Math.sqrt((d * d) / (dataLineSlope * dataLineSlope + 1));
    var interSectionY = arrowTipY - dataLineSlope * (arrowTipX - interSectionX);
    var arrowBasex1, arrowBaseY1, arrowBaseX2, arrowBaseY2;
    if (dataLineSlope === 0) {
        arrowBasex1 = interSectionX;
        arrowBaseY1 = interSectionY - d2;
        arrowBaseX2 = interSectionX;
        arrowBaseY2 = interSectionY + d2;
    }
    else {
        var arrowBaseSlope = -1 / dataLineSlope;
        arrowBasex1 =
            interSectionX -
                Math.sqrt((d2 * d2) / (arrowBaseSlope * arrowBaseSlope + 1));
        arrowBaseY1 = interSectionY - arrowBaseSlope * (interSectionX - arrowBasex1);
        arrowBaseX2 =
            interSectionX +
                Math.sqrt((d2 * d2) / (arrowBaseSlope * arrowBaseSlope + 1));
        arrowBaseY2 = interSectionY + arrowBaseSlope * (interSectionX - arrowBasex1);
    }
    var arrowPoints = " M".concat(interSectionX, " ").concat(interSectionY);
    arrowPoints += " ".concat(showArrowBase ? 'L' : 'M').concat(arrowBasex1, " ").concat(arrowBaseY1);
    arrowPoints += " L".concat(arrowTipX, " ").concat(arrowTipY);
    arrowPoints += " M".concat(interSectionX, " ").concat(interSectionY);
    arrowPoints += " ".concat(showArrowBase ? 'L' : 'M').concat(arrowBaseX2, " ").concat(arrowBaseY2);
    arrowPoints += " L".concat(arrowTipX, " ").concat(arrowTipY);
    return arrowPoints;
};
export var getAxesAndRulesProps = function (props, containerHeight, stepHeight, stepValue, noOfSections, roundToDigits, negativeStepValue, secondaryMaxValue, secondaryMinItem, showSecondaryFractionalValues, secondaryRoundToDigits) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    var secondaryYAxis = typeof props.secondaryYAxis === 'boolean' ? {} : props.secondaryYAxis;
    var axesAndRulesProps = {
        yAxisSide: props.yAxisSide,
        yAxisLabelContainerStyle: props.yAxisLabelContainerStyle,
        yAxisColor: props.yAxisColor,
        yAxisExtraHeight: props.yAxisExtraHeight,
        trimYAxisAtTop: props.trimYAxisAtTop,
        overflowTop: ((_a = props.overflowTop) !== null && _a !== void 0 ? _a : props.secondaryXAxis)
            ? AxesAndRulesDefaults.overflowTopWithSecondaryXAxis
            : AxesAndRulesDefaults.overflowTop,
        yAxisThickness: props.yAxisThickness,
        xAxisColor: props.xAxisColor,
        xAxisLength: props.xAxisLength,
        xAxisType: props.xAxisType,
        xAxisTextNumberOfLines: (_b = props.xAxisTextNumberOfLines) !== null && _b !== void 0 ? _b : 1,
        xAxisThickness: (_c = props.xAxisThickness) !== null && _c !== void 0 ? _c : AxesAndRulesDefaults.xAxisThickness,
        xAxisLabelsHeight: props.xAxisLabelsHeight,
        xAxisLabelsVerticalShift: props.xAxisLabelsVerticalShift,
        dashWidth: props.dashWidth,
        dashGap: props.dashGap,
        backgroundColor: props.backgroundColor,
        hideRules: props.hideRules,
        rulesLength: props.rulesLength,
        rulesType: props.rulesType,
        rulesThickness: props.rulesThickness,
        rulesColor: props.rulesColor,
        rulesConfigArray: props.rulesConfigArray,
        showYAxisIndices: props.showYAxisIndices,
        yAxisIndicesHeight: props.yAxisIndicesHeight,
        yAxisIndicesWidth: props.yAxisIndicesWidth,
        yAxisIndicesColor: props.yAxisIndicesColor,
        hideOrigin: props.hideOrigin,
        hideYAxisText: props.hideYAxisText,
        yAxisTextNumberOfLines: props.yAxisTextNumberOfLines,
        yAxisLabelPrefix: props.yAxisLabelPrefix,
        yAxisLabelSuffix: props.yAxisLabelSuffix,
        yAxisTextStyle: props.yAxisTextStyle,
        referenceLinesConfig: {
            showReferenceLine1: props.showReferenceLine1,
            referenceLine1Position: props.referenceLine1Position,
            referenceLine1Config: props.referenceLine1Config,
            showReferenceLine2: props.showReferenceLine2,
            referenceLine2Position: props.referenceLine2Position,
            referenceLine2Config: props.referenceLine2Config,
            showReferenceLine3: props.showReferenceLine3,
            referenceLine3Position: props.referenceLine3Position,
            referenceLine3Config: props.referenceLine3Config,
            referenceLinesOverChartContent: props.referenceLinesOverChartContent
        },
        showVerticalLines: (_d = props.showVerticalLines) !== null && _d !== void 0 ? _d : (_f = ((_e = props.stackData) !== null && _e !== void 0 ? _e : props.data)) === null || _f === void 0 ? void 0 : _f.some(function (item) { return item.showVerticalLine; }),
        verticalLinesThickness: props.verticalLinesThickness,
        verticalLinesHeight: props.verticalLinesHeight,
        verticalLinesColor: props.verticalLinesColor,
        verticalLinesShift: props.verticalLinesShift,
        verticalLinesStrokeDashArray: props.verticalLinesStrokeDashArray,
        verticalLinesZIndex: props.verticalLinesZIndex,
        verticalLinesSpacing: props.verticalLinesSpacing,
        noOfVerticalLines: props.noOfVerticalLines,
        verticalLinesStrokeLinecap: props.verticalLinesStrokeLinecap,
        // specific to Line charts-
        verticalLinesUptoDataPoint: props.verticalLinesUptoDataPoint,
        roundToDigits: roundToDigits,
        stepValue: stepValue,
        negativeStepValue: negativeStepValue,
        secondaryYAxis: props.secondaryYAxis,
        formatYLabel: props.formatYLabel,
        secondaryXAxis: props.secondaryXAxis,
        secondaryYAxisConfig: {
            stepHeight: 0,
            stepValue: 0,
            negativeStepHeight: 0,
            negativeStepValue: 0,
            noOfSectionsBelowXAxis: 0
        }
    };
    if (((_g = props.secondaryYAxis) !== null && _g !== void 0 ? _g : (_h = props.lineConfig) === null || _h === void 0 ? void 0 : _h.isSecondary) &&
        secondaryMaxValue !== undefined &&
        secondaryYAxis &&
        secondaryYAxis.maxValue === undefined) {
        axesAndRulesProps.secondaryYAxis = __assign(__assign({}, secondaryYAxis), { maxValue: secondaryMaxValue });
    }
    var secondaryNoOfSections = ((_j = props.secondaryYAxis) !== null && _j !== void 0 ? _j : (_k = props.lineConfig) === null || _k === void 0 ? void 0 : _k.isSecondary)
        ? (_l = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.noOfSections) !== null && _l !== void 0 ? _l : noOfSections
        : 0;
    var secondaryStepValue = (_m = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.stepValue) !== null && _m !== void 0 ? _m : (secondaryNoOfSections
        ? ((_o = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.maxValue) !== null && _o !== void 0 ? _o : secondaryMaxValue) / secondaryNoOfSections
        : 0);
    var secondaryStepHeight = (_p = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.stepHeight) !== null && _p !== void 0 ? _p : (secondaryNoOfSections ? containerHeight / secondaryNoOfSections : 0);
    var secondaryNegativeStepValue = (_q = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.negativeStepValue) !== null && _q !== void 0 ? _q : secondaryStepValue;
    var secondaryNoOfSectionsBelowXAxis = (_r = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.noOfSectionsBelowXAxis) !== null && _r !== void 0 ? _r : (secondaryNegativeStepValue
        ? Math.ceil(((_s = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.mostNegativeValue) !== null && _s !== void 0 ? _s : secondaryMinItem) /
            -secondaryNegativeStepValue)
        : 0);
    axesAndRulesProps.secondaryYAxisConfig = __assign(__assign({}, secondaryYAxis), { stepHeight: secondaryStepHeight, stepValue: secondaryStepValue, negativeStepHeight: (_t = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.negativeStepHeight) !== null && _t !== void 0 ? _t : secondaryStepHeight, negativeStepValue: secondaryNegativeStepValue, noOfSectionsBelowXAxis: secondaryNoOfSectionsBelowXAxis, showFractionalValues: showSecondaryFractionalValues, roundToDigits: secondaryRoundToDigits });
    return axesAndRulesProps;
};
export var getExtendedContainerHeightWithPadding = function (containerHeight, overflowTop) { return containerHeight + (overflowTop !== null && overflowTop !== void 0 ? overflowTop : 0) + 10; };
export var getSecondaryDataWithOffsetIncluded = function (secondaryData, secondaryYAxis, showDataPointsForMissingValues, interpolateMissingValues, onlyPositive) {
    if (!secondaryData)
        return secondaryData;
    var nullishHandledData = getInterpolatedData(secondaryData, showDataPointsForMissingValues, interpolateMissingValues, onlyPositive);
    if (secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisOffset) {
        return nullishHandledData.map(function (item) {
            var _a;
            item.value = item.value - ((_a = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisOffset) !== null && _a !== void 0 ? _a : 0);
            return item;
        });
    }
    return nullishHandledData;
};
export var getArrowProperty = function (property, count, props, defaultArrowConfig) {
    var _a, _b, _c, _d;
    var arrowNumber = "arrowConfig".concat(count);
    return ((_d = (_b = (_a = props[arrowNumber]) === null || _a === void 0 ? void 0 : _a[property]) !== null && _b !== void 0 ? _b : (_c = props['arrowConfig']) === null || _c === void 0 ? void 0 : _c[property]) !== null && _d !== void 0 ? _d : defaultArrowConfig[property]);
};
export var getAllArrowProperties = function (props, defaultArrowConfig) {
    var _a, _b, _c, _d, _e, _f;
    var arrowLength1 = getArrowProperty('length', 1, props, defaultArrowConfig);
    var arrowWidth1 = getArrowProperty('width', 1, props, defaultArrowConfig);
    var arrowStrokeWidth1 = getArrowProperty('strokeWidth', 1, props, defaultArrowConfig);
    var arrowStrokeColor1 = getArrowProperty('strokeColor', 1, props, defaultArrowConfig);
    var arrowFillColor1 = getArrowProperty('fillColor', 1, props, defaultArrowConfig);
    var showArrowBase1 = getArrowProperty('showArrowBase', 1, props, defaultArrowConfig);
    var arrowLength2 = getArrowProperty('length', 2, props, defaultArrowConfig);
    var arrowWidth2 = getArrowProperty('width', 2, props, defaultArrowConfig);
    var arrowStrokeWidth2 = getArrowProperty('strokeWidth', 2, props, defaultArrowConfig);
    var arrowStrokeColor2 = getArrowProperty('strokeColor', 2, props, defaultArrowConfig);
    var arrowFillColor2 = getArrowProperty('fillColor', 2, props, defaultArrowConfig);
    var showArrowBase2 = getArrowProperty('showArrowBase', 2, props, defaultArrowConfig);
    var arrowLength3 = getArrowProperty('length', 3, props, defaultArrowConfig);
    var arrowWidth3 = getArrowProperty('width', 3, props, defaultArrowConfig);
    var arrowStrokeWidth3 = getArrowProperty('strokeWidth', 3, props, defaultArrowConfig);
    var arrowStrokeColor3 = getArrowProperty('strokeColor', 3, props, defaultArrowConfig);
    var arrowFillColor3 = getArrowProperty('fillColor', 3, props, defaultArrowConfig);
    var showArrowBase3 = getArrowProperty('showArrowBase', 3, props, defaultArrowConfig);
    var arrowLength4 = getArrowProperty('length', 4, props, defaultArrowConfig);
    var arrowWidth4 = getArrowProperty('width', 4, props, defaultArrowConfig);
    var arrowStrokeWidth4 = getArrowProperty('strokeWidth', 4, props, defaultArrowConfig);
    var arrowStrokeColor4 = getArrowProperty('strokeColor', 4, props, defaultArrowConfig);
    var arrowFillColor4 = getArrowProperty('fillColor', 4, props, defaultArrowConfig);
    var showArrowBase4 = getArrowProperty('showArrowBase', 4, props, defaultArrowConfig);
    var arrowLength5 = getArrowProperty('length', 5, props, defaultArrowConfig);
    var arrowWidth5 = getArrowProperty('width', 5, props, defaultArrowConfig);
    var arrowStrokeWidth5 = getArrowProperty('strokeWidth', 5, props, defaultArrowConfig);
    var arrowStrokeColor5 = getArrowProperty('strokeColor', 5, props, defaultArrowConfig);
    var arrowFillColor5 = getArrowProperty('fillColor', 5, props, defaultArrowConfig);
    var showArrowBase5 = getArrowProperty('showArrowBase', 5, props, defaultArrowConfig);
    var arrowLengthsFromSet = (_a = props.dataSet) === null || _a === void 0 ? void 0 : _a.map(function (item) { var _a, _b; return (_b = (_a = item === null || item === void 0 ? void 0 : item.arrowConfig) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : arrowLength1; });
    var arrowWidthsFromSet = (_b = props.dataSet) === null || _b === void 0 ? void 0 : _b.map(function (item) { var _a, _b; return (_b = (_a = item === null || item === void 0 ? void 0 : item.arrowConfig) === null || _a === void 0 ? void 0 : _a.width) !== null && _b !== void 0 ? _b : arrowWidth1; });
    var arrowStrokeWidthsFromSet = (_c = props.dataSet) === null || _c === void 0 ? void 0 : _c.map(function (item) { var _a, _b; return (_b = (_a = item === null || item === void 0 ? void 0 : item.arrowConfig) === null || _a === void 0 ? void 0 : _a.strokeWidth) !== null && _b !== void 0 ? _b : arrowStrokeWidth1; });
    var arrowStrokeColorsFromSet = (_d = props.dataSet) === null || _d === void 0 ? void 0 : _d.map(function (item) { var _a, _b; return (_b = (_a = item === null || item === void 0 ? void 0 : item.arrowConfig) === null || _a === void 0 ? void 0 : _a.strokeColor) !== null && _b !== void 0 ? _b : arrowStrokeColor1; });
    var arrowFillColorsFromSet = (_e = props.dataSet) === null || _e === void 0 ? void 0 : _e.map(function (item) { var _a, _b; return (_b = (_a = item === null || item === void 0 ? void 0 : item.arrowConfig) === null || _a === void 0 ? void 0 : _a.fillColor) !== null && _b !== void 0 ? _b : arrowFillColor1; });
    var showArrowBasesFromSet = (_f = props.dataSet) === null || _f === void 0 ? void 0 : _f.map(function (item) { var _a, _b; return (_b = (_a = item === null || item === void 0 ? void 0 : item.arrowConfig) === null || _a === void 0 ? void 0 : _a.showArrowBase) !== null && _b !== void 0 ? _b : showArrowBase1; });
    return {
        arrowLength1: arrowLength1,
        arrowWidth1: arrowWidth1,
        arrowStrokeWidth1: arrowStrokeWidth1,
        arrowStrokeColor1: arrowStrokeColor1,
        arrowFillColor1: arrowFillColor1,
        showArrowBase1: showArrowBase1,
        arrowLength2: arrowLength2,
        arrowWidth2: arrowWidth2,
        arrowStrokeWidth2: arrowStrokeWidth2,
        arrowStrokeColor2: arrowStrokeColor2,
        arrowFillColor2: arrowFillColor2,
        showArrowBase2: showArrowBase2,
        arrowLength3: arrowLength3,
        arrowWidth3: arrowWidth3,
        arrowStrokeWidth3: arrowStrokeWidth3,
        arrowStrokeColor3: arrowStrokeColor3,
        arrowFillColor3: arrowFillColor3,
        showArrowBase3: showArrowBase3,
        arrowLength4: arrowLength4,
        arrowWidth4: arrowWidth4,
        arrowStrokeWidth4: arrowStrokeWidth4,
        arrowStrokeColor4: arrowStrokeColor4,
        arrowFillColor4: arrowFillColor4,
        showArrowBase4: showArrowBase4,
        arrowLength5: arrowLength5,
        arrowWidth5: arrowWidth5,
        arrowStrokeWidth5: arrowStrokeWidth5,
        arrowStrokeColor5: arrowStrokeColor5,
        arrowFillColor5: arrowFillColor5,
        showArrowBase5: showArrowBase5,
        arrowLengthsFromSet: arrowLengthsFromSet,
        arrowWidthsFromSet: arrowWidthsFromSet,
        arrowStrokeWidthsFromSet: arrowStrokeWidthsFromSet,
        arrowStrokeColorsFromSet: arrowStrokeColorsFromSet,
        arrowFillColorsFromSet: arrowFillColorsFromSet,
        showArrowBasesFromSet: showArrowBasesFromSet
    };
};
export var indexOfFirstNonZeroDigit = function (num) {
    var numString = num.toString();
    var i = 0;
    var d = numString[i];
    while (i < numString.length - 2 && (isNaN(Number(d)) || d === '0')) {
        d = numString[++i];
    }
    return i;
};
export var maxAndMinUtil = function (maxItem, minItem, roundToDigits, showFractionalValues) {
    if (showFractionalValues !== null && showFractionalValues !== void 0 ? showFractionalValues : roundToDigits) {
        var range = maxItem - minItem;
        var stepValue = range / 10;
        maxItem += stepValue;
        minItem =
            minItem !== 0 ? minItem + (minItem < 0 ? -stepValue : stepValue) : minItem;
        // maxItem *= 10 * (roundToDigits ?? 1)
        // maxItem = maxItem + (10 - (maxItem % 10))
        // maxItem /= 10 * (roundToDigits ?? 1)
        // maxItem = parseFloat(maxItem.toFixed(roundToDigits ?? 1))
        // if (minItem !== 0) {
        //   minItem += minItem / 10
        // }
    }
    else {
        maxItem = maxItem + (10 - (maxItem % 10));
        if (minItem !== 0) {
            minItem *= 10;
            minItem = minItem - (10 + (minItem % 10));
            minItem /= 10;
        }
    }
    return { maxItem: maxItem, minItem: minItem };
};
export var computeMaxAndMinItems = function (data, extrapolateMissingValues, roundToDigits, showFractionalValues, propsData) {
    if (!(data === null || data === void 0 ? void 0 : data.length)) {
        return { maxItem: 0, minItem: 0 };
    }
    var maxItem = 0;
    var minItem = 0;
    data.forEach(function (item, index) {
        if (item.value > maxItem) {
            maxItem = item.value;
        }
        if (item.value < minItem &&
            (extrapolateMissingValues || (propsData === null || propsData === void 0 ? void 0 : propsData[index].value))) {
            minItem = item.value;
        }
    });
    return maxAndMinUtil(maxItem, minItem, roundToDigits, showFractionalValues);
};
export var computeMaxAndMinYForBubble = function (data, extrapolateMissingValues, roundToDigits, showFractionalValues, propsData) {
    if (!(data === null || data === void 0 ? void 0 : data.length)) {
        return { maxItem: 0, minItem: 0 };
    }
    var maxItem = 0;
    var minItem = 0;
    data.forEach(function (item, index) {
        if (item.y > maxItem) {
            maxItem = item.y;
        }
        if (item.y < minItem &&
            (extrapolateMissingValues || (propsData === null || propsData === void 0 ? void 0 : propsData[index].y))) {
            minItem = item.y;
        }
    });
    return maxAndMinUtil(maxItem, minItem, roundToDigits, showFractionalValues);
};
export var computeMaxAndMinXForBubble = function (data, extrapolateMissingValues, roundToDigits, showFractionalValues, propsData) {
    if (!(data === null || data === void 0 ? void 0 : data.length)) {
        return { maxItem: 0, minItem: 0 };
    }
    var maxItem = 0;
    var minItem = Infinity;
    data.forEach(function (item, index) {
        if (item.x > maxItem) {
            maxItem = item.x;
        }
        if (item.x < minItem &&
            (extrapolateMissingValues || (propsData === null || propsData === void 0 ? void 0 : propsData[index].x))) {
            minItem = item.x;
        }
    });
    return maxAndMinUtil(maxItem, minItem, roundToDigits, showFractionalValues);
};
export var getLabelTextUtil = function (val, index, showFractionalValues, yAxisLabelTexts, yAxisOffset, yAxisLabelPrefix, yAxisLabelSuffix, roundToDigits, formatYLabel) {
    var _a, _b;
    var label = '';
    if (showFractionalValues || (yAxisLabelTexts === null || yAxisLabelTexts === void 0 ? void 0 : yAxisLabelTexts[index]) !== undefined) {
        if (yAxisLabelTexts === null || yAxisLabelTexts === void 0 ? void 0 : yAxisLabelTexts[index])
            return val;
        if (val) {
            label = isNaN(Number(val))
                ? val
                : (Number(val) + (yAxisOffset !== null && yAxisOffset !== void 0 ? yAxisOffset : 0)).toFixed(roundToDigits);
        }
        else {
            label = (_a = yAxisOffset === null || yAxisOffset === void 0 ? void 0 : yAxisOffset.toString()) !== null && _a !== void 0 ? _a : '0';
        }
    }
    else {
        if (val) {
            label = val.toString().split('.')[0];
            label = (Number(label) + (yAxisOffset !== null && yAxisOffset !== void 0 ? yAxisOffset : 0)).toString();
        }
        else {
            label = (_b = yAxisOffset === null || yAxisOffset === void 0 ? void 0 : yAxisOffset.toString()) !== null && _b !== void 0 ? _b : '0';
        }
    }
    return (yAxisLabelPrefix +
        (formatYLabel ? formatYLabel(label) : label) +
        yAxisLabelSuffix);
};
export var getXForLineInBar = function (index, firstBarWidth, currentBarWidth, yAxisLabelWidth, lineConfig, spacing) {
    var _a;
    return yAxisLabelWidth +
        firstBarWidth / 2 +
        lineConfig.initialSpacing +
        (currentBarWidth + ((_a = lineConfig.spacing) !== null && _a !== void 0 ? _a : spacing)) * index +
        lineConfig.shiftX -
        lineConfig.dataPointsWidth / 2 -
        4;
};
export var getYForLineInBar = function (value, shiftY, containerHeight, maxValue, yAxisOffset) {
    return containerHeight -
        (shiftY !== null && shiftY !== void 0 ? shiftY : 0) -
        (((value !== null && value !== void 0 ? value : 0) - yAxisOffset) * containerHeight) / maxValue;
};
export var clone = function (obj) {
    if (obj === null || typeof obj !== 'object' || 'isActiveClone' in obj) {
        return obj;
    }
    var temp;
    if (obj instanceof Date)
        temp = new Date(obj);
    else
        temp = obj.constructor();
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            obj.isActiveClone = null;
            temp[key] = clone(obj[key]);
            delete obj.isActiveClone;
        }
    }
    return temp;
};
export var getLineConfigForBarChart = function (lineConfig, barInitialSpacing, focusedDataPointIndex, setFocusedDataPointIndex) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24;
    return {
        initialSpacing: (_b = (_a = lineConfig.initialSpacing) !== null && _a !== void 0 ? _a : barInitialSpacing) !== null && _b !== void 0 ? _b : defaultLineConfig.initialSpacing,
        spacing: lineConfig.spacing,
        curved: (_c = lineConfig.curved) !== null && _c !== void 0 ? _c : defaultLineConfig.curved,
        curvature: (_d = lineConfig.curvature) !== null && _d !== void 0 ? _d : defaultLineConfig.curvature,
        curveType: (_e = lineConfig.curveType) !== null && _e !== void 0 ? _e : defaultLineConfig.curveType,
        isAnimated: (_f = lineConfig.isAnimated) !== null && _f !== void 0 ? _f : defaultLineConfig.isAnimated,
        animationDuration: (_g = lineConfig.animationDuration) !== null && _g !== void 0 ? _g : defaultLineConfig.animationDuration,
        thickness: (_h = lineConfig.thickness) !== null && _h !== void 0 ? _h : defaultLineConfig.thickness,
        color: (_j = lineConfig.color) !== null && _j !== void 0 ? _j : defaultLineConfig.color,
        strokeDashArray: (_k = lineConfig.strokeDashArray) !== null && _k !== void 0 ? _k : [0, 0],
        hideDataPoints: (_l = lineConfig.hideDataPoints) !== null && _l !== void 0 ? _l : defaultLineConfig.hideDataPoints,
        dataPointsShape: (_m = lineConfig.dataPointsShape) !== null && _m !== void 0 ? _m : defaultLineConfig.dataPointsShape,
        dataPointsHeight: (_o = lineConfig.dataPointsHeight) !== null && _o !== void 0 ? _o : defaultLineConfig.dataPointsHeight,
        dataPointsWidth: (_p = lineConfig.dataPointsWidth) !== null && _p !== void 0 ? _p : defaultLineConfig.dataPointsWidth,
        dataPointsColor: (_q = lineConfig.dataPointsColor) !== null && _q !== void 0 ? _q : defaultLineConfig.dataPointsColor,
        dataPointsRadius: (_r = lineConfig.dataPointsRadius) !== null && _r !== void 0 ? _r : defaultLineConfig.dataPointsRadius,
        dataPointLabelComponent: lineConfig.dataPointLabelComponent,
        textColor: (_s = lineConfig.textColor) !== null && _s !== void 0 ? _s : defaultLineConfig.textColor,
        textFontSize: (_t = lineConfig.textFontSize) !== null && _t !== void 0 ? _t : defaultLineConfig.textFontSize,
        textShiftX: (_u = lineConfig.textShiftX) !== null && _u !== void 0 ? _u : defaultLineConfig.textShiftX,
        textShiftY: (_v = lineConfig.textShiftY) !== null && _v !== void 0 ? _v : defaultLineConfig.textShiftY,
        shiftX: (_w = lineConfig.shiftX) !== null && _w !== void 0 ? _w : defaultLineConfig.shiftX,
        shiftY: (_x = lineConfig.shiftY) !== null && _x !== void 0 ? _x : defaultLineConfig.shiftY,
        delay: (_y = lineConfig.delay) !== null && _y !== void 0 ? _y : defaultLineConfig.delay,
        startIndex: (_z = lineConfig.startIndex) !== null && _z !== void 0 ? _z : defaultLineConfig.startIndex,
        endIndex: lineConfig.endIndex === 0
            ? 0
            : (_0 = lineConfig.endIndex) !== null && _0 !== void 0 ? _0 : defaultLineConfig.endIndex,
        showArrow: (_1 = lineConfig.showArrow) !== null && _1 !== void 0 ? _1 : defaultLineConfig.showArrow,
        arrowConfig: {
            length: (_3 = (_2 = lineConfig.arrowConfig) === null || _2 === void 0 ? void 0 : _2.length) !== null && _3 !== void 0 ? _3 : (_4 = defaultLineConfig.arrowConfig) === null || _4 === void 0 ? void 0 : _4.length,
            width: (_6 = (_5 = lineConfig.arrowConfig) === null || _5 === void 0 ? void 0 : _5.width) !== null && _6 !== void 0 ? _6 : (_7 = defaultLineConfig.arrowConfig) === null || _7 === void 0 ? void 0 : _7.width,
            strokeWidth: (_9 = (_8 = lineConfig.arrowConfig) === null || _8 === void 0 ? void 0 : _8.strokeWidth) !== null && _9 !== void 0 ? _9 : (_10 = defaultLineConfig.arrowConfig) === null || _10 === void 0 ? void 0 : _10.strokeWidth,
            strokeColor: (_12 = (_11 = lineConfig.arrowConfig) === null || _11 === void 0 ? void 0 : _11.strokeColor) !== null && _12 !== void 0 ? _12 : (_13 = defaultLineConfig.arrowConfig) === null || _13 === void 0 ? void 0 : _13.strokeColor,
            fillColor: (_15 = (_14 = lineConfig.arrowConfig) === null || _14 === void 0 ? void 0 : _14.fillColor) !== null && _15 !== void 0 ? _15 : (_16 = defaultLineConfig.arrowConfig) === null || _16 === void 0 ? void 0 : _16.fillColor,
            showArrowBase: (_18 = (_17 = lineConfig.arrowConfig) === null || _17 === void 0 ? void 0 : _17.showArrowBase) !== null && _18 !== void 0 ? _18 : (_19 = defaultLineConfig.arrowConfig) === null || _19 === void 0 ? void 0 : _19.showArrowBase
        },
        customDataPoint: lineConfig.customDataPoint,
        isSecondary: (_20 = lineConfig.isSecondary) !== null && _20 !== void 0 ? _20 : defaultLineConfig.isSecondary,
        focusEnabled: (_21 = lineConfig.focusEnabled) !== null && _21 !== void 0 ? _21 : defaultLineConfig.focusEnabled,
        focusedDataPointColor: (_22 = lineConfig.focusedDataPointColor) !== null && _22 !== void 0 ? _22 : defaultLineConfig.focusedDataPointColor,
        focusedDataPointRadius: (_23 = lineConfig.focusedDataPointRadius) !== null && _23 !== void 0 ? _23 : defaultLineConfig.focusedDataPointRadius,
        focusedDataPointIndex: focusedDataPointIndex,
        setFocusedDataPointIndex: setFocusedDataPointIndex,
        showDataPointLabelOnFocus: (_24 = lineConfig.showDataPointLabelOnFocus) !== null && _24 !== void 0 ? _24 : defaultLineConfig.showDataPointLabelOnFocus
    };
};
export var getNoOfSections = function (noOfSections, maxValue, stepValue, isX) {
    return maxValue && stepValue
        ? maxValue / stepValue
        : noOfSections !== null && noOfSections !== void 0 ? noOfSections : (isX
            ? AxesAndRulesDefaults.xNoOfSections
            : AxesAndRulesDefaults.noOfSections);
};
export var getMaxValue = function (maxValue, stepValue, noOfSections, maxItem) { return maxValue !== null && maxValue !== void 0 ? maxValue : (stepValue ? stepValue * noOfSections : maxItem); };
export var getMostNegativeValue = function (minValue, stepValue, noOfSections, minItem) {
    return minValue !== null && minValue !== void 0 ? minValue : (stepValue && noOfSections ? stepValue * noOfSections : minItem);
};
export var getBarFrontColor = function (isFocused, focusedBarConfig, itemFrontColor, frontColor, isThreeD) {
    var _a, _b;
    if (isFocused) {
        return ((_a = focusedBarConfig === null || focusedBarConfig === void 0 ? void 0 : focusedBarConfig.color) !== null && _a !== void 0 ? _a : (isThreeD
            ? BarDefaults.focusedThreeDBarFrontColor
            : BarDefaults.focusedBarFrontColor));
    }
    return ((_b = itemFrontColor !== null && itemFrontColor !== void 0 ? itemFrontColor : frontColor) !== null && _b !== void 0 ? _b : (isThreeD ? BarDefaults.threeDBarFrontColor : BarDefaults.frontColor));
};
export var getBarSideColor = function (isFocused, focusedBarConfig, itemSideColor, sideColor) {
    var _a;
    if (isFocused) {
        return (_a = focusedBarConfig === null || focusedBarConfig === void 0 ? void 0 : focusedBarConfig.sideColor) !== null && _a !== void 0 ? _a : BarDefaults.focusedBarSideColor;
    }
    return itemSideColor !== null && itemSideColor !== void 0 ? itemSideColor : sideColor;
};
export var getBarTopColor = function (isFocused, focusedBarConfig, itemTopColor, topColor) {
    var _a;
    if (isFocused) {
        return (_a = focusedBarConfig === null || focusedBarConfig === void 0 ? void 0 : focusedBarConfig.topColor) !== null && _a !== void 0 ? _a : BarDefaults.focusedBarTopColor;
    }
    return itemTopColor !== null && itemTopColor !== void 0 ? itemTopColor : topColor;
};
var myFindLastIndex = function (arr, func) {
    var tempLastIndex = arr.slice().reverse().findIndex(func);
    var lastIndex = tempLastIndex >= 0 ? arr.length - 1 - tempLastIndex : tempLastIndex;
    return lastIndex;
};
export var getBarWidth = function (isFocused, focusedBarConfig, itemBarWidth, barWidth) {
    var _a, _b;
    var localBarWidth = (_a = itemBarWidth !== null && itemBarWidth !== void 0 ? itemBarWidth : barWidth) !== null && _a !== void 0 ? _a : BarDefaults.barWidth;
    if (isFocused) {
        return (_b = focusedBarConfig === null || focusedBarConfig === void 0 ? void 0 : focusedBarConfig.width) !== null && _b !== void 0 ? _b : localBarWidth;
    }
    return localBarWidth;
};
export var getInterpolatedData = function (dataParam, showDataPointsForMissingValues, interpolateMissingValues, onlyPositive) {
    if (!interpolateMissingValues) {
        return dataParam.map(function (item) {
            var _a;
            if (typeof item.value !== 'number') {
                if (showDataPointsForMissingValues)
                    return __assign(__assign({}, item), { value: 0 });
                return __assign(__assign({}, item), { value: 0, hideDataPoint: true });
            }
            return __assign(__assign({}, item), { value: (_a = item.value) !== null && _a !== void 0 ? _a : 0 });
        });
    }
    // if (!interpolateMissingValues) return dataParam
    var data = clone(dataParam);
    var n = data.length;
    /** ************         PRE-PROCESSING           **************/
    var numericValue;
    var numericValuesLength = data.filter(function (item) {
        var _a;
        var isNum = typeof item.value === 'number';
        if (isNum) {
            numericValue = (_a = item.value) !== null && _a !== void 0 ? _a : 0;
            return true;
        }
        return false;
    }).length;
    if (!numericValuesLength)
        return [];
    if (numericValuesLength === 1) {
        data.forEach(function (item) {
            if (!showDataPointsForMissingValues && typeof item.value !== 'number') {
                item.hideDataPoint = true;
            }
            item.value = numericValue;
        });
        return data;
    }
    /**********************************************************************/
    data.forEach(function (item, index) {
        if (typeof item.value === 'number')
            return;
        //  Cut the line in 2 halves-> pre and post
        //  Now there are 4 possibilities-
        //    1. Both pre and post have valid values
        //    2. Only pre has valid value
        //    3. Only post has valid value
        //    4. None has valid value -> this is already handled in preprocessing
        var pre = data.slice(0, index);
        var post = data.slice(index + 1, n);
        var preValidIndex = myFindLastIndex(pre, function (item) { return typeof item.value === 'number'; });
        var postValidInd = post.findIndex(function (item) { return typeof item.value === 'number'; });
        var postValidIndex = postValidInd + index + 1;
        var count, step;
        //    1. Both pre and post have valid values
        if (preValidIndex !== -1 && postValidInd !== -1) {
            count = postValidIndex - preValidIndex;
            step = (data[postValidIndex].value - data[preValidIndex].value) / count;
            data[index].value =
                data[preValidIndex].value + step * (index - preValidIndex);
        }
        else if (preValidIndex !== -1 && postValidInd === -1) {
            //    2. Only pre has valid value
            //  Now there are 2 possibilities-
            //    1. There's only 1 valid value in the pre -> this is already handled in preprocessing
            //    2. There are more than 1 valid values in pre
            var secondPre = data.slice(0, preValidIndex);
            var secondPreIndex = myFindLastIndex(secondPre, function (item) { return typeof item.value === 'number'; });
            count = preValidIndex - secondPreIndex;
            step = (data[secondPreIndex].value - data[preValidIndex].value) / count;
            var val = data[preValidIndex].value - step * (index - preValidIndex);
            data[index].value =
                data[preValidIndex].value - step * (index - preValidIndex);
        }
        else if (preValidIndex === -1 && postValidInd !== -1) {
            //    3. Only post has valid value
            //  Now there are 2 possibilities-
            //    1. There's only 1 valid value in the post -> this is already handled in preprocessing
            //    2. There are more than valid values in post
            var secondPost = data.slice(postValidIndex + 1, n);
            var secondPostInd = secondPost.findIndex(function (item) { return typeof item.value === 'number'; });
            var secondPostIndex = secondPostInd + postValidIndex + 1;
            count = secondPostIndex - postValidIndex;
            step = (data[secondPostIndex].value - data[postValidIndex].value) / count;
            data[index].value =
                data[postValidIndex].value - step * (postValidIndex - index);
        }
        // hide data point (since it is interpolated)
        if (!showDataPointsForMissingValues) {
            item.hideDataPoint = true;
        }
    });
    return onlyPositive
        ? data.map(function (item) { return (__assign(__assign({}, item), { value: Math.max(item.value, 0) })); })
        : data;
};
export var getLineSegmentsDueToNoExtrapolation = function (data) {
    if (!(data === null || data === void 0 ? void 0 : data.length))
        return undefined;
    var segments = [];
    var firstNumericIndex = data.findIndex(function (item) { return typeof item.value === 'number'; });
    if (firstNumericIndex !== 0) {
        segments.push({
            startIndex: 0,
            endIndex: firstNumericIndex,
            color: 'transparent'
        });
    }
    var lastNumericIndex = myFindLastIndex(data, function (item) { return typeof item.value === 'number'; });
    if (lastNumericIndex !== data.length - 1) {
        segments.push({
            startIndex: lastNumericIndex,
            endIndex: data.length,
            color: 'transparent'
        });
    }
    return segments;
};
export var getLineSegmentsForMissingValues = function (data) {
    if (!(data === null || data === void 0 ? void 0 : data.length))
        return undefined;
    var i;
    var n = data.length;
    var numericValuesLength = data.filter(function (item) { return typeof item.value === 'number'; }).length;
    if (!numericValuesLength)
        return undefined;
    var segments = [];
    for (i = 0; i < n; i++) {
        if (typeof data[i].value !== 'number') {
            var nextValidInd = data
                .slice(i + 1, n)
                .findIndex(function (item) { return typeof item.value === 'number'; });
            if (nextValidInd === -1) {
                segments.push({
                    startIndex: Math.max(i - 1, 0),
                    endIndex: n,
                    color: 'transparent'
                });
                break;
            }
            var nextValidIndex = nextValidInd + i + 1;
            segments.push({
                startIndex: Math.max(i - 1, 0),
                endIndex: nextValidIndex,
                color: 'transparent'
            });
            i = nextValidIndex;
        }
    }
    return segments;
};
export var colorsToLowerCase = function (lineSegments) {
    return lineSegments === null || lineSegments === void 0 ? void 0 : lineSegments.map(function (segment) {
        if (segment.color && segment.color.toString().startsWith('#')) {
            segment.color = segment.color.toString().toLowerCase();
        }
        return segment;
    });
};
export var getTextSizeForPieLabels = function (textSize, radius) { return (textSize ? Math.min(textSize, radius / 5) : 16); };
export var adjustToOffset = function (data, yAxisOffset) {
    return data.map(function (item) { return (__assign(__assign({}, item), { value: item.value - (yAxisOffset !== null && yAxisOffset !== void 0 ? yAxisOffset : 0) })); });
};
export var getSanitisedData = function (data, dataSanitisationProps) {
    if (!data) {
        return [];
    }
    var showDataPointsForMissingValues = dataSanitisationProps.showDataPointsForMissingValues, interpolateMissingValues = dataSanitisationProps.interpolateMissingValues, onlyPositive = dataSanitisationProps.onlyPositive, yAxisOffset = dataSanitisationProps.yAxisOffset;
    var nullishHandledData = getInterpolatedData(data, showDataPointsForMissingValues, interpolateMissingValues, onlyPositive);
    if (yAxisOffset) {
        return adjustToOffset(nullishHandledData, yAxisOffset);
    }
    return nullishHandledData;
};
export var getStrokeDashArray = function (strokeDash, framework) {
    var strokeDashArrayOrString;
    if (framework === Framework.reactJS) {
        if (strokeDash instanceof Array) {
            strokeDashArrayOrString = strokeDash.toString().replace(',', ' ');
        }
        else if (typeof strokeDash === 'string') {
            strokeDashArrayOrString = strokeDash
                .replace(',', ' ')
                .replace('[', '')
                .replace(']', '')
                .replace('{', '')
                .replace('}', '');
        }
    }
    else {
        if (strokeDash instanceof Array) {
            strokeDashArrayOrString = strokeDash;
        }
        else if (typeof strokeDash === 'string') {
            var ar = strokeDash
                .replace(',', ' ')
                .replace('[', '')
                .replace(']', '')
                .replace('{', '')
                .replace('}', '')
                .split(' ');
            if (ar[0] && ar[1]) {
                var n1 = Number(ar[0]);
                var n2 = Number(ar[1]);
                if (!isNaN(n1) && !isNaN(n2)) {
                    strokeDashArrayOrString = [n1, n2];
                }
            }
        }
    }
    return strokeDashArrayOrString;
};
export var emptyExternaLabelProperties = {
    labelLineColor: '',
    labelLineThickness: 0,
    labelComponentHeight: 0,
    inX: 0,
    inY: 0,
    outX: 0,
    outY: 0,
    finalX: 0,
    labelComponentX: 0,
    labelComponentY: 0,
    localExternalLabelComponent: null,
    isRightHalf: false
};
export var defaultLabelLineConfig = {
    length: 10,
    tailLength: 8,
    color: 'black',
    thickness: 1,
    labelComponentWidth: 20,
    labelComponentHeight: 10,
    labelComponentMargin: 4,
    avoidOverlappingOfLabels: true
};
var secondLastIndexOf = function (text, seq) {
    // assuming seq is a single char
    var strCopy = text;
    var lastIndex = strCopy.lastIndexOf(seq);
    strCopy =
        strCopy.substring(0, lastIndex) + 'x' + strCopy.substring(lastIndex + 1);
    return strCopy.lastIndexOf(seq);
};
var thirdLastIndexOf = function (text, seq) {
    // assuming seq is a single char
    var strCopy = text;
    var lastIndex = strCopy.lastIndexOf(seq);
    strCopy =
        strCopy.substring(0, lastIndex) + 'x' + strCopy.substring(lastIndex + 1);
    lastIndex = strCopy.lastIndexOf(seq);
    strCopy =
        strCopy.substring(0, lastIndex) + 'x' + strCopy.substring(lastIndex + 1);
    return strCopy.lastIndexOf(seq);
};
export var pointsWithPaddedRepititions = function (oldPoints, newPoints) {
    /*
     **          Handles these cases-
     **
     **          1. Straight line chart
     **          2. Curved Line chart with Cubic curve
     **          3. Curved Line Chart with Quadratic curve
     **          4. Straight Area chart -> we need to repeatedly add the 3rd last substring from the points array which represents the last point
     **          5. Curved Area chart with Cubic curve -> we need to repeatedly add the 3nd last substring (the 2 last substrings start with L while the 3rd last will start with C) from the points array which represents the last point
     **          6. Curved Area chart with Quadratic curve -> we need to repeatedly add the 3nd last substring (the 2 last substrings start with L while the 3rd last will start with Q) from the points array which represents the last point
     */
    var oldPointsCopy = oldPoints.trim();
    var newPointsCopy = newPoints.trim();
    var char;
    if (oldPointsCopy.includes('C')) {
        char = 'C';
    }
    else if (oldPointsCopy.includes('Q ')) {
        char = 'Q ';
    }
    else {
        char = 'L';
    }
    var oldPointsCopyAr = oldPointsCopy.split(char);
    var newPointsCopyAr = newPointsCopy.split(char);
    var oldPointsCopyLen = oldPointsCopyAr.length - 1;
    var newPointsCopyLen = newPointsCopyAr.length - 1;
    var diff = Math.abs(oldPointsCopyLen - newPointsCopyLen);
    var lastSequence = oldPointsCopyLen < newPointsCopyLen
        ? oldPointsCopyAr[oldPointsCopyLen].trim()
        : newPointsCopyAr[newPointsCopyLen].trim();
    var indexOfL = lastSequence.indexOf('L');
    var isCurvedAreaChart = (char === 'C' || char === 'Q ') && indexOfL !== -1;
    var isStraightAreaChart = !isCurvedAreaChart &&
        oldPointsCopyAr[0].substring(1).trim() ===
            oldPointsCopyAr[oldPointsCopyLen].trim();
    var repeats = isCurvedAreaChart
        ? lastSequence.substring(0, indexOfL)
        : isStraightAreaChart
            ? oldPointsCopyLen < newPointsCopyLen
                ? oldPointsCopyAr[oldPointsCopyLen - 2]
                : newPointsCopyAr[newPointsCopyLen - 2]
            : lastSequence;
    if (!isCurvedAreaChart && char === 'Q ') {
        // redrawing the last curve segment is a bit complicated in case of quadratic curves as evident below-
        var repeatsAr = repeats.split('Q');
        var r1 = repeatsAr[0];
        var r2 = repeatsAr[1];
        var r1LastPoint = r1.split(' ')[1];
        var r2LastPoint = r2.split(' ')[1];
        var r2FirstPoint = r2.split(' ')[0];
        repeats =
            'Q ' +
                r2FirstPoint +
                ' ' +
                r1LastPoint +
                ' Q' +
                r2FirstPoint +
                ' ' +
                r2LastPoint;
    }
    else {
        repeats = char + (repeats === null || repeats === void 0 ? void 0 : repeats.trim());
    }
    if (isCurvedAreaChart) {
        if (oldPointsCopyLen < newPointsCopyLen) {
            oldPointsCopy = oldPointsCopy
                .substring(0, secondLastIndexOf(oldPointsCopy, 'L'))
                .trim();
        }
        else {
            newPointsCopy = newPointsCopy
                .substring(0, secondLastIndexOf(newPointsCopy, 'L'))
                .trim();
        }
    }
    if (isStraightAreaChart) {
        if (oldPointsCopyLen < newPointsCopyLen) {
            oldPointsCopy = oldPointsCopy
                .substring(0, thirdLastIndexOf(oldPointsCopy, 'L'))
                .trim();
        }
        else {
            newPointsCopy = newPointsCopy
                .substring(0, thirdLastIndexOf(newPointsCopy, 'L'))
                .trim();
        }
    }
    for (var i = 0; i < diff; i++) {
        if (oldPointsCopyLen < newPointsCopyLen) {
            oldPointsCopy += " ".concat(repeats);
        }
        else {
            newPointsCopy += " ".concat(repeats);
        }
    }
    oldPointsCopy = oldPointsCopy.trim();
    newPointsCopy = newPointsCopy.trim();
    if (isCurvedAreaChart) {
        if (oldPointsCopyLen < newPointsCopyLen) {
            oldPointsCopy +=
                ' ' + oldPoints.substring(secondLastIndexOf(oldPoints, 'L'));
        }
        else {
            newPointsCopy +=
                ' ' + newPoints.substring(secondLastIndexOf(newPoints, 'L'));
        }
    }
    if (isStraightAreaChart) {
        if (oldPointsCopyLen < newPointsCopyLen) {
            oldPointsCopy +=
                ' ' + oldPoints.substring(thirdLastIndexOf(oldPoints, 'L'));
        }
        else {
            newPointsCopy +=
                ' ' + newPoints.substring(thirdLastIndexOf(newPoints, 'L'));
        }
    }
    return [oldPointsCopy.trim(), newPointsCopy.trim()];
};
export var withinMinMaxRange = function (val, maxVal, minVal) { return Math.min(maxVal, Math.max(minVal, val)); };
export var getIntegerizedValue = function (value) {
    var _a;
    var decimals = ((_a = value.toString().split('.')[1]) === null || _a === void 0 ? void 0 : _a.length) || 0;
    var factor = Math.pow(10, decimals);
    var integerizedValue = value * factor;
    var lastDigit = integerizedValue % 10;
    if (integerizedValue > 10 && lastDigit !== 0 && lastDigit !== 5) {
        var roundedIntegerized = Math.round(integerizedValue / 5) * 5;
        var ans = roundedIntegerized / factor;
        return ans;
    }
    return value;
};

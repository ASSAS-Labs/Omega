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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment } from 'react';
import { View } from 'react-native';
import { ruleTypes, usePopulationPyramid, } from 'gifted-charts-core';
import { ClipPath, Line, Rect, Svg, Text as SvgText, Use, } from 'react-native-svg';
import { screenWidth } from '../utils';
export var PopulationPyramid = function (props) {
    var _a, _b, _c, _d;
    var _e = usePopulationPyramid(__assign(__assign({}, props), { screenWidth: screenWidth })), width = _e.width, verticalMarginBetweenBars = _e.verticalMarginBetweenBars, barsMapToYAxisSections = _e.barsMapToYAxisSections, data = _e.data, hideRules = _e.hideRules, yAxisColor = _e.yAxisColor, xAxisColor = _e.xAxisColor, xAxisThickness = _e.xAxisThickness, xAxisType = _e.xAxisType, xAxisNoOfSections = _e.xAxisNoOfSections, showXAxisIndices = _e.showXAxisIndices, showXAxisLabelTexts = _e.showXAxisLabelTexts, xAxisLabelShiftX = _e.xAxisLabelShiftX, xAxisLabelPrefix = _e.xAxisLabelPrefix, xAxisLabelSuffix = _e.xAxisLabelSuffix, formatXAxisLabels = _e.formatXAxisLabels, showVerticalLines = _e.showVerticalLines, showYAxisIndices = _e.showYAxisIndices, yAxisIndicesWidth = _e.yAxisIndicesWidth, yAxisIndicesHeight = _e.yAxisIndicesHeight, yAxisIndicesColor = _e.yAxisIndicesColor, yAxisLabelFontSize = _e.yAxisLabelFontSize, yAxisLabelFontStyle = _e.yAxisLabelFontStyle, yAxisLabelFontWeight = _e.yAxisLabelFontWeight, yAxisLabelFontFamily = _e.yAxisLabelFontFamily, yAxisLabelColor = _e.yAxisLabelColor, yAxisLabelTextMarginRight = _e.yAxisLabelTextMarginRight, yAxisLabelTexts = _e.yAxisLabelTexts, showValuesAsBarLabels = _e.showValuesAsBarLabels, rulesThickness = _e.rulesThickness, rulesColor = _e.rulesColor, rulesType = _e.rulesType, dashWidth = _e.dashWidth, dashGap = _e.dashGap, leftBarLabelWidth = _e.leftBarLabelWidth, leftBarLabelFontSize = _e.leftBarLabelFontSize, leftBarLabelColor = _e.leftBarLabelColor, leftBarLabelFontStyle = _e.leftBarLabelFontStyle, leftBarLabelFontWeight = _e.leftBarLabelFontWeight, leftBarLabelFontFamily = _e.leftBarLabelFontFamily, leftBarLabelPrefix = _e.leftBarLabelPrefix, leftBarLabelSuffix = _e.leftBarLabelSuffix, rightBarLabelFontSize = _e.rightBarLabelFontSize, rightBarLabelColor = _e.rightBarLabelColor, rightBarLabelFontStyle = _e.rightBarLabelFontStyle, rightBarLabelFontWeight = _e.rightBarLabelFontWeight, rightBarLabelFontFamily = _e.rightBarLabelFontFamily, rightBarLabelPrefix = _e.rightBarLabelPrefix, rightBarLabelSuffix = _e.rightBarLabelSuffix, formatBarLabels = _e.formatBarLabels, showMidAxis = _e.showMidAxis, midAxisLabelFontSize = _e.midAxisLabelFontSize, midAxisLabelColor = _e.midAxisLabelColor, midAxisLabelFontStyle = _e.midAxisLabelFontStyle, midAxisLabelFontWeight = _e.midAxisLabelFontWeight, midAxisLabelFontFamily = _e.midAxisLabelFontFamily, leftBarColor = _e.leftBarColor, rightBarColor = _e.rightBarColor, leftBarBorderColor = _e.leftBarBorderColor, rightBarBorderColor = _e.rightBarBorderColor, leftBarBorderWidth = _e.leftBarBorderWidth, rightBarBorderWidth = _e.rightBarBorderWidth, leftBarBorderRadius = _e.leftBarBorderRadius, rightBarBorderRadius = _e.rightBarBorderRadius, allCornersRounded = _e.allCornersRounded, showSurplus = _e.showSurplus, showSurplusLeft = _e.showSurplusLeft, showSurplusRight = _e.showSurplusRight, leftSurplusColor = _e.leftSurplusColor, leftSurplusBorderColor = _e.leftSurplusBorderColor, rightSurplusColor = _e.rightSurplusColor, rightSurplusBorderColor = _e.rightSurplusBorderColor, leftSurplusBorderWidth = _e.leftSurplusBorderWidth, rightSurplusBorderWidth = _e.rightSurplusBorderWidth, yAxisLabelWidth = _e.yAxisLabelWidth, noOfSections = _e.noOfSections, stepHeight = _e.stepHeight, containerHeightWithXaxisLabels = _e.containerHeightWithXaxisLabels, mid = _e.mid, barWidthFactor = _e.barWidthFactor, leftXAfterMid = _e.leftXAfterMid, rightXAfterMid = _e.rightXAfterMid, yAxisLineProps = _e.yAxisLineProps, midAxisLineCommonProps = _e.midAxisLineCommonProps, xAxisIndicesCommonProps = _e.xAxisIndicesCommonProps, verticalLinesCommonProps = _e.verticalLinesCommonProps, xAxisLabelsCommonProps = _e.xAxisLabelsCommonProps, getXLabel = _e.getXLabel, midAxisLabelWidth = _e.midAxisLabelWidth;
    return (_jsx(View, { style: { height: containerHeightWithXaxisLabels, width: width }, children: _jsxs(Svg, { fill: 'none', children: [_jsx(Line, __assign({}, yAxisLineProps)), Array.from(Array(noOfSections)).map(function (item, index) {
                    var _a;
                    var isLast = index === noOfSections - 1;
                    var y = stepHeight * (index + 1);
                    var rulesProps = {
                        x1: yAxisLabelWidth,
                        y1: y,
                        x2: width,
                        y2: y,
                        stroke: isLast ? xAxisColor : rulesColor,
                        strokeWidth: isLast ? xAxisThickness : rulesThickness,
                    };
                    if ((isLast && xAxisType !== ruleTypes.SOLID) ||
                        (!isLast && rulesType !== ruleTypes.SOLID)) {
                        rulesProps.strokeDasharray = [dashWidth, dashGap];
                    }
                    else {
                        delete rulesProps.strokeDasharray;
                    }
                    return (_jsxs(Fragment, { children: [!hideRules || isLast ? _jsx(Line, __assign({}, rulesProps)) : null, showYAxisIndices ? (_jsx(Line, { x1: yAxisLabelWidth - yAxisIndicesWidth / 2, y1: y, x2: yAxisLabelWidth + yAxisIndicesWidth / 2, y2: y, stroke: yAxisIndicesColor, strokeWidth: yAxisIndicesHeight })) : null, !barsMapToYAxisSections ? (_jsx(SvgText, { x: yAxisLabelWidth - yAxisLabelTextMarginRight, y: stepHeight * (index + 0.5) + yAxisLabelFontSize / 2 - 2, stroke: yAxisLabelColor, fontSize: yAxisLabelFontSize, fontStyle: yAxisLabelFontStyle, fontWeight: yAxisLabelFontWeight, fontFamily: yAxisLabelFontFamily, textAnchor: "end", children: (_a = yAxisLabelTexts[index]) !== null && _a !== void 0 ? _a : '' })) : null] }, 'rule' + index));
                }), Array.from(Array(xAxisNoOfSections)).map(function (item, index) {
                    var x = leftXAfterMid - (leftXAfterMid * index) / xAxisNoOfSections;
                    var unformattedXLabel = getXLabel(index);
                    var xLabel = formatXAxisLabels
                        ? formatXAxisLabels(unformattedXLabel)
                        : unformattedXLabel;
                    return (_jsxs(Fragment, { children: [showVerticalLines ? (_jsx(Line, __assign({}, verticalLinesCommonProps, { x1: x, x2: x }))) : null, showXAxisIndices ? (_jsx(Line, __assign({}, xAxisIndicesCommonProps, { x1: x, x2: x }))) : null, showXAxisLabelTexts ? (_jsx(SvgText, __assign({}, xAxisLabelsCommonProps, { x: x + xAxisLabelShiftX, textAnchor: "middle", children: xAxisLabelPrefix + xLabel + xAxisLabelSuffix }))) : null] }, 'x-axis' + index));
                }), Array.from(Array(xAxisNoOfSections)).map(function (item, index) {
                    if (!index && !showMidAxis)
                        return null;
                    var x = midAxisLabelWidth +
                        leftXAfterMid +
                        (leftXAfterMid * index) / xAxisNoOfSections;
                    var unformattedXLabel = getXLabel(index);
                    var xLabel = formatXAxisLabels
                        ? formatXAxisLabels(unformattedXLabel)
                        : unformattedXLabel;
                    return (_jsxs(Fragment, { children: [showVerticalLines ? (_jsx(Line, __assign({}, verticalLinesCommonProps, { x1: x, x2: x }))) : null, showXAxisIndices ? (_jsx(Line, __assign({}, xAxisIndicesCommonProps, { x1: x, x2: x }))) : null, showXAxisLabelTexts ? (_jsx(SvgText, __assign({}, xAxisLabelsCommonProps, { x: x + xAxisLabelShiftX, textAnchor: "middle", children: xAxisLabelPrefix + xLabel + xAxisLabelSuffix }))) : null] }, 'x-axis' + index));
                }), data.map(function (item, index) {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19;
                    var leftWidth = item.left * barWidthFactor;
                    var rightWidth = item.right * barWidthFactor;
                    var y = stepHeight * index + verticalMarginBetweenBars;
                    var leftSurplusWidth = leftWidth - rightWidth;
                    var rightSurplusWidth = rightWidth - leftWidth;
                    var leftRadius = (_b = (_a = item.leftBarBorderRadius) !== null && _a !== void 0 ? _a : item.barBorderRadius) !== null && _b !== void 0 ? _b : leftBarBorderRadius;
                    var rightRadius = (_d = (_c = item.rightBarBorderRadius) !== null && _c !== void 0 ? _c : item.barBorderRadius) !== null && _d !== void 0 ? _d : rightBarBorderRadius;
                    var leftBorderWidth = (_f = (_e = item.leftBarBorderWidth) !== null && _e !== void 0 ? _e : item.barBorderWidth) !== null && _f !== void 0 ? _f : leftBarBorderWidth;
                    var rightBorderWidth = (_h = (_g = item.rightBarBorderWidth) !== null && _g !== void 0 ? _g : item.barBorderWidth) !== null && _h !== void 0 ? _h : rightBarBorderWidth;
                    var unFormattedLeftBarLabel = (_j = item.leftBarLabel) !== null && _j !== void 0 ? _j : (showValuesAsBarLabels ? item.left.toString() : '');
                    var leftBarLabel = formatBarLabels
                        ? formatBarLabels(unFormattedLeftBarLabel)
                        : unFormattedLeftBarLabel;
                    var unFormattedRightBarLabel = (_k = item.rightBarLabel) !== null && _k !== void 0 ? _k : (showValuesAsBarLabels ? item.right.toString() : '');
                    var rightBarLabel = formatBarLabels
                        ? formatBarLabels(unFormattedRightBarLabel)
                        : unFormattedRightBarLabel;
                    var leftLabelFontSize = (_l = item.leftBarLabelFontSize) !== null && _l !== void 0 ? _l : leftBarLabelFontSize;
                    var leftLabelX = leftXAfterMid -
                        leftWidth -
                        leftBarBorderWidth / 2 -
                        yAxisLabelWidth / 2 -
                        leftBarLabelWidth / 2 +
                        28 -
                        (leftBarLabel.length * leftLabelFontSize) / 2 +
                        ((_o = (_m = item.leftBarLabelShift) !== null && _m !== void 0 ? _m : props.leftBarLabelShift) !== null && _o !== void 0 ? _o : 0);
                    var rightLabelX = rightXAfterMid +
                        rightBarBorderWidth / 2 +
                        rightWidth +
                        3 +
                        ((_q = (_p = item.rightBarLabelShift) !== null && _p !== void 0 ? _p : props.rightBarLabelShift) !== null && _q !== void 0 ? _q : 0);
                    var leftBarCommonProps = {
                        x: leftXAfterMid - leftWidth - leftBarBorderWidth / 2,
                        y: y,
                        width: leftWidth,
                        height: stepHeight - verticalMarginBetweenBars * 2,
                        rx: leftRadius,
                        ry: leftRadius,
                    };
                    var rightBarCommonProps = {
                        x: rightXAfterMid + rightBarBorderWidth / 2,
                        y: y,
                        width: rightWidth,
                        height: stepHeight - verticalMarginBetweenBars * 2,
                        rx: rightRadius,
                        ry: rightRadius,
                    };
                    return (_jsxs(Fragment, { children: [barsMapToYAxisSections ? (_jsx(SvgText, { x: yAxisLabelWidth - yAxisLabelTextMarginRight, y: stepHeight * (index + 0.5) + yAxisLabelFontSize / 2 - 2, stroke: yAxisLabelColor, fontSize: yAxisLabelFontSize, fontStyle: yAxisLabelFontStyle, fontWeight: yAxisLabelFontWeight, fontFamily: yAxisLabelFontFamily, textAnchor: "end", children: (_s = (_r = item.yAxisLabel) !== null && _r !== void 0 ? _r : yAxisLabelTexts[index]) !== null && _s !== void 0 ? _s : '' })) : null, _jsx(Rect, __assign({}, leftBarCommonProps, { fill: (_t = item.leftBarColor) !== null && _t !== void 0 ? _t : leftBarColor, stroke: (_u = item.leftBarBorderColor) !== null && _u !== void 0 ? _u : leftBarBorderColor, strokeWidth: leftBorderWidth, onPress: function () { var _a; return (_a = props.onLeftPress) === null || _a === void 0 ? void 0 : _a.call(props, item, index); } })), _jsx(ClipPath, { id: 'cp-left' + index, children: _jsx(Rect, __assign({}, leftBarCommonProps)) }), !allCornersRounded && leftWidth >= leftRadius ? (_jsxs(_Fragment, { children: [_jsx(Rect, { x: leftXAfterMid - leftRadius, y: y, width: leftRadius, height: stepHeight - verticalMarginBetweenBars * 2, fill: (_v = item.leftBarColor) !== null && _v !== void 0 ? _v : leftBarColor }), leftBorderWidth ? (_jsxs(_Fragment, { children: [_jsx(Line, { x1: leftXAfterMid - leftRadius, y1: y, x2: leftXAfterMid, y2: y, stroke: (_w = item.leftBarBorderColor) !== null && _w !== void 0 ? _w : leftBarBorderColor, strokeWidth: leftBorderWidth }), _jsx(Line, { x1: leftXAfterMid - leftRadius, y1: y + stepHeight - verticalMarginBetweenBars * 2, x2: leftXAfterMid, y2: y + stepHeight - verticalMarginBetweenBars * 2, stroke: (_x = item.leftBarBorderColor) !== null && _x !== void 0 ? _x : leftBarBorderColor, strokeWidth: leftBorderWidth })] })) : null] })) : null, leftBarLabel !== '' ? (_jsx(SvgText, { x: leftLabelX, y: stepHeight * (index + 0.5) + yAxisLabelFontSize / 2 - 2, stroke: (_y = item.leftBarLabelColor) !== null && _y !== void 0 ? _y : leftBarLabelColor, fontSize: leftLabelFontSize, fontStyle: (_z = item.leftBarLabelFontStyle) !== null && _z !== void 0 ? _z : leftBarLabelFontStyle, fontWeight: (_0 = item.leftBarLabelFontWeight) !== null && _0 !== void 0 ? _0 : leftBarLabelFontWeight, fontFamily: (_1 = item.leftBarLabelFontFamily) !== null && _1 !== void 0 ? _1 : leftBarLabelFontFamily, textAnchor: "start", children: leftBarLabelPrefix + leftBarLabel + leftBarLabelSuffix })) : null, _jsx(Rect, __assign({}, rightBarCommonProps, { fill: (_2 = item.rightBarColor) !== null && _2 !== void 0 ? _2 : rightBarColor, stroke: (_3 = item.rightBarBorderColor) !== null && _3 !== void 0 ? _3 : rightBarBorderColor, strokeWidth: rightBorderWidth, onPress: function () { var _a; return (_a = props.onRightPress) === null || _a === void 0 ? void 0 : _a.call(props, item, index); } })), _jsx(ClipPath, { id: 'cp-right' + index, children: _jsx(Rect, __assign({}, rightBarCommonProps)) }), !allCornersRounded && rightWidth >= rightRadius ? (_jsxs(_Fragment, { children: [_jsx(Rect, { x: rightXAfterMid, y: y, width: rightRadius, height: stepHeight - verticalMarginBetweenBars * 2, fill: (_4 = item.rightBarColor) !== null && _4 !== void 0 ? _4 : rightBarColor }), rightBorderWidth ? (_jsxs(_Fragment, { children: [_jsx(Line, { x1: rightXAfterMid, y1: y, x2: rightXAfterMid + rightRadius, y2: y, stroke: (_5 = item.rightBarBorderColor) !== null && _5 !== void 0 ? _5 : rightBarBorderColor, strokeWidth: rightBorderWidth }), _jsx(Line, { x1: rightXAfterMid, y1: y + stepHeight - verticalMarginBetweenBars * 2, x2: rightXAfterMid + rightRadius, y2: y + stepHeight - verticalMarginBetweenBars * 2, stroke: (_6 = item.rightBarBorderColor) !== null && _6 !== void 0 ? _6 : rightBarBorderColor, strokeWidth: rightBorderWidth })] })) : null] })) : null, rightBarLabel !== '' ? (_jsx(SvgText, { x: rightLabelX, y: stepHeight * (index + 0.5) + yAxisLabelFontSize / 2 - 2, stroke: (_7 = item.rightBarLabelColor) !== null && _7 !== void 0 ? _7 : rightBarLabelColor, fontSize: (_8 = item.rightBarLabelFontSize) !== null && _8 !== void 0 ? _8 : rightBarLabelFontSize, fontStyle: (_9 = item.rightBarLabelFontStyle) !== null && _9 !== void 0 ? _9 : rightBarLabelFontStyle, fontWeight: (_10 = item.rightBarLabelFontWeight) !== null && _10 !== void 0 ? _10 : rightBarLabelFontWeight, fontFamily: (_11 = item.rightBarLabelFontFamily) !== null && _11 !== void 0 ? _11 : rightBarLabelFontFamily, textAnchor: "start", children: rightBarLabelPrefix + rightBarLabel + rightBarLabelSuffix })) : null, (showSurplus ||
                                showSurplusLeft ||
                                item.showSurplus ||
                                item.showSurplusLeft) &&
                                leftSurplusWidth > 0 ? (_jsxs(_Fragment, { children: [_jsx(Rect, { id: 'l-spls' + index, x: leftXAfterMid - leftWidth - leftBarBorderWidth / 2, y: y, width: leftSurplusWidth, height: stepHeight - verticalMarginBetweenBars * 2, stroke: (_12 = item.leftSurplusBorderColor) !== null && _12 !== void 0 ? _12 : leftSurplusBorderColor, strokeWidth: (_13 = item.leftSurplusBorderWidth) !== null && _13 !== void 0 ? _13 : leftSurplusBorderWidth }), _jsx(Use, { fill: (_14 = item.leftSurplusColor) !== null && _14 !== void 0 ? _14 : leftSurplusColor, clipPath: '#cp-left' + index, href: '#l-spls' + index }), leftSurplusWidth >= leftRadius ? (_jsxs(_Fragment, { children: [_jsx(Rect, { id: 'hide-in-left' + index, x: leftXAfterMid -
                                                    leftWidth -
                                                    leftBarBorderWidth +
                                                    leftSurplusWidth -
                                                    leftRadius, y: y, width: leftRadius, height: stepHeight - verticalMarginBetweenBars * 2 }), _jsx(Use, { fill: (_15 = item.leftSurplusColor) !== null && _15 !== void 0 ? _15 : leftSurplusColor, clipPath: "url(#cp-left".concat(index, ")"), href: '#hide-in-left' + index })] })) : null] })) : null, (showSurplus ||
                                showSurplusRight ||
                                item.showSurplus ||
                                item.showSurplusRight) &&
                                rightSurplusWidth > 0 ? (_jsxs(_Fragment, { children: [_jsx(Rect, { id: 'r-spls' + index, x: rightXAfterMid +
                                            rightBarBorderWidth / 2 +
                                            rightWidth -
                                            rightSurplusWidth, y: y, width: rightSurplusWidth, height: stepHeight - verticalMarginBetweenBars * 2, stroke: (_16 = item.rightSurplusBorderColor) !== null && _16 !== void 0 ? _16 : rightSurplusBorderColor, strokeWidth: (_17 = item.rightSurplusBorderWidth) !== null && _17 !== void 0 ? _17 : rightSurplusBorderWidth }), _jsx(Use, { fill: (_18 = item.rightSurplusColor) !== null && _18 !== void 0 ? _18 : rightSurplusColor, clipPath: '#cp-right' + index, href: '#r-spls' + index }), rightSurplusWidth >= rightRadius ? (_jsxs(_Fragment, { children: [_jsx(Rect, { id: 'hide-in-right' + index, x: rightXAfterMid +
                                                    rightBarBorderWidth / 2 +
                                                    rightWidth -
                                                    rightSurplusWidth, y: y, width: rightRadius, height: stepHeight - verticalMarginBetweenBars * 2 }), _jsx(Use, { fill: (_19 = item.rightSurplusColor) !== null && _19 !== void 0 ? _19 : rightSurplusColor, clipPath: "url(#cp-right".concat(index, ")"), href: '#hide-in-right' + index })] })) : null] })) : null] }, 'bars' + index));
                }), showMidAxis ? (_jsxs(_Fragment, { children: [_jsx(Line, __assign({}, midAxisLineCommonProps, { stroke: (_b = (_a = props.midAxisLeftColor) !== null && _a !== void 0 ? _a : props.midAxisColor) !== null && _b !== void 0 ? _b : yAxisColor, x1: leftXAfterMid, x2: leftXAfterMid })), _jsx(Line, __assign({}, midAxisLineCommonProps, { stroke: (_d = (_c = props.midAxisRightColor) !== null && _c !== void 0 ? _c : props.midAxisColor) !== null && _d !== void 0 ? _d : yAxisColor, x1: rightXAfterMid, x2: rightXAfterMid })), data.map(function (item, index) {
                            var _a, _b, _c, _d, _e, _f;
                            var y = stepHeight * (index + 0.5);
                            return (_jsx(SvgText, { x: mid, y: y + midAxisLabelFontSize / 2, stroke: (_a = item.midAxisLabelColor) !== null && _a !== void 0 ? _a : midAxisLabelColor, fontSize: (_b = item.midAxisLabelFontSize) !== null && _b !== void 0 ? _b : midAxisLabelFontSize, fontStyle: (_c = item.midAxisLabelFontStyle) !== null && _c !== void 0 ? _c : midAxisLabelFontStyle, fontWeight: (_d = item.midAxisLabelFontWeight) !== null && _d !== void 0 ? _d : midAxisLabelFontWeight, fontFamily: (_e = item.midAxisLabelFontFamily) !== null && _e !== void 0 ? _e : midAxisLabelFontFamily, textAnchor: "middle", children: (_f = item.midAxisLabel) !== null && _f !== void 0 ? _f : '' }, 'ml' + index));
                        })] })) : null] }) }));
};

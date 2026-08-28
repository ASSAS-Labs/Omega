import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Line, Polygon, Circle, Text as SvgText, Defs, RadialGradient, Stop, TSpan, G, } from 'react-native-svg';
import { useRadarChart } from 'gifted-charts-core';
export var RadarChart = function (props) {
    var _a = useRadarChart(props), data = _a.data, dataSet = _a.dataSet, center = _a.center, radius = _a.radius, chartSize = _a.chartSize, chartContainerProps = _a.chartContainerProps, polarToCartesian = _a.polarToCartesian, labels = _a.labels, labelConfigArray = _a.labelConfigArray, labelsPositionOffset = _a.labelsPositionOffset, dataLabelsConfigArray = _a.dataLabelsConfigArray, maxValue = _a.maxValue, dataLabels = _a.dataLabels, dataLabelsArray = _a.dataLabelsArray, gridSections = _a.gridSections, gridFill = _a.gridFill, fontSize = _a.fontSize, stroke = _a.stroke, textAnchor = _a.textAnchor, alignmentBaseline = _a.alignmentBaseline, fontWeight = _a.fontWeight, fontFamily = _a.fontFamily, dataLabelsPositionOffset = _a.dataLabelsPositionOffset, polygonStroke = _a.polygonStroke, polygonStrokeWidth = _a.polygonStrokeWidth, polygonStrokeDashArray = _a.polygonStrokeDashArray, polygonFill = _a.polygonFill, polygonGradientColor = _a.polygonGradientColor, polygonShowGradient = _a.polygonShowGradient, polygonOpacity = _a.polygonOpacity, polygonGradientOpacity = _a.polygonGradientOpacity, polygonIsAnimated = _a.polygonIsAnimated, polygonAnimationDuration = _a.polygonAnimationDuration, asterLinesStroke = _a.asterLinesStroke, asterLinesStrokeWidth = _a.asterLinesStrokeWidth, asterLinesStrokeDashArray = _a.asterLinesStrokeDashArray, polygonPoints = _a.polygonPoints, initialPolygonPoints = _a.initialPolygonPoints, polygonPointsArray = _a.polygonPointsArray, initialPolygonPointsArray = _a.initialPolygonPointsArray, polygonConfigArray = _a.polygonConfigArray, angleStep = _a.angleStep, circular = _a.circular, hideGrid = _a.hideGrid, hideLabels = _a.hideLabels, hideAsterLines = _a.hideAsterLines, getGridLevelProps = _a.getGridLevelProps, animateTogether = _a.animateTogether, startAngle = _a.startAngle;
    var initialPolygonPointsAr = initialPolygonPoints.split(' ');
    var finalPolygonPointsAr = polygonPoints.split(' ');
    var AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
    var animatedValues = data.map(function (_) { return new Animated.Value(0); });
    var animatedPaths = data.map(function (_, index) {
        var _a;
        return (_a = animatedValues[index]) === null || _a === void 0 ? void 0 : _a.interpolate({
            inputRange: [0, 1],
            outputRange: [initialPolygonPointsAr[index], finalPolygonPointsAr[index]],
        });
    });
    useEffect(function () {
        if (dataSet === null || dataSet === void 0 ? void 0 : dataSet.length)
            return;
        animatedValues.forEach(function (animatedValue) {
            return Animated.timing(animatedValue, {
                toValue: 1,
                duration: polygonAnimationDuration,
                useNativeDriver: false,
            }).start();
        });
    }, [data]);
    /******************************************************************************************/
    /*********************        Animation handling for dataSet         *********************/
    var animatedValuesForSet = [];
    var animatedPathsForSet = [];
    if (dataSet === null || dataSet === void 0 ? void 0 : dataSet.length) {
        polygonConfigArray === null || polygonConfigArray === void 0 ? void 0 : polygonConfigArray.forEach(function (_, index) {
            var set = dataSet[index];
            var initialPolygonPointsAr = initialPolygonPointsArray[index].split(' ');
            var finalPolygonPointsAr = polygonPointsArray[index].split(' ');
            var animatedValues = set.map(function (_) { return new Animated.Value(0); });
            animatedValuesForSet.push(animatedValues);
            var animatedPaths = set.map(function (i, ind) {
                return animatedValues[ind].interpolate({
                    inputRange: [0, 1],
                    outputRange: [initialPolygonPointsAr[ind], finalPolygonPointsAr[ind]],
                });
            });
            animatedPathsForSet.push(animatedPaths);
        });
    }
    useEffect(function () {
        if (!(dataSet === null || dataSet === void 0 ? void 0 : dataSet.length))
            return;
        animatedValuesForSet === null || animatedValuesForSet === void 0 ? void 0 : animatedValuesForSet.forEach(function (animatedValues, index) {
            setTimeout(function () {
                animatedValues === null || animatedValues === void 0 ? void 0 : animatedValues.forEach(function (animatedValue) {
                    return Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: polygonAnimationDuration,
                        useNativeDriver: false,
                    }).start();
                });
            }, animateTogether ? 0 : index * polygonAnimationDuration);
        });
    });
    /******************************************************************************************/
    /******************************************************************************************/
    return (_jsx(View, { style: { justifyContent: 'center', alignItems: 'center' }, children: _jsx(Svg, { height: chartContainerProps.height, width: chartContainerProps.width, style: { backgroundColor: chartContainerProps.backgroundColor }, children: _jsxs(G, { translateX: chartContainerProps.shiftX, translateY: chartContainerProps.shiftY, children: [(polygonConfigArray === null || polygonConfigArray === void 0 ? void 0 : polygonConfigArray.length) ? (polygonConfigArray.map(function (polygonConfigItem, index) {
                        var fill = polygonConfigItem.fill, gradientColor = polygonConfigItem.gradientColor, opacity = polygonConfigItem.opacity, gradientOpacity = polygonConfigItem.gradientOpacity;
                        return (_jsx(Defs, { children: _jsxs(RadialGradient, { id: "polygon-".concat(index), cx: center, cy: center, rx: radius, ry: radius, fx: "50%", fy: "50%", gradientUnits: "userSpaceOnUse", children: [_jsx(Stop, { offset: "0%", stopColor: gradientColor, stopOpacity: gradientOpacity }), _jsx(Stop, { offset: "100%", stopColor: fill, stopOpacity: opacity })] }, "polygon-".concat(index)) }, "defs-".concat(index)));
                    })) : polygonShowGradient ? (_jsx(Defs, { children: _jsxs(RadialGradient, { id: 'polygon', cx: center, cy: center, rx: radius, ry: radius, fx: "50%", fy: "50%", gradientUnits: "userSpaceOnUse", children: [_jsx(Stop, { offset: "0%", stopColor: polygonGradientColor, stopOpacity: polygonGradientOpacity }), _jsx(Stop, { offset: "100%", stopColor: polygonFill, stopOpacity: polygonOpacity })] }, 'polygon') })) : null, hideGrid
                        ? null
                        : gridSections.map(function (l, ind) {
                            var _a = getGridLevelProps(l, ind), level = _a.level, gridGradientColorLocal = _a.gridGradientColorLocal, gridFillColorLocal = _a.gridFillColorLocal, gridOpacityLocal = _a.gridOpacityLocal, gridGradientOpacityLocal = _a.gridGradientOpacityLocal, gridStrokeLocal = _a.gridStrokeLocal, gridStrokeWidthLocal = _a.gridStrokeWidthLocal, gridShowGradientLocal = _a.gridShowGradientLocal, gridStrokeDashArrayLocal = _a.gridStrokeDashArrayLocal, levelPolygonPoints = _a.levelPolygonPoints, r = _a.r;
                            return (_jsxs(Fragment, { children: [_jsx(Defs, { children: _jsxs(RadialGradient, { id: 'grad' + level, cx: center, cy: center, rx: r, ry: r, fx: "50%", fy: "50%", gradientUnits: "userSpaceOnUse", children: [_jsx(Stop, { offset: "".concat(100 - 100 / level, "%"), stopColor: gridGradientColorLocal, stopOpacity: gridGradientOpacityLocal }), _jsx(Stop, { offset: "100%", stopColor: gridFillColorLocal, stopOpacity: gridOpacityLocal })] }, level + '') }), circular ? (_jsx(Circle, { cx: center, cy: center, r: r, stroke: gridStrokeLocal, strokeWidth: gridStrokeWidthLocal, strokeDasharray: gridStrokeDashArrayLocal, fill: gridShowGradientLocal
                                            ? "url(#grad".concat(level, ")")
                                            : gridFill }, "grid-".concat(level))) : (_jsx(Polygon, { points: levelPolygonPoints, stroke: gridStrokeLocal, strokeWidth: gridStrokeWidthLocal, strokeDasharray: gridStrokeDashArrayLocal, fill: gridShowGradientLocal
                                            ? "url(#grad".concat(level, ")")
                                            : gridFill }, "grid-".concat(level)))] }, "fragment-".concat(level)));
                        }), dataSet ? (polygonConfigArray === null || polygonConfigArray === void 0 ? void 0 : polygonConfigArray.map(function (item, index) {
                        var polygonPoints = polygonPointsArray[index];
                        var animatedPolygonPoints = animatedPathsForSet[index];
                        var stroke = item.stroke, strokeWidth = item.strokeWidth, strokeDashArray = item.strokeDashArray, fill = item.fill, showGradient = item.showGradient, opacity = item.opacity, _a = item.isAnimated, isAnimated = _a === void 0 ? polygonIsAnimated : _a;
                        return (_jsx(AnimatedPolygon, { points: isAnimated ? animatedPolygonPoints : polygonPoints, fill: showGradient ? 'url(#polygon)' : fill, stroke: stroke, strokeWidth: strokeWidth, strokeDasharray: strokeDashArray, opacity: opacity }, "polygon-".concat(index)));
                    })) : (_jsx(AnimatedPolygon, { points: polygonIsAnimated ? animatedPaths : polygonPoints, fill: polygonShowGradient ? 'url(#polygon)' : polygonFill, stroke: polygonStroke, strokeWidth: polygonStrokeWidth, strokeDasharray: polygonStrokeDashArray, opacity: polygonOpacity })), (dataSet === null || dataSet === void 0 ? void 0 : dataSet.length) && (dataLabelsArray === null || dataLabelsArray === void 0 ? void 0 : dataLabelsArray.length) ? (dataLabelsArray === null || dataLabelsArray === void 0 ? void 0 : dataLabelsArray.map(function (labels, index) {
                        var dataItem = dataSet[index];
                        return labels === null || labels === void 0 ? void 0 : labels.map(function (label, labelIndex) {
                            var _a, _b, _c;
                            var _d = polarToCartesian(labelIndex * angleStep, dataItem[labelIndex] + dataLabelsPositionOffset), x = _d.x, y = _d.y;
                            var _e = (_a = dataLabelsConfigArray === null || dataLabelsConfigArray === void 0 ? void 0 : dataLabelsConfigArray[labelIndex]) !== null && _a !== void 0 ? _a : {}, dataLabelsFontSize = _e.fontSize, dataLabelsColor = _e.stroke, dataLabelsTextAnchor = _e.textAnchor, dataLabelsAlignmentBaseline = _e.alignmentBaseline, dataLabelsFontWeight = _e.fontWeight, dataLabelsFontFamily = _e.fontFamily;
                            return (_jsx(SvgText, { x: x, y: y, fontSize: dataLabelsFontSize, fill: dataLabelsColor, fontWeight: dataLabelsFontWeight, fontFamily: dataLabelsFontFamily, textAnchor: (_b = dataLabelsTextAnchor) !== null && _b !== void 0 ? _b : 'middle', alignmentBaseline: (_c = dataLabelsAlignmentBaseline) !== null && _c !== void 0 ? _c : 'middle', children: label }, "data-label-".concat(index, "-").concat(labelIndex)));
                        });
                    })) : (dataLabels === null || dataLabels === void 0 ? void 0 : dataLabels.length) ? (_jsx(SvgText, { children: dataLabels.map(function (label, index) {
                            var _a, _b, _c;
                            var _d = polarToCartesian(index * angleStep, data[index] + dataLabelsPositionOffset), x = _d.x, y = _d.y;
                            var _e = (_a = dataLabelsConfigArray === null || dataLabelsConfigArray === void 0 ? void 0 : dataLabelsConfigArray[index]) !== null && _a !== void 0 ? _a : {}, dataLabelsFontSize = _e.fontSize, dataLabelsColor = _e.stroke, dataLabelsTextAnchor = _e.textAnchor, dataLabelsAlignmentBaseline = _e.alignmentBaseline, dataLabelsFontWeight = _e.fontWeight, dataLabelsFontFamily = _e.fontFamily;
                            return (_jsx(SvgText, { x: x, y: y, fontSize: dataLabelsFontSize, fill: dataLabelsColor, fontWeight: dataLabelsFontWeight, fontFamily: dataLabelsFontFamily, textAnchor: (_b = dataLabelsTextAnchor) !== null && _b !== void 0 ? _b : 'middle', alignmentBaseline: (_c = dataLabelsAlignmentBaseline) !== null && _c !== void 0 ? _c : 'middle', children: label }, "data-label-".concat(index)));
                        }) })) : null, hideAsterLines
                        ? null
                        : labels.map(function (_, index) {
                            var angle = index * angleStep + startAngle;
                            var _a = polarToCartesian(angle, maxValue), x = _a.x, y = _a.y;
                            return (_jsx(Line, { x1: center, y1: center, x2: x, y2: y, stroke: asterLinesStroke, strokeWidth: asterLinesStrokeWidth, strokeDasharray: asterLinesStrokeDashArray }, "axis-".concat(index)));
                        }), hideLabels
                        ? null
                        : labels.map(function (category, index) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                            var angle = index * angleStep + startAngle;
                            var _q = polarToCartesian(angle, maxValue + labelsPositionOffset), x = _q.x, y = _q.y; // Offset for label position
                            var fontSizeLocal = (_b = (_a = labelConfigArray === null || labelConfigArray === void 0 ? void 0 : labelConfigArray[index]) === null || _a === void 0 ? void 0 : _a.fontSize) !== null && _b !== void 0 ? _b : fontSize;
                            var fontWeightLocal = (_d = (_c = labelConfigArray === null || labelConfigArray === void 0 ? void 0 : labelConfigArray[index]) === null || _c === void 0 ? void 0 : _c.fontWeight) !== null && _d !== void 0 ? _d : fontWeight;
                            var fontFamilyLocal = (_f = (_e = labelConfigArray === null || labelConfigArray === void 0 ? void 0 : labelConfigArray[index]) === null || _e === void 0 ? void 0 : _e.fontFamily) !== null && _f !== void 0 ? _f : fontFamily;
                            var colorLocal = (_h = (_g = labelConfigArray === null || labelConfigArray === void 0 ? void 0 : labelConfigArray[index]) === null || _g === void 0 ? void 0 : _g.stroke) !== null && _h !== void 0 ? _h : stroke;
                            var textAnchorLocal = (_k = (_j = labelConfigArray === null || labelConfigArray === void 0 ? void 0 : labelConfigArray[index]) === null || _j === void 0 ? void 0 : _j.textAnchor) !== null && _k !== void 0 ? _k : textAnchor;
                            var alignmentBaselineLocal = (_m = (_l = labelConfigArray === null || labelConfigArray === void 0 ? void 0 : labelConfigArray[index]) === null || _l === void 0 ? void 0 : _l.alignmentBaseline) !== null && _m !== void 0 ? _m : alignmentBaseline;
                            return (_jsx(SvgText, { x: x, y: y, fontSize: fontSizeLocal, fontWeight: fontWeightLocal, fontFamily: fontFamilyLocal, fill: colorLocal, textAnchor: (_o = textAnchorLocal) !== null && _o !== void 0 ? _o : 'middle', alignmentBaseline: (_p = alignmentBaselineLocal) !== null && _p !== void 0 ? _p : 'middle', children: category.split('\n').map(function (line, idx) { return (_jsx(TSpan, { x: x, dy: idx === 0 ? 0 : fontSizeLocal, children: line }, idx)); }) }, "label-".concat(index)));
                        })] }) }) }));
};

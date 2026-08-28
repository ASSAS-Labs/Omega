import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { getTopAndLeftForStripAndLabel, } from 'gifted-charts-core';
export var StripAndLabel = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var pointerX = props.pointerX, pointerLabelWidth = props.pointerLabelWidth, pointerRadius = props.pointerRadius, pointerWidth = props.pointerWidth, pointerYLocal = props.pointerYLocal, pointerStripUptoDataPoint = props.pointerStripUptoDataPoint, pointerStripHeight = props.pointerStripHeight, pointerItemLocal = props.pointerItemLocal, showPointerStrip = props.showPointerStrip, pointerStripWidth = props.pointerStripWidth, containerHeight = props.containerHeight, xAxisThickness = props.xAxisThickness, pointerStripColor = props.pointerStripColor, pointerConfig = props.pointerConfig, pointerLabelComponent = props.pointerLabelComponent, secondaryPointerItem = props.secondaryPointerItem, pointerItemsForSet = props.pointerItemsForSet, secondaryPointerItemsForSet = props.secondaryPointerItemsForSet, pointerEvents = props.pointerEvents, isBarChart = props.isBarChart, pointerIndex = props.pointerIndex, hasDataSet = props.hasDataSet, containsNegative = props.containsNegative, horizontalStripConfig = props.horizontalStripConfig, screenWidth = props.screenWidth, width = props.width;
    var _j = getTopAndLeftForStripAndLabel(props), top = _j.top, left = _j.left;
    if (isNaN(top) || typeof top !== 'number')
        return null;
    return (_jsxs(View, { style: {
            position: 'absolute',
            top: pointerYLocal,
        }, children: [(isBarChart
                ? showPointerStrip && !pointerLabelComponent
                : showPointerStrip) ? (_jsxs(View, { style: {
                    position: 'absolute',
                    left: -pointerStripWidth / 4,
                    top: containsNegative ? 0 : -pointerYLocal + 8 + xAxisThickness,
                    width: width,
                    height: containerHeight,
                }, children: [_jsxs(Svg, { children: [_jsx(Line, { stroke: pointerStripColor, strokeWidth: pointerStripWidth, strokeDasharray: (pointerConfig === null || pointerConfig === void 0 ? void 0 : pointerConfig.strokeDashArray)
                                    ? pointerConfig === null || pointerConfig === void 0 ? void 0 : pointerConfig.strokeDashArray
                                    : '', x1: pointerX +
                                    pointerRadius +
                                    2 -
                                    pointerStripWidth / 2 +
                                    (((_a = pointerItemLocal[0]) === null || _a === void 0 ? void 0 : _a.pointerShiftX) || 0), y1: pointerStripUptoDataPoint
                                    ? pointerYLocal + pointerRadius - 4
                                    : containerHeight - pointerStripHeight, x2: pointerX +
                                    pointerRadius +
                                    2 -
                                    pointerStripWidth / 2 +
                                    (((_b = pointerItemLocal[0]) === null || _b === void 0 ? void 0 : _b.pointerShiftX) || 0), y2: containerHeight }), horizontalStripConfig && (_jsx(Line, { stroke: (_c = horizontalStripConfig.color) !== null && _c !== void 0 ? _c : pointerStripColor, strokeWidth: (_d = horizontalStripConfig.thickness) !== null && _d !== void 0 ? _d : pointerStripWidth, strokeDasharray: ((_f = (_e = pointerConfig === null || pointerConfig === void 0 ? void 0 : pointerConfig.horizontalStripConfig) === null || _e === void 0 ? void 0 : _e.strokeDashArray) !== null && _f !== void 0 ? _f : pointerConfig === null || pointerConfig === void 0 ? void 0 : pointerConfig.strokeDashArray)
                                    ? pointerConfig === null || pointerConfig === void 0 ? void 0 : pointerConfig.strokeDashArray
                                    : '', x1: 0, y1: pointerYLocal - 7, x2: horizontalStripConfig.horizontalStripUptoDataPoint
                                    ? pointerX + 2
                                    : screenWidth, y2: pointerYLocal - 7 }))] }), (horizontalStripConfig === null || horizontalStripConfig === void 0 ? void 0 : horizontalStripConfig.labelComponent) ? (_jsx(View, { pointerEvents: pointerEvents !== null && pointerEvents !== void 0 ? pointerEvents : 'none', style: [
                            {
                                position: 'absolute',
                                left: 0,
                                top: pointerYLocal -
                                    3 -
                                    ((_g = horizontalStripConfig.labelComponentHeight) !== null && _g !== void 0 ? _g : 30) / 2,
                                width: pointerLabelWidth,
                            },
                        ], children: (_h = horizontalStripConfig === null || horizontalStripConfig === void 0 ? void 0 : horizontalStripConfig.labelComponent) === null || _h === void 0 ? void 0 : _h.call(horizontalStripConfig, hasDataSet ? pointerItemsForSet : pointerItemLocal, hasDataSet
                            ? secondaryPointerItemsForSet
                            : [secondaryPointerItem], pointerIndex) })) : null] })) : null, pointerLabelComponent ? (_jsx(View, { pointerEvents: pointerEvents !== null && pointerEvents !== void 0 ? pointerEvents : 'none', style: [
                    {
                        position: 'absolute',
                        left: left + pointerX,
                        top: top,
                        marginTop: pointerStripUptoDataPoint
                            ? 0
                            : containerHeight - pointerStripHeight,
                        width: pointerLabelWidth,
                    },
                ], children: pointerLabelComponent === null || pointerLabelComponent === void 0 ? void 0 : pointerLabelComponent(hasDataSet ? pointerItemsForSet : pointerItemLocal, hasDataSet ? secondaryPointerItemsForSet : [secondaryPointerItem], pointerIndex) })) : null] }));
};

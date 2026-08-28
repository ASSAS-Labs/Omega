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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, Text } from 'react-native';
import { PieChartMain } from './main';
import { pieColors, usePieChart } from 'gifted-charts-core';
import { isWebApp } from '../utils';
import { useState } from 'react';
import { RotatablePie } from '../Components/Rotatable';
export var PieChart = function (props) {
    if (!props.data)
        return null;
    var _a = usePieChart(props), radius = _a.radius, extraRadius = _a.extraRadius, selectedIndex = _a.selectedIndex, setSelectedIndex = _a.setSelectedIndex, startAngle = _a.startAngle, total = _a.total, donut = _a.donut, isThreeD = _a.isThreeD, semiCircle = _a.semiCircle, inwardExtraLengthForFocused = _a.inwardExtraLengthForFocused, canvasWidth = _a.canvasWidth, canvasHeight = _a.canvasHeight, innerRadius = _a.innerRadius, innerCircleColor = _a.innerCircleColor, innerCircleBorderWidth = _a.innerCircleBorderWidth, innerCircleBorderColor = _a.innerCircleBorderColor, shiftInnerCenterX = _a.shiftInnerCenterX, shiftInnerCenterY = _a.shiftInnerCenterY, tiltAngle = _a.tiltAngle, isDataShifted = _a.isDataShifted, paddingHorizontal = _a.paddingHorizontal, paddingVertical = _a.paddingVertical, data = _a.data, showTooltip = _a.showTooltip, tooltipHorizontalShift = _a.tooltipHorizontalShift, tooltipVerticalShift = _a.tooltipVerticalShift, tooltipComponent = _a.tooltipComponent, getTooltipText = _a.getTooltipText, tooltipBackgroundColor = _a.tooltipBackgroundColor, tooltipBorderRadius = _a.tooltipBorderRadius, tooltipWidth = _a.tooltipWidth, tooltipTextNoOfLines = _a.tooltipTextNoOfLines, textColor = _a.textColor, textSize = _a.textSize, font = _a.font, fontWeight = _a.fontWeight, fontStyle = _a.fontStyle, tooltipSelectedIndex = _a.tooltipSelectedIndex, setTooltipSelectedIndex = _a.setTooltipSelectedIndex, rotatable = _a.rotatable;
    var _b = __read(useState(0), 2), touchX = _b[0], setTouchX = _b[1];
    var _c = __read(useState(0), 2), touchY = _c[0], setTouchY = _c[1];
    var renderInnerCircle = function (innerRadius, innerCircleBorderWidth) {
        var _a, _b;
        if (props.centerLabelComponent || (donut && !isDataShifted)) {
            return (_jsx(View, { style: [
                    {
                        height: innerRadius * 2,
                        width: innerRadius * 2,
                        borderRadius: innerRadius,
                        position: 'absolute',
                        // zIndex: 100,
                        alignSelf: 'center',
                        backgroundColor: innerCircleColor,
                        left: canvasWidth / 2 -
                            innerRadius +
                            shiftInnerCenterX +
                            extraRadius +
                            paddingHorizontal / 2,
                        top: canvasHeight / 2 -
                            innerRadius +
                            shiftInnerCenterY +
                            extraRadius +
                            paddingVertical / 2,
                        borderWidth: innerCircleBorderWidth,
                        borderColor: innerCircleBorderColor,
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    isThreeD && {
                        borderTopWidth: innerCircleBorderWidth * 5,
                        borderLeftWidth: shiftInnerCenterX
                            ? innerCircleBorderWidth * 2
                            : innerCircleBorderWidth,
                        transform: [{ rotateX: tiltAngle }],
                    },
                    semiCircle &&
                        isThreeD && {
                        borderTopWidth: isThreeD
                            ? innerCircleBorderWidth * 5
                            : innerCircleBorderWidth,
                        borderLeftWidth: 0.5,
                        borderLeftColor: innerCircleColor,
                        borderBottomWidth: 0,
                        borderRightWidth: 0.5,
                        borderRightColor: innerCircleColor,
                    },
                ], pointerEvents: "box-none", children: _jsx(View, { style: { marginTop: semiCircle ? -0.5 * innerRadius : 0 }, children: (_b = (_a = props.centerLabelComponent) === null || _a === void 0 ? void 0 : _a.call(props, selectedIndex)) !== null && _b !== void 0 ? _b : null }) }));
        }
        return null;
    };
    var renderTooltip = function () {
        var _a, _b;
        return (_jsx(View, { style: {
                position: 'absolute',
                left: touchX > (radius + extraRadius) * 1.5
                    ? props.tooltipHorizontalShift
                        ? touchX - tooltipHorizontalShift
                        : touchX -
                            (tooltipWidth !== null && tooltipWidth !== void 0 ? tooltipWidth : getTooltipText(tooltipSelectedIndex).length * 10)
                    : touchX - tooltipHorizontalShift,
                top: touchY < 30
                    ? props.tooltipVerticalShift
                        ? touchY - tooltipVerticalShift
                        : touchY
                    : touchY - tooltipVerticalShift,
            }, children: data[tooltipSelectedIndex].tooltipComponent ? ((_b = (_a = data[tooltipSelectedIndex]).tooltipComponent) === null || _b === void 0 ? void 0 : _b.call(_a)) : tooltipComponent ? (tooltipComponent(tooltipSelectedIndex)) : (_jsx(View, { style: {
                    backgroundColor: tooltipBackgroundColor,
                    borderRadius: tooltipBorderRadius,
                    paddingHorizontal: 8,
                    paddingBottom: 8,
                    paddingTop: 4,
                    width: tooltipWidth,
                }, children: _jsx(Text, { numberOfLines: tooltipTextNoOfLines, style: {
                        color: data[tooltipSelectedIndex].textColor ||
                            textColor ||
                            'white',
                        textAlign: 'center',
                        fontSize: textSize,
                        fontFamily: font,
                        fontWeight: fontWeight,
                        fontStyle: fontStyle,
                    }, children: getTooltipText(tooltipSelectedIndex) }) })) }));
    };
    var PieChartBody = function () {
        return (_jsxs(View, { style: {
                height: (radius + extraRadius + paddingVertical / 2) *
                    (props.semiCircle ? 1 : 2),
                width: (radius + extraRadius + paddingHorizontal / 2) * 2,
                overflow: 'hidden',
            }, children: [_jsx(View, { style: { position: 'absolute' }, children: _jsx(PieChartMain, __assign({}, props, { setTouchX: setTouchX, setTouchY: setTouchY, tooltipSelectedIndex: tooltipSelectedIndex, setTooltipSelectedIndex: setTooltipSelectedIndex, selectedIndex: selectedIndex, setSelectedIndex: setSelectedIndex, paddingHorizontal: paddingHorizontal, paddingVertical: paddingVertical, extraRadius: extraRadius })) }), renderInnerCircle(innerRadius, innerCircleBorderWidth), props.data.length > 1 &&
                    props.data[selectedIndex] && // don't forget to add this one so there are no errors when the data is empty / updating
                    (props.focusOnPress || props.sectionAutoFocus) &&
                    selectedIndex !== -1 && (_jsx(View, { pointerEvents: "box-none", style: {
                        position: 'absolute',
                        top: -extraRadius,
                        left: -extraRadius,
                        zIndex: isWebApp ? -1 : 0, // was not getting displayed in web (using Expo)
                    }, children: _jsx(PieChartMain, __assign({}, props, { setTouchX: setTouchX, setTouchY: setTouchY, tooltipSelectedIndex: tooltipSelectedIndex, setTooltipSelectedIndex: setTooltipSelectedIndex, data: [
                            __assign(__assign({}, props.data[selectedIndex]), { color: props.showGradient
                                    ? "url(#grad".concat(selectedIndex, ")")
                                    : props.data[selectedIndex].color ||
                                        pieColors[selectedIndex % 9] }),
                            {
                                value: total - props.data[selectedIndex].value,
                                peripheral: true,
                                strokeWidth: 0,
                            },
                        ], radius: radius + extraRadius, initialAngle: startAngle, innerRadius: props.innerRadius || radius / 2.5, isBiggerPie: true, selectedIndex: selectedIndex, setSelectedIndex: setSelectedIndex, paddingHorizontal: paddingHorizontal, paddingVertical: paddingVertical, extraRadius: extraRadius })) })), renderInnerCircle(innerRadius - inwardExtraLengthForFocused, inwardExtraLengthForFocused ? 0 : innerCircleBorderWidth), showTooltip && tooltipSelectedIndex !== -1 ? renderTooltip() : null] }));
    };
    if (rotatable && !semiCircle) {
        return (_jsx(RotatablePie, { children: [_jsx(PieChartBody, {}, "PieChartBody")], initialAngle: startAngle, size: radius * 2 }));
    }
    return _jsx(PieChartBody, {});
};

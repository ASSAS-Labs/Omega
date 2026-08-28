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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, Defs, RadialGradient, Stop, G, Line, } from 'react-native-svg';
import { getPieChartMainProps, pieColors, } from 'gifted-charts-core';
import { isWebApp, rnVersion } from '../utils';
export var PieChartMain = function (props) {
    var _a;
    var _b = getPieChartMainProps(props), isThreeD = _b.isThreeD, isBiggerPie = _b.isBiggerPie, data = _b.data, showInnerComponent = _b.showInnerComponent, radius = _b.radius, canvasWidth = _b.canvasWidth, canvasHeight = _b.canvasHeight, shadowWidth = _b.shadowWidth, backgroundColor = _b.backgroundColor, shadowColor = _b.shadowColor, semiCircle = _b.semiCircle, pi = _b.pi, initialAngle = _b.initialAngle, shadow = _b.shadow, donut = _b.donut, strokeWidth = _b.strokeWidth, strokeColor = _b.strokeColor, innerRadius = _b.innerRadius, showText = _b.showText, textColor = _b.textColor, textSize = _b.textSize, tiltAngle = _b.tiltAngle, labelsPosition = _b.labelsPosition, showTextBackground = _b.showTextBackground, textBackgroundColor = _b.textBackgroundColor, showValuesAsLabels = _b.showValuesAsLabels, showGradient = _b.showGradient, gradientCenterColor = _b.gradientCenterColor, minShiftX = _b.minShiftX, minShiftY = _b.minShiftY, total = _b.total, horizAdjustment = _b.horizAdjustment, vertAdjustment = _b.vertAdjustment, cx = _b.cx, cy = _b.cy, mData = _b.mData, paddingHorizontal = _b.paddingHorizontal, paddingVertical = _b.paddingVertical, extraRadius = _b.extraRadius, showExternalLabels = _b.showExternalLabels, getExternaLabelProperties = _b.getExternaLabelProperties, coordinates = _b.coordinates, onPressed = _b.onPressed, font = _b.font, fontWeight = _b.fontWeight, fontStyle = _b.fontStyle, edgesPressable = _b.edgesPressable;
    var setTouchX = props.setTouchX, setTouchY = props.setTouchY;
    var prevSide = 'right';
    var prevLabelComponentX = 0;
    var wasFirstItemOnPole = false;
    var _c = __read(useState(0), 2), top = _c[0], setTop = _c[1];
    var _d = __read(useState(0), 2), left = _d[0], setLeft = _d[1];
    var onPressHandler = function (e) {
        var x = 0, y = 0;
        if (isWebApp) {
            x = e.clientX - left;
            y = e.clientY - top;
        }
        else {
            x = e.nativeEvent.locationX;
            y = e.nativeEvent.locationY;
        }
        x -= extraRadius;
        y -= extraRadius;
        setTouchX(x);
        setTouchY(y);
        var r = Math.sqrt(Math.pow((x - cx), 2) + Math.pow((y - cy), 2));
        if (r > radius || (donut && r < innerRadius))
            return;
        var a = Math.atan2(y - cy, x - cx);
        for (var index = 0; index < data.length; index++) {
            var angle = coordinates[index];
            var sx = angle.sx, sy = angle.sy, ax = angle.ax, ay = angle.ay;
            var startAngle = Math.atan2(sy - cy, sx - cx);
            var endAngle = Math.atan2(ay - cy, ax - cx);
            if (startAngle < endAngle) {
                if (startAngle < a && a < endAngle) {
                    onPressed(data[index], index);
                    break;
                }
            }
            else {
                if (a > startAngle || a < endAngle) {
                    onPressed(data[index], index);
                    break;
                }
            }
        }
    };
    return (_jsx(Pressable, { onPress: onPressHandler, pointerEvents: isBiggerPie && !edgesPressable ? 'none' : 'auto', children: _jsxs(View, { pointerEvents: "box-only", onLayout: function (e) {
                if (!isWebApp)
                    return;
                setTop(e.nativeEvent.layout.top);
                setLeft(e.nativeEvent.layout.left);
            }, style: [
                {
                    backgroundColor: backgroundColor,
                    height: semiCircle
                        ? (canvasHeight + paddingVertical) / 2 + extraRadius
                        : canvasHeight + paddingVertical + extraRadius * 2,
                    width: canvasWidth + paddingHorizontal + extraRadius * 2,
                    overflow: 'hidden',
                },
                isThreeD && { transform: [{ rotateX: tiltAngle }] },
            ], children: [_jsxs(Svg, { pointerEvents: rnVersion >= 720000 ? 'box-none' : 'auto', viewBox: "".concat(strokeWidth / -2 + minShiftX - extraRadius - paddingHorizontal / 2, " ").concat(strokeWidth / -2 + minShiftY - extraRadius - paddingVertical / 2, " ").concat((radius + extraRadius + strokeWidth) * 2 +
                        paddingHorizontal +
                        horizAdjustment +
                        (horizAdjustment ? strokeWidth : 0), " ").concat((radius + extraRadius + strokeWidth) * 2 +
                        paddingVertical +
                        vertAdjustment +
                        (vertAdjustment ? strokeWidth : 0)), height: (radius + extraRadius) * 2 + strokeWidth + paddingVertical, width: (radius + extraRadius) * 2 + strokeWidth + paddingHorizontal, children: [_jsx(Defs, { children: data.map(function (item, index) {
                                return (_jsxs(RadialGradient, { id: 'grad' + index, cx: "50%", cy: "50%", rx: "50%", ry: "50%", fx: "50%", fy: "50%", gradientUnits: "userSpaceOnUse", children: [_jsx(Stop, { offset: "0%", stopColor: item.gradientCenterColor || gradientCenterColor, stopOpacity: "1" }), _jsx(Stop, { offset: "100%", stopColor: item.color || pieColors[index % 9], stopOpacity: "1" })] }, index + ''));
                            }) }), data.length === 1 || !total ? (_jsx(_Fragment, { children: _jsx(Circle, { cx: cx, cy: cy, r: radius, fill: showGradient
                                    ? "url(#grad".concat(0, ")")
                                    : ((_a = data[0]) === null || _a === void 0 ? void 0 : _a.color) || pieColors[0 % 9] }) })) : (data.map(function (item, index) {
                            var _a;
                            var _b = coordinates[index], sx = _b.sx, sy = _b.sy, ax = _b.ax, ay = _b.ay;
                            if (isBiggerPie && index)
                                return null;
                            return (_jsx(Path, { d: "M ".concat(cx + (item.shiftX || 0), " ").concat(cy + (item.shiftY || 0), " L ").concat(sx, " ").concat(sy, " A ").concat(radius, " ").concat(radius, " 0 ").concat(semiCircle ? 0 : data[index].value > total / 2 ? 1 : 0, " 1 ").concat(ax, " ").concat(ay, " L ").concat(cx + (item.shiftX || 0), " ").concat(cy + (item.shiftY || 0)), stroke: item.strokeColor || strokeColor, strokeWidth: props.focusOnPress && props.selectedIndex === index
                                    ? 0
                                    : item.strokeWidth === 0
                                        ? 0
                                        : item.strokeWidth || strokeWidth, fill: item.peripheral
                                    ? 'none'
                                    : showGradient
                                        ? "url(#grad".concat(index, ")")
                                        : item.color || pieColors[isBiggerPie ? (_a = props.selectedIndex) !== null && _a !== void 0 ? _a : 0 % 9 : index % 9] }, index + 'a'));
                        })), (showText || showInnerComponent || showExternalLabels) &&
                            data.map(function (item, index) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                                var localPieInnerComponent = (_a = item.pieInnerComponent) !== null && _a !== void 0 ? _a : props.pieInnerComponent;
                                var pieInnerComponentHeight = (_b = props.pieInnerComponentHeight) !== null && _b !== void 0 ? _b : 0;
                                var pieInnerComponentWidth = (_c = props.pieInnerComponentWidth) !== null && _c !== void 0 ? _c : 0;
                                if (isBiggerPie && index)
                                    return null;
                                if (!props.data[index].value)
                                    return null;
                                var mx = cx * (1 + Math.sin(2 * pi * mData[index] + initialAngle));
                                var my = cy * (1 - Math.cos(2 * pi * mData[index] + initialAngle));
                                var midx = (mx + cx) / 2;
                                var midy = (my + cy) / 2;
                                var x = midx, y = midy;
                                var labelPosition = item.labelPosition || labelsPosition;
                                if (labelPosition === 'onBorder') {
                                    x = mx;
                                    y = my;
                                }
                                else if (labelPosition === 'outward') {
                                    x = (midx + mx) / 2;
                                    y = (midy + my) / 2;
                                }
                                else if (labelPosition === 'inward') {
                                    x = (midx + cx) / 2;
                                    y = (midy + cy) / 2;
                                }
                                x += item.shiftX || 0;
                                y += item.shiftY || 0;
                                if (data.length === 1) {
                                    if (donut) {
                                        y =
                                            (radius -
                                                innerRadius +
                                                (item.textBackgroundRadius ||
                                                    props.textBackgroundRadius ||
                                                    item.textSize ||
                                                    textSize)) /
                                                2;
                                    }
                                    else {
                                        y = cy;
                                    }
                                }
                                var _k = getExternaLabelProperties(item, mx, my, cx, cy, prevSide, prevLabelComponentX, index === data.length - 1, // isLast
                                wasFirstItemOnPole), labelLineColor = _k.labelLineColor, labelLineThickness = _k.labelLineThickness, labelComponentHeight = _k.labelComponentHeight, inX = _k.inX, inY = _k.inY, outX = _k.outX, outY = _k.outY, finalX = _k.finalX, labelComponentX = _k.labelComponentX, labelComponentY = _k.labelComponentY, localExternalLabelComponent = _k.localExternalLabelComponent, isRightHalf = _k.isRightHalf;
                                prevSide = isRightHalf ? 'right' : 'left';
                                prevLabelComponentX = labelComponentX;
                                if (index === 0)
                                    wasFirstItemOnPole = labelComponentY !== outY;
                                return (_jsxs(React.Fragment, { children: [showExternalLabels ? (_jsxs(G, { children: [_jsx(Line, { x1: inX, x2: outX, y1: inY, y2: outY, stroke: labelLineColor, strokeWidth: labelLineThickness }), _jsx(Line, { x1: outX, x2: finalX, y1: outY, y2: outY, stroke: labelLineColor, strokeWidth: labelLineThickness }), localExternalLabelComponent ? (_jsx(G, { x: labelComponentX, y: labelComponentY + labelComponentHeight / 2, children: (_d = localExternalLabelComponent === null || localExternalLabelComponent === void 0 ? void 0 : localExternalLabelComponent(item, index)) !== null && _d !== void 0 ? _d : null })) : null] })) : null, showTextBackground ? (_jsx(Circle, { cx: x + ((_f = (_e = item.shiftTextBackgroundX) !== null && _e !== void 0 ? _e : item.shiftTextX) !== null && _f !== void 0 ? _f : 0), cy: y +
                                                ((_h = (_g = item.shiftTextBackgroundY) !== null && _g !== void 0 ? _g : item.shiftTextY) !== null && _h !== void 0 ? _h : 0) -
                                                (item.textSize || textSize) / 4, r: item.textBackgroundRadius ||
                                                props.textBackgroundRadius ||
                                                item.textSize ||
                                                textSize, fill: item.textBackgroundColor || textBackgroundColor })) : null, showText && (_jsx(SvgText, { fill: item.textColor ||
                                                textColor ||
                                                'black', fontSize: item.textSize || textSize, fontFamily: item.font || font, fontWeight: item.fontWeight || fontWeight, fontStyle: item.fontStyle || fontStyle || 'normal', x: x +
                                                (item.shiftTextX || 0) -
                                                (item.textSize || textSize) / 1.8, y: y + (item.shiftTextY || 0), children: item.text || (showValuesAsLabels ? item.value + '' : '') })), localPieInnerComponent ? (_jsx(G, { x: x - pieInnerComponentHeight / 2, y: y - pieInnerComponentWidth / 2, children: (_j = localPieInnerComponent === null || localPieInnerComponent === void 0 ? void 0 : localPieInnerComponent(item, index)) !== null && _j !== void 0 ? _j : null })) : null] }, index));
                            })] }), isThreeD && shadow && !semiCircle ? (_jsx(View, { style: {
                        width: radius * 2,
                        height: radius * 2,
                        backgroundColor: shadowColor,
                        borderRadius: radius,
                        position: 'absolute',
                        top: shadowWidth + paddingVertical / 2,
                        left: paddingHorizontal / 2,
                        zIndex: -1,
                    } })) : null] }) }));
};

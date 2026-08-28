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
import { useEffect, useState } from 'react';
import { getTextSizeForPieLabels } from '../utils';
import { PieTooltipDefaults } from '../utils/constants';
export var usePieChart = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    var showTooltip = props.showTooltip, tooltipWidth = props.tooltipWidth, tooltipComponent = props.tooltipComponent, _v = props.tooltipVerticalShift, tooltipVerticalShift = _v === void 0 ? PieTooltipDefaults.tooltipVerticalShift : _v, _w = props.tooltipHorizontalShift, tooltipHorizontalShift = _w === void 0 ? PieTooltipDefaults.tooltipHorizontalShift : _w, _x = props.showValuesAsTooltipText, showValuesAsTooltipText = _x === void 0 ? PieTooltipDefaults.showValuesAsTooltipText : _x, _y = props.tooltipTextNoOfLines, tooltipTextNoOfLines = _y === void 0 ? PieTooltipDefaults.tooltipTextNoOfLines : _y, _z = props.tooltipBackgroundColor, tooltipBackgroundColor = _z === void 0 ? PieTooltipDefaults.tooltipBackgroundColor : _z, _0 = props.tooltipBorderRadius, tooltipBorderRadius = _0 === void 0 ? PieTooltipDefaults.tooltipBorderRadius : _0, textColor = props.textColor, 
    // textSize,
    font = props.font, fontWeight = props.fontWeight, fontStyle = props.fontStyle, initialAngle = props.initialAngle, _1 = props.rotatable, rotatable = _1 === void 0 ? false : _1;
    var _2 = __read(useState(-1), 2), tooltipSelectedIndex = _2[0], setTooltipSelectedIndex = _2[1];
    var radius = (_a = props.radius) !== null && _a !== void 0 ? _a : 120;
    var extraRadius = (_b = props.extraRadius) !== null && _b !== void 0 ? _b : (props.showExternalLabels
        ? 40
        : ((_c = props.focusOnPress) !== null && _c !== void 0 ? _c : props.sectionAutoFocus)
            ? radius / 10
            : 0);
    var pi = props.semiCircle ? Math.PI / 2 : Math.PI;
    var _3 = __read(useState((_d = props.focusedPieIndex) !== null && _d !== void 0 ? _d : -1), 2), selectedIndex = _3[0], setSelectedIndex = _3[1]; // at the start, nothing is selected
    // because we're going to use a useEffect, we need startAngle and total to be state variables
    var _4 = __read(useState(initialAngle !== null && initialAngle !== void 0 ? initialAngle : (props.semiCircle ? -pi : 0)), 2), startAngle = _4[0], setStartAngle = _4[1];
    var _5 = __read(useState(0), 2), total = _5[0], setTotal = _5[1];
    useEffect(function () {
        var _a;
        setSelectedIndex((_a = props.focusedPieIndex) !== null && _a !== void 0 ? _a : -1);
    }, [props.focusedPieIndex]);
    useEffect(function () {
        // Update the total, this could be use to replace the forEach : const newTotal = props.data.reduce((acc, item) => acc + item.value, 0);
        var newTotal = 0;
        props.data.forEach(function (item, index) {
            newTotal += item.value;
            if (index === props.focusedPieIndex)
                item.focused = true;
        });
        setTotal(newTotal);
        // Update selectedIndex based on focused item
        var newSelectedIndex = props.data.findIndex(function (item) { return item.focused === true; });
        setSelectedIndex(newSelectedIndex);
        // Calculate the new start angle
        var newStartAngle = initialAngle !== null && initialAngle !== void 0 ? initialAngle : (props.semiCircle ? -pi : 0);
        if (newSelectedIndex !== -1) {
            // it was !== 0 here before, which would not work, it's either !==-1 or >=0
            // This could be used to replace the for loop that was used before
            var sumBeforeSelectedIndex = props.data
                .slice(0, newSelectedIndex)
                .reduce(function (acc, item) { return acc + item.value; }, 0);
            setStartAngle(newStartAngle + (2 * pi * sumBeforeSelectedIndex) / (newTotal || 1));
        }
        else {
            setStartAngle(newStartAngle);
        }
    }, [props.data, initialAngle, props.semiCircle]);
    useEffect(function () {
        var _a, _b;
        if (selectedIndex !== -1) {
            var newStartAngle = initialAngle !== null && initialAngle !== void 0 ? initialAngle : (props.semiCircle ? -pi : 0);
            var start = 0;
            for (var i = 0; i < selectedIndex; i++) {
                start += (_b = (_a = props.data[i]) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0;
            }
            if (total) {
                setStartAngle(newStartAngle + (2 * pi * start) / (total || 1));
            }
        }
    }, [selectedIndex]);
    var pro = props.pro, data = props.data, donut = props.donut, isThreeD = props.isThreeD, semiCircle = props.semiCircle, _6 = props.inwardExtraLengthForFocused, inwardExtraLengthForFocused = _6 === void 0 ? 0 : _6, _7 = props.isAnimated, isAnimated = _7 === void 0 ? false : _7, edgesRadius = props.edgesRadius;
    var endAngle = (_e = props.endAngle) !== null && _e !== void 0 ? _e : startAngle + Math.PI * (semiCircle ? 1 : 2);
    var canvasWidth = radius * 2;
    var canvasHeight = isThreeD ? radius * 2.3 : radius * 2;
    var strokeWidth = (_f = props.strokeWidth) !== null && _f !== void 0 ? _f : 0;
    var innerRadius = (_g = props.innerRadius) !== null && _g !== void 0 ? _g : radius / 2.5;
    var innerCircleColor = (_j = (_h = props.innerCircleColor) !== null && _h !== void 0 ? _h : props.backgroundColor) !== null && _j !== void 0 ? _j : 'white';
    var innerCircleBorderWidth = (_k = props.innerCircleBorderWidth) !== null && _k !== void 0 ? _k : (props.innerCircleBorderColor ? strokeWidth || 2 : 0);
    var innerCircleBorderColor = (_l = props.innerCircleBorderColor) !== null && _l !== void 0 ? _l : 'lightgray';
    var shiftInnerCenterX = (_m = props.shiftInnerCenterX) !== null && _m !== void 0 ? _m : 0;
    var shiftInnerCenterY = (_o = props.shiftInnerCenterY) !== null && _o !== void 0 ? _o : 0;
    var tiltAngle = (_p = props.tiltAngle) !== null && _p !== void 0 ? _p : '55deg';
    var isDataShifted = false;
    data.forEach(function (item) {
        if (item.shiftX || item.shiftY) {
            isDataShifted = true;
        }
    });
    var textSize = getTextSizeForPieLabels((_q = props.textSize) !== null && _q !== void 0 ? _q : 0, radius);
    var paddingHorizontal = ((_r = props.paddingHorizontal) !== null && _r !== void 0 ? _r : props.labelsPosition === 'onBorder')
        ? ((_s = props.textBackgroundRadius) !== null && _s !== void 0 ? _s : textSize) * 2 + 6
        : 0;
    var paddingVertical = ((_t = props.paddingVertical) !== null && _t !== void 0 ? _t : props.labelsPosition === 'onBorder')
        ? ((_u = props.textBackgroundRadius) !== null && _u !== void 0 ? _u : textSize) * 2 + 6
        : 0;
    var getTooltipText = function (index) {
        var _a, _b;
        var item = data[index];
        var tooltipText = (_b = (_a = item.tooltipText) !== null && _a !== void 0 ? _a : item.text) !== null && _b !== void 0 ? _b : (showValuesAsTooltipText ? item.value.toString() : '');
        return tooltipText;
    };
    return {
        radius: radius,
        extraRadius: extraRadius,
        pi: pi,
        selectedIndex: selectedIndex,
        setSelectedIndex: setSelectedIndex,
        startAngle: startAngle,
        endAngle: endAngle,
        setStartAngle: setStartAngle,
        total: total,
        setTotal: setTotal,
        data: data,
        donut: donut,
        isThreeD: isThreeD,
        semiCircle: semiCircle,
        inwardExtraLengthForFocused: inwardExtraLengthForFocused,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        strokeWidth: strokeWidth,
        innerRadius: innerRadius,
        innerCircleColor: innerCircleColor,
        innerCircleBorderWidth: innerCircleBorderWidth,
        innerCircleBorderColor: innerCircleBorderColor,
        shiftInnerCenterX: shiftInnerCenterX,
        shiftInnerCenterY: shiftInnerCenterY,
        tiltAngle: tiltAngle,
        isDataShifted: isDataShifted,
        paddingHorizontal: paddingHorizontal,
        paddingVertical: paddingVertical,
        showTooltip: showTooltip,
        tooltipHorizontalShift: tooltipHorizontalShift,
        tooltipVerticalShift: tooltipVerticalShift,
        tooltipComponent: tooltipComponent,
        getTooltipText: getTooltipText,
        tooltipBackgroundColor: tooltipBackgroundColor,
        tooltipBorderRadius: tooltipBorderRadius,
        tooltipWidth: tooltipWidth,
        tooltipTextNoOfLines: tooltipTextNoOfLines,
        textColor: textColor,
        textSize: textSize,
        font: font,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        tooltipSelectedIndex: tooltipSelectedIndex,
        setTooltipSelectedIndex: setTooltipSelectedIndex,
        rotatable: rotatable
    };
};

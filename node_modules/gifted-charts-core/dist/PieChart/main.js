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
import { useRef } from 'react';
import { defaultLabelLineConfig, emptyExternaLabelProperties, getTextSizeForPieLabels } from '../utils';
import { PieTooltipDefaults } from '../utils/constants';
export var getPieChartMainProps = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12;
    var isThreeD = props.isThreeD, isBiggerPie = props.isBiggerPie, paddingHorizontal = props.paddingHorizontal, paddingVertical = props.paddingVertical, extraRadius = props.extraRadius, showExternalLabels = props.showExternalLabels, externalLabelComponent = props.externalLabelComponent, showTooltip = props.showTooltip, tooltipWidth = props.tooltipWidth, persistTooltip = props.persistTooltip, tooltipComponent = props.tooltipComponent, _13 = props.tooltipDuration, tooltipDuration = _13 === void 0 ? PieTooltipDefaults.tooltipDuration : _13, _14 = props.tooltipVerticalShift, tooltipVerticalShift = _14 === void 0 ? PieTooltipDefaults.tooltipVerticalShift : _14, _15 = props.tooltipHorizontalShift, tooltipHorizontalShift = _15 === void 0 ? PieTooltipDefaults.tooltipHorizontalShift : _15, _16 = props.showValuesAsTooltipText, showValuesAsTooltipText = _16 === void 0 ? PieTooltipDefaults.showValuesAsTooltipText : _16, _17 = props.tooltipTextNoOfLines, tooltipTextNoOfLines = _17 === void 0 ? PieTooltipDefaults.tooltipTextNoOfLines : _17, _18 = props.tooltipBackgroundColor, tooltipBackgroundColor = _18 === void 0 ? PieTooltipDefaults.tooltipBackgroundColor : _18, _19 = props.tooltipBorderRadius, tooltipBorderRadius = _19 === void 0 ? PieTooltipDefaults.tooltipBorderRadius : _19, font = props.font, fontWeight = props.fontWeight, fontStyle = props.fontStyle, edgesPressable = props.edgesPressable, tooltipSelectedIndex = props.tooltipSelectedIndex, setTooltipSelectedIndex = props.setTooltipSelectedIndex;
    var propData = props.data;
    var data = [];
    var minisculeDataItem = props.data.map(function (item) { return item.value; }).reduce(function (v, a) { return v + a; }, 0) / 160000;
    var itemHasInnerComponent = false;
    if (propData) {
        for (var i = 0; i < propData.length; i++) {
            if (propData[i].pieInnerComponent)
                itemHasInnerComponent = true;
            if (propData[i].value > minisculeDataItem) {
                data.push(propData[i]);
            }
            else {
                data.push(__assign(__assign({}, propData[i]), { value: minisculeDataItem }));
            }
        }
    }
    var showInnerComponent = !!props.pieInnerComponent || itemHasInnerComponent;
    var radius = (_a = props.radius) !== null && _a !== void 0 ? _a : 120;
    var canvasWidth = radius * 2;
    var canvasHeight = isThreeD ? radius * 2.3 : radius * 2;
    var shadowWidth = (_b = props.shadowWidth) !== null && _b !== void 0 ? _b : radius / 5;
    var backgroundColor = (_c = props.backgroundColor) !== null && _c !== void 0 ? _c : 'transparent';
    var shadowColor = (_d = props.shadowColor) !== null && _d !== void 0 ? _d : 'lightgray';
    var semiCircle = (_e = props.semiCircle) !== null && _e !== void 0 ? _e : false;
    var pi = Math.PI;
    var initialAngle = (_f = props.initialAngle) !== null && _f !== void 0 ? _f : (semiCircle ? pi / -2 : 0);
    var shadow = (_g = props.shadow) !== null && _g !== void 0 ? _g : false;
    var donut = (_h = props.donut) !== null && _h !== void 0 ? _h : false;
    var strokeWidth = (_j = props.strokeWidth) !== null && _j !== void 0 ? _j : 0;
    var strokeColor = (_k = props.strokeColor) !== null && _k !== void 0 ? _k : (strokeWidth ? 'gray' : 'transparent');
    var innerRadius = (_l = props.innerRadius) !== null && _l !== void 0 ? _l : radius / 2.5;
    var showText = (_m = props.showText) !== null && _m !== void 0 ? _m : false;
    var textColor = (_o = props.textColor) !== null && _o !== void 0 ? _o : '';
    var textSize = getTextSizeForPieLabels((_p = props.textSize) !== null && _p !== void 0 ? _p : 0, radius);
    var labelLineConfig = {
        length: (_r = (_q = props.labelLineConfig) === null || _q === void 0 ? void 0 : _q.length) !== null && _r !== void 0 ? _r : defaultLabelLineConfig.length,
        tailLength: (_t = (_s = props.labelLineConfig) === null || _s === void 0 ? void 0 : _s.tailLength) !== null && _t !== void 0 ? _t : defaultLabelLineConfig.tailLength,
        color: (_v = (_u = props.labelLineConfig) === null || _u === void 0 ? void 0 : _u.color) !== null && _v !== void 0 ? _v : defaultLabelLineConfig.color,
        thickness: (_x = (_w = props.labelLineConfig) === null || _w === void 0 ? void 0 : _w.thickness) !== null && _x !== void 0 ? _x : defaultLabelLineConfig.thickness,
        labelComponentWidth: (_z = (_y = props.labelLineConfig) === null || _y === void 0 ? void 0 : _y.labelComponentWidth) !== null && _z !== void 0 ? _z : defaultLabelLineConfig.labelComponentWidth,
        labelComponentHeight: (_1 = (_0 = props.labelLineConfig) === null || _0 === void 0 ? void 0 : _0.labelComponentHeight) !== null && _1 !== void 0 ? _1 : defaultLabelLineConfig.labelComponentHeight,
        labelComponentMargin: (_3 = (_2 = props.labelLineConfig) === null || _2 === void 0 ? void 0 : _2.labelComponentMargin) !== null && _3 !== void 0 ? _3 : defaultLabelLineConfig.labelComponentMargin,
        avoidOverlappingOfLabels: (_5 = (_4 = props.labelLineConfig) === null || _4 === void 0 ? void 0 : _4.avoidOverlappingOfLabels) !== null && _5 !== void 0 ? _5 : defaultLabelLineConfig.avoidOverlappingOfLabels
    };
    var tiltAngle = (_6 = props.tiltAngle) !== null && _6 !== void 0 ? _6 : '55deg';
    if (tiltAngle &&
        !isNaN(Number(tiltAngle)) &&
        !(tiltAngle + '').endsWith('deg')) {
        tiltAngle += 'deg';
    }
    // const tilt = props.tilt ? Math.min(props.tilt, 1) : props.isThreeD ? 0.5 : 1;
    var labelsPosition = props.labelsPosition
        ? props.labelsPosition
        : donut || props.centerLabelComponent
            ? 'outward'
            : 'mid';
    var showTextBackground = (_7 = props.showTextBackground) !== null && _7 !== void 0 ? _7 : false;
    var textBackgroundColor = (_8 = props.textBackgroundColor) !== null && _8 !== void 0 ? _8 : 'white';
    var showValuesAsLabels = (_9 = props.showValuesAsLabels) !== null && _9 !== void 0 ? _9 : false;
    var showGradient = (_10 = props.showGradient) !== null && _10 !== void 0 ? _10 : false;
    var gradientCenterColor = (_11 = props.gradientCenterColor) !== null && _11 !== void 0 ? _11 : 'white';
    var toggleFocusOnPress = (_12 = props.toggleFocusOnPress) !== null && _12 !== void 0 ? _12 : true;
    var minShiftX = 0;
    var maxShiftX = 0;
    var minShiftY = 0;
    var maxShiftY = 0;
    var total = 0;
    data.forEach(function (item) {
        if (item.shiftX || item.shiftY) {
            if (minShiftX > item.shiftX) {
                minShiftX = item.shiftX;
            }
            if (minShiftY > item.shiftY) {
                minShiftY = item.shiftY;
            }
            if (maxShiftX < item.shiftX) {
                maxShiftX = item.shiftX;
            }
            if (maxShiftY < item.shiftY) {
                maxShiftY = item.shiftY;
            }
        }
    });
    var horizAdjustment = maxShiftX - minShiftX;
    var vertAdjustment = maxShiftY - minShiftY;
    if (semiCircle) {
        pi = Math.PI / 2;
    }
    var cx = radius;
    var cy = radius;
    total =
        data && data.length > 0
            ? data.map(function (item) { return item.value; }).reduce(function (v, a) { return v + a; }, 0)
            : 0;
    var acc = 0;
    var pData = data.map(function (item) {
        acc += item.value / total;
        return acc;
    });
    acc = 0;
    var mData = data.map(function (item) {
        var pAcc = acc;
        acc += item.value / total;
        return pAcc + (acc - pAcc) / 2;
    });
    pData = __spreadArray([0], __read(pData), false);
    var getExternaLabelProperties = function (item, mx, my, cx, cy, prevSide, prevLabelComponentX, isLast, wasFirstItemOnPole) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        if (!showExternalLabels)
            return emptyExternaLabelProperties;
        var labelLineLength = (_b = (_a = item.labelLineConfig) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : labelLineConfig.length;
        var labelTailLength = (_d = (_c = item.labelLineConfig) === null || _c === void 0 ? void 0 : _c.tailLength) !== null && _d !== void 0 ? _d : labelLineConfig.tailLength;
        var labelLineColor = (_f = (_e = item.labelLineConfig) === null || _e === void 0 ? void 0 : _e.color) !== null && _f !== void 0 ? _f : labelLineConfig.color;
        var labelLineThickness = (_h = (_g = item.labelLineConfig) === null || _g === void 0 ? void 0 : _g.thickness) !== null && _h !== void 0 ? _h : labelLineConfig.thickness;
        var labelComponentWidth = (_k = (_j = item.labelLineConfig) === null || _j === void 0 ? void 0 : _j.labelComponentWidth) !== null && _k !== void 0 ? _k : labelLineConfig.labelComponentWidth;
        var labelComponentHeight = (_m = (_l = item.labelLineConfig) === null || _l === void 0 ? void 0 : _l.labelComponentHeight) !== null && _m !== void 0 ? _m : labelLineConfig.labelComponentHeight;
        var labelComponentMargin = (_p = (_o = item.labelLineConfig) === null || _o === void 0 ? void 0 : _o.labelComponentMargin) !== null && _p !== void 0 ? _p : labelLineConfig.labelComponentMargin;
        var isRightHalf = mx > cx;
        var slope = (my - cy) / (mx - cx);
        var xFactor = labelTailLength / Math.sqrt(1 + slope * slope);
        var yFactor = (labelTailLength * slope) / Math.sqrt(1 + slope * slope);
        var outX = mx + (isRightHalf ? xFactor : -xFactor);
        var outY = my + (isRightHalf ? yFactor : -yFactor);
        var inX = mx + (isRightHalf ? -xFactor : xFactor);
        var inY = my + (isRightHalf ? -yFactor : yFactor);
        var labelComponentY = outY;
        var side = isRightHalf ? 'right' : 'left';
        var isOnPole = labelLineConfig.avoidOverlappingOfLabels &&
            Math.abs(inX - outX) < 4 &&
            side === prevSide;
        var finalX = isRightHalf ? cx * 2 + labelLineLength : -labelLineLength;
        if (isOnPole) {
            finalX = outX;
            labelComponentY += outY > cy ? 10 : -10;
        }
        else {
            finalX = isRightHalf
                ? finalX > outX
                    ? finalX
                    : outX
                : finalX < outX
                    ? finalX
                    : outX;
        }
        var labelComponentX = isRightHalf
            ? finalX + (isOnPole ? -10 : labelComponentMargin)
            : finalX - labelComponentWidth - (isOnPole ? -20 : labelComponentMargin);
        // In case both previous & current labels are at pole, then their labels might again overlap, to counter this, we vertically shift the current label
        if (labelLineConfig.avoidOverlappingOfLabels &&
            isOnPole &&
            (Math.abs(prevLabelComponentX - labelComponentX) < 30 ||
                (isLast && wasFirstItemOnPole))) {
            labelComponentY += outY > cy ? 20 : -20;
            outY += outY > cy ? 20 : -20;
        }
        var localExternalLabelComponent = (_q = item.externalLabelComponent) !== null && _q !== void 0 ? _q : props.externalLabelComponent;
        return {
            labelLineColor: labelLineColor,
            labelLineThickness: labelLineThickness,
            labelComponentHeight: labelComponentHeight,
            inX: inX,
            inY: inY,
            outX: outX,
            outY: outY,
            finalX: finalX,
            labelComponentX: labelComponentX,
            labelComponentY: labelComponentY,
            localExternalLabelComponent: localExternalLabelComponent,
            isRightHalf: isRightHalf
        };
    };
    var coordinates = [];
    data.forEach(function (item, index) {
        var nextItem;
        if (index === pData.length - 1)
            nextItem = pData[0];
        else
            nextItem = pData[index + 1];
        var sx = cx * (1 + Math.sin(2 * pi * pData[index] + initialAngle)) +
            (item.shiftX || 0);
        var sy = cy * (1 - Math.cos(2 * pi * pData[index] + initialAngle)) +
            (item.shiftY || 0);
        var ax = cx * (1 + Math.sin(2 * pi * nextItem + initialAngle)) + (item.shiftX || 0);
        var ay = cy * (1 - Math.cos(2 * pi * nextItem + initialAngle)) + (item.shiftY || 0);
        coordinates[index] = { sx: sx, sy: sy, ax: ax, ay: ay };
    });
    var timer = useRef(setTimeout(function () { })); // timer for tooltip
    var onPressed = function (item, index) {
        if (item.onPress) {
            item.onPress();
        }
        else if (props.onPress) {
            props.onPress(item, index);
        }
        if (props.focusOnPress) {
            if (props.selectedIndex === index || props.isBiggerPie) {
                if (toggleFocusOnPress) {
                    props.setSelectedIndex(-1);
                }
            }
            else {
                props.setSelectedIndex(index);
            }
        }
        if (showTooltip) {
            if (tooltipSelectedIndex === index) {
                setTooltipSelectedIndex(-1);
            }
            else {
                setTooltipSelectedIndex(index);
                if (!persistTooltip) {
                    clearTimeout(timer.current);
                    timer.current = setTimeout(function () {
                        setTooltipSelectedIndex(-1);
                    }, tooltipDuration);
                }
            }
        }
    };
    return {
        isThreeD: isThreeD,
        isBiggerPie: isBiggerPie,
        propData: propData,
        data: data,
        itemHasInnerComponent: itemHasInnerComponent,
        showInnerComponent: showInnerComponent,
        radius: radius,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        shadowWidth: shadowWidth,
        backgroundColor: backgroundColor,
        shadowColor: shadowColor,
        semiCircle: semiCircle,
        pi: pi,
        initialAngle: initialAngle,
        shadow: shadow,
        donut: donut,
        strokeWidth: strokeWidth,
        strokeColor: strokeColor,
        innerRadius: innerRadius,
        showTooltip: showTooltip,
        tooltipWidth: tooltipWidth,
        persistTooltip: persistTooltip,
        tooltipDuration: tooltipDuration,
        tooltipComponent: tooltipComponent,
        tooltipVerticalShift: tooltipVerticalShift,
        tooltipHorizontalShift: tooltipHorizontalShift,
        showValuesAsTooltipText: showValuesAsTooltipText,
        tooltipTextNoOfLines: tooltipTextNoOfLines,
        tooltipBackgroundColor: tooltipBackgroundColor,
        tooltipBorderRadius: tooltipBorderRadius,
        tooltipSelectedIndex: tooltipSelectedIndex,
        setTooltipSelectedIndex: setTooltipSelectedIndex,
        // getTooltipText,
        showText: showText,
        textColor: textColor,
        textSize: textSize,
        tiltAngle: tiltAngle,
        labelsPosition: labelsPosition,
        showTextBackground: showTextBackground,
        textBackgroundColor: textBackgroundColor,
        showValuesAsLabels: showValuesAsLabels,
        showGradient: showGradient,
        gradientCenterColor: gradientCenterColor,
        toggleFocusOnPress: toggleFocusOnPress,
        minShiftX: minShiftX,
        maxShiftX: maxShiftX,
        minShiftY: minShiftY,
        maxShiftY: maxShiftY,
        total: total,
        horizAdjustment: horizAdjustment,
        vertAdjustment: vertAdjustment,
        cx: cx,
        cy: cy,
        pData: pData,
        mData: mData,
        acc: acc,
        paddingHorizontal: paddingHorizontal,
        paddingVertical: paddingVertical,
        extraRadius: extraRadius,
        showExternalLabels: showExternalLabels,
        labelLineConfig: labelLineConfig,
        externalLabelComponent: externalLabelComponent,
        getExternaLabelProperties: getExternaLabelProperties,
        coordinates: coordinates,
        onPressed: onPressed,
        font: font,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        edgesPressable: edgesPressable
    };
};

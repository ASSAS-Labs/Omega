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
import { useEffect } from 'react';
import { pieColors, usePiePro, } from 'gifted-charts-core';
import { Defs, Path, Stop, Svg, Text as SvgText, RadialGradient, } from 'react-native-svg';
import { Animated, View } from 'react-native';
export var PieChartPro = function (props) {
    var _a = usePiePro(props), radius = _a.radius, total = _a.total, donut = _a.donut, strokeWidth = _a.strokeWidth, maxStrokeWidth = _a.maxStrokeWidth, animationDuration = _a.animationDuration, initial = _a.initial, dInitial = _a.dInitial, dFinal = _a.dFinal, getStartCaps = _a.getStartCaps, getEndCaps = _a.getEndCaps, getTextCoordinates = _a.getTextCoordinates, height = _a.height, heightFactor = _a.heightFactor, svgProps = _a.svgProps;
    var data = props.data, curvedStartEdges = props.curvedStartEdges, curvedEndEdges = props.curvedEndEdges, _b = props.edgesRadius, edgesRadius = _b === void 0 ? 0 : _b, showGradient = props.showGradient, ring = props.ring, centerLabelComponent = props.centerLabelComponent, strokeDashArray = props.strokeDashArray, semiCircle = props.semiCircle;
    var isAnimated = props.isAnimated;
    if (!props.semiCircle && data.some(function (dataItem) { return dataItem.value > total / 2; })) {
        // if we have an obtuse arc, we cant animate
        isAnimated = false;
    }
    var AnimatedPath = Animated.createAnimatedComponent(Path);
    var AnimatedText = Animated.createAnimatedComponent(SvgText);
    var animatedValues = data.map(function (i) { return new Animated.Value(0); });
    var animatedOpacityValue = new Animated.Value(0);
    var animatedPaths = data.map(function (item, index) {
        var _a;
        return (_a = animatedValues[index]) === null || _a === void 0 ? void 0 : _a.interpolate({
            inputRange: [0, 1],
            outputRange: [dInitial[index], dFinal[index]],
        });
    });
    var animatedOpacity = animatedOpacityValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });
    useEffect(function () {
        Animated.timing(animatedOpacityValue, {
            toValue: 1,
            duration: 10,
            useNativeDriver: true,
            delay: animationDuration,
        }).start();
        animatedValues.forEach(function (animatedValue) {
            return Animated.timing(animatedValue, {
                toValue: 1,
                duration: animationDuration,
                useNativeDriver: true,
            }).start();
        });
    }, [data]);
    var adjustHeight = height * heightFactor;
    var rnSvgProps = semiCircle ? {} : svgProps;
    return (_jsxs(View, { style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: adjustHeight,
            width: height * 2,
        }, children: [_jsx(View, { style: semiCircle
                    ? { position: 'absolute', bottom: 0 }
                    : { position: 'absolute' }, children: centerLabelComponent ? centerLabelComponent() : null }), _jsx(Svg, __assign({}, rnSvgProps, { viewBox: semiCircle
                    ? ""
                    : "".concat(-maxStrokeWidth * 1.5, " ").concat(-maxStrokeWidth - (semiCircle ? height / 2 : 0), " ").concat(adjustHeight, " ").concat(adjustHeight), transform: semiCircle
                    ? []
                    : [{ scaleY: maxStrokeWidth ? 1 + maxStrokeWidth / (radius * 2) : 1 }], children: total ? (_jsxs(_Fragment, { children: [_jsx(Defs, { children: data.map(function (item, index) {
                                return (_jsxs(RadialGradient, { id: 'grad' + index, cx: "50%", cy: "50%", rx: "50%", ry: "50%", fx: "50%", fy: "50%", gradientUnits: "userSpaceOnUse", children: [_jsx(Stop, { offset: "0%", stopColor: item.gradientCenterColor, stopOpacity: "1" }), _jsx(Stop, { offset: "100%", stopColor: item.color || pieColors[index % 9], stopOpacity: "1" })] }, index + ''));
                            }) }), data.map(function (item, index) {
                            var _a, _b, _c, _d;
                            var borderWidth = (_a = item.strokeWidth) !== null && _a !== void 0 ? _a : strokeWidth;
                            var borderColor = (_c = (_b = item.strokeColor) !== null && _b !== void 0 ? _b : props.strokeColor) !== null && _c !== void 0 ? _c : (borderWidth ? 'black' : 'none');
                            var strokeDashArrayLocal = (_d = item.strokeDashArray) !== null && _d !== void 0 ? _d : strokeDashArray;
                            return (_jsx(AnimatedPath, { id: "renderPath", d: isAnimated ? animatedPaths[index] : dFinal[index], fill: ring
                                    ? 'none'
                                    : showGradient
                                        ? "url(#grad".concat(index, ")")
                                        : data[index].color || pieColors[index % 9], strokeWidth: borderWidth, strokeDasharray: strokeDashArrayLocal, stroke: borderColor }, "path".concat(index)));
                        }), donut
                            ? data.map(function (item, index) {
                                if (curvedStartEdges ||
                                    edgesRadius ||
                                    item.isStartEdgeCurved ||
                                    item.startEdgeRadius)
                                    return (_jsx(AnimatedPath, { d: "".concat(initial, " ").concat(getStartCaps(index, item)), opacity: isAnimated ? animatedOpacity : 1, fill: showGradient
                                            ? "url(#grad".concat(index, ")")
                                            : data[index].color || pieColors[index % 9] }, "cap".concat(index)));
                                return null;
                            })
                            : null, donut
                            ? data.map(function (item, index) {
                                if (curvedEndEdges ||
                                    edgesRadius ||
                                    item.isEndEdgeCurved ||
                                    item.endEdgeRadius)
                                    return (_jsx(Path, { d: "".concat(initial, " ").concat(getEndCaps(index, item)), fill: showGradient
                                            ? "url(#grad".concat(index, ")")
                                            : data[index].color || pieColors[index % 9] }, "cap".concat(index)));
                                return null;
                            })
                            : null, data.map(function (item, index) {
                            var _a, _b;
                            var _c = getTextCoordinates(index, item.labelPosition), x = _c.x, y = _c.y;
                            return (_jsx(AnimatedText, { 
                                // style={{ pointerEvents: 'all' }}
                                fill: item.textColor ||
                                    props.textColor ||
                                    pieColors[(index + 2) % 9], opacity: isAnimated ? animatedOpacity : 1, fontSize: item.textSize || props.textSize, fontFamily: item.font || props.font, fontWeight: item.fontWeight || props.fontWeight, fontStyle: item.fontStyle || props.fontStyle || 'normal', x: x +
                                    (item.shiftTextX || 0) -
                                    ((_b = (_a = item.textSize) !== null && _a !== void 0 ? _a : props.textSize) !== null && _b !== void 0 ? _b : 0) / 1.8, y: y + (item.shiftTextY || 0), onPress: function () {
                                    var _a;
                                    item.onLabelPress
                                        ? item.onLabelPress()
                                        : props.onLabelPress
                                            ? props.onLabelPress(item, index)
                                            : item.onPress
                                                ? item.onPress()
                                                : (_a = props.onPress) === null || _a === void 0 ? void 0 : _a.call(props, item, index);
                                }, children: item.text ||
                                    (props.showValuesAsLabels ? item.value + '' : '') }, "label".concat(index)));
                        })] })) : null }))] }));
};

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
import { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import Svg, { Defs, Rect } from 'react-native-svg';
import LinearGradient from '../Components/common/LinearGradient';
import { useRenderStackBars, BarDefaults, } from 'gifted-charts-core';
import Tooltip from '../Components/BarSpecificComponents/tooltip';
var RenderStackBars = function (props) {
    var _a;
    var barBackgroundPattern = props.barBackgroundPattern, patternId = props.patternId, stackData = props.stackData, item = props.item, index = props.index, containerHeight = props.containerHeight, spacing = props.spacing, rotateLabel = props.rotateLabel, label = props.label, rtl = props.rtl, labelTextStyle = props.labelTextStyle, xAxisTextNumberOfLines = props.xAxisTextNumberOfLines, xAxisLabelsVerticalShift = props.xAxisLabelsVerticalShift, renderTooltip = props.renderTooltip, selectedIndex = props.selectedIndex, setSelectedIndex = props.setSelectedIndex, activeOpacity = props.activeOpacity, _b = props.animationDuration, animationDuration = _b === void 0 ? BarDefaults.animationDuration : _b, barBorderWidth = props.barBorderWidth, barBorderColor = props.barBorderColor, stackBorderRadius = props.stackBorderRadius, stackBorderTopLeftRadius = props.stackBorderTopLeftRadius, stackBorderTopRightRadius = props.stackBorderTopRightRadius, stackBorderBottomLeftRadius = props.stackBorderBottomLeftRadius, stackBorderBottomRightRadius = props.stackBorderBottomRightRadius, showValuesAsTopLabel = props.showValuesAsTopLabel, _c = props.autoShiftLabelsForNegativeStacks, autoShiftLabelsForNegativeStacks = _c === void 0 ? true : _c, _d = props.labelsDistanceFromXaxis, labelsDistanceFromXaxis = _d === void 0 ? 0 : _d, horizontal = props.horizontal, secondaryStepHeight = props.secondaryStepHeight, secondaryStepValue = props.secondaryStepValue, secondaryNegativeStepHeight = props.secondaryNegativeStepHeight, secondaryNegativeStepValue = props.secondaryNegativeStepValue, barMarginBottom = props.barMarginBottom, highlightEnabled = props.highlightEnabled, highlightedBarIndex = props.highlightedBarIndex, lowlightOpacity = props.lowlightOpacity, stackHighlightEnabled = props.stackHighlightEnabled, selectedStackIndex = props.selectedStackIndex, setSelectedStackIndex = props.setSelectedStackIndex;
    var _e = useRenderStackBars(__assign(__assign({}, props), { secondaryStepHeight: secondaryStepHeight, secondaryStepValue: secondaryStepValue, secondaryNegativeStepHeight: secondaryNegativeStepHeight, secondaryNegativeStepValue: secondaryNegativeStepValue })), containsNegativeValue = _e.containsNegativeValue, noAnimation = _e.noAnimation, localBarInnerComponent = _e.localBarInnerComponent, borderRadius = _e.borderRadius, borderTopLeftRadius = _e.borderTopLeftRadius, borderTopRightRadius = _e.borderTopRightRadius, borderBottomLeftRadius = _e.borderBottomLeftRadius, borderBottomRightRadius = _e.borderBottomRightRadius, disablePress = _e.disablePress, totalHeight = _e.totalHeight, height = _e.height, setHeight = _e.setHeight, getBarHeight = _e.getBarHeight, getPosition = _e.getPosition, lowestBarPosition = _e.lowestBarPosition, getStackBorderRadii = _e.getStackBorderRadii, tooltipProps = _e.tooltipProps;
    var renderLabel = function (label, labelTextStyle) {
        return (_jsx(TouchableOpacity, { disabled: disablePress || (stackHighlightEnabled && !highlightEnabled), activeOpacity: activeOpacity, onPress: function () {
                setSelectedIndex([index]);
                if (item.onPress) {
                    item.onPress();
                }
                else if (props.onPress) {
                    props.onPress(item, index);
                }
            }, onLongPress: function () {
                if (item.onLongPress) {
                    item.onLongPress();
                }
                else if (props.onLongPress) {
                    props.onLongPress(item, index);
                }
            }, onPressOut: function () {
                if (item.onPressOut) {
                    item.onPressOut();
                }
                else if (props.onPressOut) {
                    props.onPressOut(item, index);
                }
            }, style: [
                {
                    width: (item.labelWidth ||
                        props.labelWidth ||
                        item.stacks[0].barWidth ||
                        props.barWidth ||
                        30) + spacing,
                    left: spacing / -2,
                    position: 'absolute',
                    bottom: !labelsDistanceFromXaxis && autoShiftLabelsForNegativeStacks
                        ? containsNegativeValue
                            ? -0
                            : -6 - xAxisTextNumberOfLines * 18
                        : -labelsDistanceFromXaxis - 6 - xAxisTextNumberOfLines * 18,
                },
                rotateLabel
                    ? horizontal
                        ? { transform: [{ rotate: '330deg' }] }
                        : { transform: [{ rotate: '60deg' }] }
                    : horizontal
                        ? { transform: [{ rotate: '-90deg' }] }
                        : {},
            ], children: item.labelComponent ? (item.labelComponent()) : (_jsx(Text, { style: [
                    { textAlign: 'center' },
                    rtl && horizontal && { transform: [{ rotate: '180deg' }] },
                    labelTextStyle,
                ], numberOfLines: xAxisTextNumberOfLines, children: label || '' })) }));
    };
    var animatedHeight = useRef(new Animated.Value(0)).current;
    var elevate = function () {
        Animated.timing(animatedHeight, {
            toValue: totalHeight,
            duration: animationDuration,
            useNativeDriver: false,
        }).start();
    };
    useEffect(function () {
        if (!noAnimation) {
            elevate();
        }
    }, []);
    var static2DSimple = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        var remainingBarMarginBottom = barMarginBottom;
        return (_jsxs(_Fragment, { children: [_jsxs(TouchableOpacity, { disabled: disablePress || (stackHighlightEnabled && !highlightEnabled), activeOpacity: activeOpacity, onPress: function () {
                        setSelectedIndex([index]);
                        if (item.onPress) {
                            item.onPress();
                        }
                        else if (props.onPress) {
                            props.onPress(item, index);
                        }
                    }, onLongPress: function () {
                        if (item.onLongPress) {
                            item.onLongPress();
                        }
                        else if (props.onLongPress) {
                            props.onLongPress(item, index);
                        }
                    }, onPressOut: function () {
                        if (item.onPressOut) {
                            item.onPressOut();
                        }
                        else if (props.onPressOut) {
                            props.onPressOut(item, index);
                        }
                    }, style: [
                        {
                            position: 'absolute',
                            width: item.stacks[0].barWidth || props.barWidth || 30,
                            height: '100%',
                            borderTopLeftRadius: (_b = (_a = borderTopLeftRadius !== null && borderTopLeftRadius !== void 0 ? borderTopLeftRadius : borderRadius) !== null && _a !== void 0 ? _a : stackBorderTopLeftRadius) !== null && _b !== void 0 ? _b : stackBorderRadius,
                            borderTopRightRadius: (_d = (_c = borderTopRightRadius !== null && borderTopRightRadius !== void 0 ? borderTopRightRadius : borderRadius) !== null && _c !== void 0 ? _c : stackBorderTopRightRadius) !== null && _d !== void 0 ? _d : stackBorderRadius,
                            borderBottomLeftRadius: (_f = (_e = borderBottomLeftRadius !== null && borderBottomLeftRadius !== void 0 ? borderBottomLeftRadius : borderRadius) !== null && _e !== void 0 ? _e : stackBorderBottomLeftRadius) !== null && _f !== void 0 ? _f : stackBorderRadius,
                            borderBottomRightRadius: (_h = (_g = borderBottomRightRadius !== null && borderBottomRightRadius !== void 0 ? borderBottomRightRadius : borderRadius) !== null && _g !== void 0 ? _g : stackBorderBottomRightRadius) !== null && _h !== void 0 ? _h : stackBorderRadius,
                            overflow: lowestBarPosition ? 'visible' : 'hidden',
                            // bottom: barMarginBottom
                        },
                    ], children: [item.stacks.map(function (stackItem, index) {
                            var _a;
                            var borderRadii = getStackBorderRadii(item, index);
                            // compute marginBottom here
                            var barHeight = getBarHeight(stackItem.value, 0);
                            var marginBottom = Math.max((_a = stackItem.marginBottom) !== null && _a !== void 0 ? _a : 0, remainingBarMarginBottom);
                            var deductedMargin = Math.min(barHeight, marginBottom);
                            remainingBarMarginBottom = Math.max(0, remainingBarMarginBottom - deductedMargin);
                            barHeight -= deductedMargin;
                            return (_jsxs(TouchableOpacity, { onPress: function (e) {
                                    var _a;
                                    if (stackHighlightEnabled) {
                                        setSelectedStackIndex(index);
                                    }
                                    (_a = stackItem.onPress) === null || _a === void 0 ? void 0 : _a.call(stackItem, e);
                                }, activeOpacity: activeOpacity, disabled: disablePress ||
                                    highlightEnabled ||
                                    (!stackHighlightEnabled && !stackItem.onPress), style: __assign({ opacity: stackHighlightEnabled
                                        ? selectedStackIndex === index || selectedStackIndex === -1
                                            ? 1
                                            : lowlightOpacity
                                        : 1, position: 'absolute', bottom: getPosition(index, barHeight) + deductedMargin, width: '100%', height: barHeight, backgroundColor: stackItem.color || item.color || props.color || 'black', borderWidth: barBorderWidth !== null && barBorderWidth !== void 0 ? barBorderWidth : 0, borderColor: barBorderColor }, borderRadii), children: [stackItem.showGradient ||
                                        item.showGradient ||
                                        props.showGradient ? (_jsx(LinearGradient, { style: __assign({ position: 'absolute', width: '100%', height: '100%' }, borderRadii), start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colors: [
                                            stackItem.gradientColor ||
                                                item.gradientColor ||
                                                props.gradientColor ||
                                                'white',
                                            stackItem.color || item.color || props.color || 'black',
                                        ] })) : null, stackItem.innerBarComponent && stackItem.innerBarComponent()] }, index));
                        }), (item.barBackgroundPattern || barBackgroundPattern) && (_jsxs(Svg, { children: [_jsx(Defs, { children: item.barBackgroundPattern
                                        ? item.barBackgroundPattern()
                                        : barBackgroundPattern === null || barBackgroundPattern === void 0 ? void 0 : barBackgroundPattern() }), _jsx(Rect, { stroke: "none", x: "0", y: "0", width: "100%", height: totalHeight, fill: "url(#".concat(item.patternId || patternId, ")") })] }))] }), localBarInnerComponent ? (_jsx(View, { style: { height: '100%', width: '100%' }, children: localBarInnerComponent(item, index) })) : null, (item.topLabelComponent || showValuesAsTopLabel) && (_jsx(View, { style: [
                        {
                            position: 'absolute',
                            top: containsNegativeValue
                                ? 0
                                : (item.barWidth || props.barWidth || 30) * -1,
                            height: item.barWidth || props.barWidth || 30,
                            width: item.barWidth || props.barWidth || 30,
                            justifyContent: 'center',
                            alignItems: 'center',
                        },
                        containsNegativeValue && {
                            transform: [{ translateY: totalHeight * 2 }],
                        },
                        horizontal &&
                            !props.intactTopLabel && { transform: [{ rotate: '270deg' }] },
                        item.topLabelContainerStyle,
                    ], children: showValuesAsTopLabel ? (_jsx(Text, { style: (_j = item.topLabelTextStyle) !== null && _j !== void 0 ? _j : props.topLabelTextStyle, children: stackData[index].stacks.reduce(function (acc, stack) { return acc + stack.value; }, 0) })) : ((_k = item.topLabelComponent) === null || _k === void 0 ? void 0 : _k.call(item)) }))] }));
    };
    var barWrapper = function () {
        return noAnimation ? (static2DSimple()) : (_jsx(Animated.View, { style: {
                position: 'absolute',
                bottom: 0,
                height: animatedHeight,
                width: '100%',
            }, children: static2DSimple() }));
    };
    return (_jsxs(_Fragment, { children: [_jsxs(View, { pointerEvents: props.pointerConfig
                    ? ((_a = props.pointerConfig.pointerEvents) !== null && _a !== void 0 ? _a : 'none')
                    : 'auto', style: [
                    {
                        // overflow: 'visible',
                        opacity: highlightEnabled
                            ? highlightedBarIndex === -1
                                ? 1
                                : highlightedBarIndex === index
                                    ? 1
                                    : lowlightOpacity
                            : 1,
                        marginBottom: 60 + xAxisLabelsVerticalShift,
                        width: item.stacks[0].barWidth || props.barWidth || 30,
                        height: totalHeight,
                        marginRight: spacing,
                        transform: [
                            {
                                translateY: (containerHeight || 200) -
                                    (totalHeight - 10 + xAxisLabelsVerticalShift),
                            },
                        ],
                    },
                ], children: [(props.showXAxisIndices || item.showXAxisIndex) && (_jsx(View, { style: {
                            zIndex: 2,
                            position: 'absolute',
                            height: props.xAxisIndicesHeight,
                            width: props.xAxisIndicesWidth,
                            bottom: props.xAxisIndicesHeight / -2,
                            left: ((item.barWidth || props.barWidth || 30) -
                                props.xAxisIndicesWidth) /
                                2,
                            backgroundColor: props.xAxisIndicesColor,
                        } })), barWrapper(), renderLabel(label || '', labelTextStyle)] }), renderTooltip && selectedIndex === index && (_jsx(Tooltip, __assign({}, tooltipProps)))] }));
};
export default RenderStackBars;

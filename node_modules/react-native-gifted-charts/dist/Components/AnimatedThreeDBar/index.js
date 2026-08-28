import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import Svg, { Defs, Rect } from 'react-native-svg';
import { styles } from './styles';
import LinearGradient from '../common/LinearGradient';
import { useAnimatedThreeDBar, } from 'gifted-charts-core';
var TriangleCorner = function (props) {
    return (_jsx(View, { style: [
            triangleStyles.triangleCorner,
            props.style,
            {
                borderRightWidth: props.width / 2,
                borderTopWidth: props.width / 2,
                borderTopColor: props.color,
            },
        ] }));
};
var triangleStyles = StyleSheet.create({
    triangleCorner: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderRightColor: 'transparent',
        transform: [{ rotate: '90deg' }],
    },
});
var AnimatedThreeDBar = function (props) {
    var _a;
    var height = props.height, side = props.side;
    var isAnimated = props.isAnimated, animationDuration = props.animationDuration, item = props.item, index = props.index, barWidth = props.barWidth, sideWidth = props.sideWidth, barStyle = props.barStyle, barBackgroundPattern = props.barBackgroundPattern, barInnerComponent = props.barInnerComponent, patternId = props.patternId, intactTopLabel = props.intactTopLabel, showValuesAsTopLabel = props.showValuesAsTopLabel, topLabelContainerStyle = props.topLabelContainerStyle, topLabelTextStyle = props.topLabelTextStyle, containerHeight = props.containerHeight;
    var _b = useAnimatedThreeDBar(props), showGradient = _b.showGradient, gradientColor = _b.gradientColor, frontColor = _b.frontColor, sideColor = _b.sideColor, topColor = _b.topColor, opacity = _b.opacity;
    var animatedHeight = useRef(new Animated.Value(0)).current;
    var elevate = function () {
        Animated.timing(animatedHeight, {
            toValue: height,
            duration: animationDuration,
            useNativeDriver: false,
        }).start();
    };
    useEffect(function () {
        if (isAnimated) {
            elevate();
        }
    }, []);
    return (_jsx(View, { style: [styles.container, { height: containerHeight }], children: _jsxs(Animated.View, { style: [
                styles.row,
                {
                    height: isAnimated ? animatedHeight : height,
                    opacity: opacity,
                    position: 'absolute',
                    bottom: 0,
                },
                props.side === 'right' && { transform: [{ rotateY: '180deg' }] },
            ], children: [props.height ? (_jsxs(_Fragment, { children: [_jsx(View, { style: { position: 'absolute', top: sideWidth / -2 }, children: _jsx(TriangleCorner, { color: topColor, width: sideWidth, style: { transform: [{ rotate: '90deg' }], opacity: opacity } }) }), _jsx(View, { style: { position: 'absolute', top: sideWidth / -2 }, children: _jsx(View, { style: {
                                    width: barWidth,
                                    height: barWidth,
                                    // left: width / 2,
                                    backgroundColor: topColor,
                                    opacity: opacity,
                                } }) }), _jsx(View, { style: {
                                position: 'absolute',
                                top: sideWidth / -2,
                                left: barWidth - 1,
                            }, children: _jsx(TriangleCorner, { color: topColor, width: sideWidth, style: { transform: [{ rotate: '-90deg' }], opacity: opacity } }) })] })) : null, _jsxs(View, { style: { marginTop: sideWidth / -2 - 1 }, children: [_jsx(TriangleCorner, { color: height ? sideColor : 'transparent', width: sideWidth, style: { transform: [{ rotate: '-90deg' }], opacity: opacity } }), _jsx(View, { style: {
                                width: sideWidth / 2 + 1,
                                height: height - sideWidth / 2, //animatedSideHeight
                                backgroundColor: sideColor,
                                opacity: opacity,
                            } }), _jsx(TriangleCorner, { color: height ? sideColor : 'transparent', width: sideWidth + 1, style: {
                                transform: [{ rotate: '90deg' }],
                                opacity: opacity,
                                right: -0.5,
                            } })] }), _jsxs(View, { style: [
                        {
                            width: barWidth,
                            height: height, //animatedHeight
                            backgroundColor: frontColor,
                            borderLeftWidth: StyleSheet.hairlineWidth,
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderColor: 'white',
                            opacity: opacity,
                        },
                        item.barStyle || barStyle,
                    ], children: [showGradient && (_jsx(LinearGradient, { style: { position: 'absolute', width: '100%', height: '100%' }, start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, colors: [gradientColor, frontColor] })), barBackgroundPattern && (_jsxs(Svg, { children: [_jsx(Defs, { children: barBackgroundPattern() }), _jsx(Rect, { stroke: "none", x: "1", y: "1", width: barWidth || 30, height: height, fill: "url(#".concat(patternId, ")") })] })), barInnerComponent ? (_jsx(View, { style: { height: '100%', width: '100%' }, children: barInnerComponent(item, index) })) : null] }), (item.topLabelComponent || showValuesAsTopLabel) && (_jsx(View, { style: [
                        {
                            position: 'absolute',
                            top: barWidth * -2,
                            marginLeft: side === 'right' ? 0 : -Math.min(barWidth / 2 - 4, 8),
                            height: (barWidth * 3) / 2,
                            width: (barWidth * 3) / 2,
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            opacity: opacity,
                        },
                        props.horizontal &&
                            !intactTopLabel && { transform: [{ rotate: '270deg' }] },
                        props.side === 'right' && { transform: [{ rotateY: '180deg' }] },
                        topLabelContainerStyle !== null && topLabelContainerStyle !== void 0 ? topLabelContainerStyle : item.topLabelContainerStyle,
                    ], children: showValuesAsTopLabel ? (_jsx(Text, { style: topLabelTextStyle, children: item.value })) : ((_a = item.topLabelComponent) === null || _a === void 0 ? void 0 : _a.call(item)) }))] }) }));
};
export default AnimatedThreeDBar;

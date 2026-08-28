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
import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Animated, StyleSheet, } from 'react-native';
// ----------------------------------------
// Ultra-smooth animation helper
// Throttles to ~60 FPS AND applies low-pass filtering
// ----------------------------------------
function createSmoothUpdater(animatedValue, smoothing, fps) {
    if (smoothing === void 0) { smoothing = 0.15; }
    if (fps === void 0) { fps = 60; }
    var frameDelay = 1000 / fps;
    var lastTime = 0;
    var filtered = 0; // low-pass output
    var timeout = null;
    return function (target) {
        var now = Date.now();
        var diff = now - lastTime;
        var update = function () {
            // low-pass filter (natural smoothing)
            filtered = filtered * (1 - smoothing) + target * smoothing;
            animatedValue.setValue(filtered);
        };
        if (diff >= frameDelay) {
            lastTime = now;
            update();
        }
        else {
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                lastTime = Date.now();
                update();
            }, frameDelay - diff);
        }
    };
}
export function RotatablePie(_a) {
    var initialAngle = _a.initialAngle, size = _a.size, children = _a.children, onAngleChange = _a.onAngleChange;
    var angle = useRef(new Animated.Value(initialAngle)).current;
    var _b = __read(useState({ x: size / 2, y: size / 2 }), 2), center = _b[0], setCenter = _b[1];
    var gestureStartAngle = useRef(0);
    var startAngle = useRef(initialAngle);
    // Create smooth updater ONCE
    var smoothSetAngle = useRef(createSmoothUpdater(angle, 0.15, 60)).current;
    useEffect(function () {
        angle.setValue(initialAngle);
        startAngle.current = initialAngle;
    }, [initialAngle, angle]);
    useEffect(function () {
        var id = angle.addListener(function (_a) {
            var value = _a.value;
            return onAngleChange === null || onAngleChange === void 0 ? void 0 : onAngleChange(value);
        });
        return function () { return angle.removeListener(id); };
    }, [angle, onAngleChange]);
    var onLayout = function (e) {
        var _a = e.nativeEvent.layout, width = _a.width, height = _a.height;
        setCenter({ x: width / 2, y: height / 2 });
    };
    var getTouchAngleDeg = function (x, y) {
        var dx = x - center.x;
        var dy = y - center.y;
        var rad = Math.atan2(dy, dx);
        return (rad * 180) / Math.PI;
    };
    var panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: function () { return true; },
        onMoveShouldSetPanResponder: function () { return true; },
        onPanResponderGrant: function (evt) {
            var _a = evt.nativeEvent, locationX = _a.locationX, locationY = _a.locationY;
            gestureStartAngle.current = getTouchAngleDeg(locationX, locationY);
            angle.stopAnimation(function (current) {
                startAngle.current = current;
            });
        },
        onPanResponderMove: function (evt) {
            var _a = evt.nativeEvent, locationX = _a.locationX, locationY = _a.locationY;
            var currentAngle = getTouchAngleDeg(locationX, locationY);
            var delta = currentAngle - gestureStartAngle.current;
            if (delta > 180)
                delta -= 360;
            if (delta < -180)
                delta += 360;
            var next = startAngle.current + delta;
            // 🔥 SUPER SMOOTH UPDATE
            smoothSetAngle(next);
        },
    })).current;
    var rotateInterpolation = angle.interpolate({
        inputRange: [-360, 360],
        outputRange: ['-360deg', '360deg'],
    });
    return (_jsx(View, __assign({ onLayout: onLayout, style: [styles.container, { width: size, height: size }] }, panResponder.panHandlers, { children: _jsx(Animated.View, { style: {
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: rotateInterpolation }],
            }, children: children }) })));
}
var styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

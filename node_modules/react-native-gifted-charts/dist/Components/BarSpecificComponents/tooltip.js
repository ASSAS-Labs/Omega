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
import { useState } from 'react';
import { View } from 'react-native';
var Tooltip = function (props) {
    var barWidth = props.barWidth, item = props.item, index = props.index, isLast = props.isLast, leftSpacing = props.leftSpacing, leftShiftForLastIndexTooltip = props.leftShiftForLastIndexTooltip, leftShiftForTooltip = props.leftShiftForTooltip, renderTooltip = props.renderTooltip, autoCenterTooltip = props.autoCenterTooltip, horizontal = props.horizontal, bottom = props.bottom;
    var _a = __read(useState(0), 2), leftShiftTooltipForCentering = _a[0], setLeftShiftTooltipForCentering = _a[1];
    return (_jsx(View, { style: {
            position: 'absolute',
            bottom: bottom,
            left: leftSpacing -
                (isLast ? leftShiftForLastIndexTooltip : leftShiftForTooltip) -
                leftShiftTooltipForCentering,
            zIndex: 300000,
            transform: [{ rotate: horizontal ? '-90deg' : '0deg' }],
        }, onLayout: function (event) {
            if (!autoCenterTooltip)
                return;
            var width = event.nativeEvent.layout.width;
            setLeftShiftTooltipForCentering((width - barWidth) / 2);
        }, children: renderTooltip === null || renderTooltip === void 0 ? void 0 : renderTooltip(item, index) }));
};
export default Tooltip;

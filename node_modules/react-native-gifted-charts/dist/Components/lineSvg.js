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
import { jsx as _jsx } from "react/jsx-runtime";
import Svg, { G, Path } from 'react-native-svg';
import { ruleTypes } from 'gifted-charts-core';
function Rule(props) {
    var _a = props.config, thickness = _a.thickness, width = _a.width, color = _a.color, type = _a.type, dashWidth = _a.dashWidth, dashGap = _a.dashGap;
    if (type === ruleTypes.SOLID) {
        return (_jsx(Svg, __assign({ height: thickness, width: width }, props, { children: _jsx(G, { fill: "lightgray", stroke: color, strokeWidth: thickness, children: _jsx(Path, { d: "M0 ".concat(thickness / 2, "h").concat(width) }) }) })));
    }
    return (_jsx(Svg, __assign({ height: thickness, width: width }, props, { children: _jsx(G, { fill: "lightgray", stroke: color, strokeWidth: thickness, children: _jsx(Path, { strokeDasharray: "".concat(dashWidth, ",").concat(dashGap), d: "M0 ".concat(thickness / 2, "h").concat(width) }) }) })));
}
export default Rule;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Svg, { Defs, Rect } from 'react-native-svg';
var BarBackgroundPattern = function (props) {
    var barBackgroundPatternFromItem = props.barBackgroundPatternFromItem, barBackgroundPatternFromProps = props.barBackgroundPatternFromProps, patternIdFromItem = props.patternIdFromItem, patternIdFromProps = props.patternIdFromProps;
    return (_jsxs(Svg, { children: [_jsx(Defs, { children: barBackgroundPatternFromItem
                    ? barBackgroundPatternFromItem()
                    : barBackgroundPatternFromProps() }), _jsx(Rect, { stroke: "none", x: "1", y: "1", width: "100%", height: "100%", fill: "url(#".concat(patternIdFromItem !== null && patternIdFromItem !== void 0 ? patternIdFromItem : patternIdFromProps, ")") })] }));
};
export default BarBackgroundPattern;

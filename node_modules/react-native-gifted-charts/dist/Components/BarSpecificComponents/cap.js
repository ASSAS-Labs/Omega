import { jsx as _jsx } from "react/jsx-runtime";
import { View } from 'react-native';
import { BarDefaults } from 'gifted-charts-core';
var Cap = function (props) {
    var _a, _b, _c, _d;
    var capThicknessFromItem = props.capThicknessFromItem, capThicknessFromProps = props.capThicknessFromProps, capColorFromItem = props.capColorFromItem, capColorFromProps = props.capColorFromProps, capRadiusFromItem = props.capRadiusFromItem, capRadiusFromProps = props.capRadiusFromProps;
    return (_jsx(View, { style: {
            position: 'absolute',
            width: '100%',
            height: (_a = capThicknessFromItem !== null && capThicknessFromItem !== void 0 ? capThicknessFromItem : capThicknessFromProps) !== null && _a !== void 0 ? _a : BarDefaults.capThickness,
            backgroundColor: (_b = capColorFromItem !== null && capColorFromItem !== void 0 ? capColorFromItem : capColorFromProps) !== null && _b !== void 0 ? _b : BarDefaults.capColor,
            borderTopLeftRadius: (_c = capRadiusFromItem !== null && capRadiusFromItem !== void 0 ? capRadiusFromItem : capRadiusFromProps) !== null && _c !== void 0 ? _c : BarDefaults.capRadius,
            borderTopRightRadius: (_d = capRadiusFromItem !== null && capRadiusFromItem !== void 0 ? capRadiusFromItem : capRadiusFromProps) !== null && _d !== void 0 ? _d : BarDefaults.capRadius,
        } }));
};
export default Cap;

var _a, _b;
import { useEffect, useRef } from 'react';
import { Dimensions, Platform } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
var versionString = require('react-native/package.json').version;
var versionAr = (_b = (_a = versionString === null || versionString === void 0 ? void 0 : versionString.split) === null || _a === void 0 ? void 0 : _a.call(versionString, '.')) !== null && _b !== void 0 ? _b : '';
var msb = Number(versionAr[0]);
var mid = Number(versionAr[1]);
var lsb = Number(versionAr[2]);
export var rnVersion = (!isNaN(msb) ? msb : 0) * 1000000 +
    (!isNaN(mid) ? mid : 0) * 10000 +
    (!isNaN(lsb) ? lsb : 0);
export var screenWidth = Dimensions.get('window').width;
export function usePrevious(value) {
    var ref = useRef('');
    useEffect(function () {
        ref.current = value; //assign the value of ref to the argument
    }, [value]); //this code will run when the value of 'value' changes
    return ref.current; //in the end, return the current ref value.
}
export var isWebApp = Platform.OS === 'web';
export var isIos = Platform.OS === 'ios';
export var isAndroid = Platform.OS === 'android';

"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "resolveInstallApkNameAsync", {
    enumerable: true,
    get: function() {
        return resolveInstallApkNameAsync;
    }
});
function _fs() {
    const data = /*#__PURE__*/ _interop_require_default(require("fs"));
    _fs = function() {
        return data;
    };
    return data;
}
function _path() {
    const data = /*#__PURE__*/ _interop_require_default(require("path"));
    _path = function() {
        return data;
    };
    return data;
}
const _adb = require("../../start/platforms/android/adb");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const debug = require('debug')('expo:run:android:resolveInstallApkName');
function resolveApkFromOutputMetadata(apkVariantDirectory, availableCPUs) {
    const metadataPath = _path().default.join(apkVariantDirectory, 'output-metadata.json');
    let metadata;
    try {
        metadata = JSON.parse(_fs().default.readFileSync(metadataPath, 'utf8'));
    } catch (error) {
        debug('Failed to parse output-metadata.json', error);
        return null;
    }
    const { elements } = metadata;
    if (!(elements == null ? void 0 : elements.length)) {
        return null;
    }
    // ABI split: match by device ABI. Exclude DeviceABI.universal — AGP never uses it as an ABI filter.
    const isAbiSplit = elements.some((e)=>{
        var _e_filters;
        return e == null ? void 0 : (_e_filters = e.filters) == null ? void 0 : _e_filters.some((f)=>(f == null ? void 0 : f.filterType) === 'ABI');
    });
    if (isAbiSplit) {
        for (const cpu of availableCPUs){
            if (cpu === _adb.DeviceABI.universal) {
                continue;
            }
            const match = elements.find((e)=>{
                var _e_filters;
                return e == null ? void 0 : (_e_filters = e.filters) == null ? void 0 : _e_filters.some((f)=>f.filterType === 'ABI' && f.value === cpu);
            });
            const outputFile = match == null ? void 0 : match.outputFile;
            if (typeof outputFile === 'string' && _fs().default.existsSync(_path().default.join(apkVariantDirectory, outputFile))) {
                debug('Resolved ABI-split APK from output-metadata.json:', outputFile);
                return outputFile;
            }
        }
        return null;
    }
    if (elements.length === 1) {
        var _elements_;
        const outputFile = (_elements_ = elements[0]) == null ? void 0 : _elements_.outputFile;
        if (typeof outputFile === 'string' && _fs().default.existsSync(_path().default.join(apkVariantDirectory, outputFile))) {
            debug('Resolved APK from output-metadata.json:', outputFile);
            return outputFile;
        }
    }
    // Density/language splits produce multiple elements without ABI filters
    return null;
}
async function resolveInstallApkNameAsync(device, { appName, buildType, flavors, apkVariantDirectory }) {
    const availableCPUs = await (0, _adb.getDeviceABIsAsync)(device);
    availableCPUs.push(_adb.DeviceABI.universal);
    debug('Supported ABIs: ' + availableCPUs.join(', '));
    debug('Searching for APK: ' + apkVariantDirectory);
    // Check for cpu specific builds first
    for (const availableCPU of availableCPUs){
        const apkName = getApkFileName(appName, buildType, flavors, availableCPU);
        const apkPath = _path().default.join(apkVariantDirectory, apkName);
        debug('Checking for APK at:', apkPath);
        if (_fs().default.existsSync(apkPath)) {
            return apkName;
        }
    }
    // Otherwise use the default apk named after the variant: app-debug.apk
    const apkName = getApkFileName(appName, buildType, flavors);
    const apkPath = _path().default.join(apkVariantDirectory, apkName);
    debug('Checking for fallback APK at:', apkPath);
    if (_fs().default.existsSync(apkPath)) {
        return apkName;
    }
    // Last resort: read AGP's output-metadata.json to handle custom outputFileName overrides.
    return resolveApkFromOutputMetadata(apkVariantDirectory, availableCPUs);
}
function getApkFileName(appName, buildType, flavors, cpuArch) {
    let apkName = `${appName}-`;
    if (flavors) {
        apkName += flavors.reduce((rest, flavor)=>`${rest}${flavor}-`, '');
    }
    if (cpuArch) {
        apkName += `${cpuArch}-`;
    }
    apkName += `${buildType}.apk`;
    return apkName;
}

//# sourceMappingURL=resolveInstallApkName.js.map
import { AxesAndRulesDefaults } from '../../utils/constants';
import { getLabelTextUtil } from '../../utils';
export var getHorizSectionVals = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13;
    var width = props.width, noOfSectionsBelowXAxis = props.noOfSectionsBelowXAxis, totalWidth = props.totalWidth, endSpacing = props.endSpacing, yAxisSide = props.yAxisSide, noOfSections = props.noOfSections, yAxisLabelWidth = props.yAxisLabelWidth, yAxisLabelContainerStyle = props.yAxisLabelContainerStyle, yAxisThickness = props.yAxisThickness, yAxisColor = props.yAxisColor, yAxisExtraHeight = props.yAxisExtraHeight, trimYAxisAtTop = props.trimYAxisAtTop, dashWidth = props.dashWidth, dashGap = props.dashGap, rulesType = props.rulesType, rulesThickness = props.rulesThickness, spacing = props.spacing, showYAxisIndices = props.showYAxisIndices, yAxisIndicesHeight = props.yAxisIndicesHeight, yAxisIndicesWidth = props.yAxisIndicesWidth, yAxisIndicesColor = props.yAxisIndicesColor, hideOrigin = props.hideOrigin, hideYAxisText = props.hideYAxisText, showFractionalValues = props.showFractionalValues, yAxisTextNumberOfLines = props.yAxisTextNumberOfLines, yAxisLabelPrefix = props.yAxisLabelPrefix, yAxisLabelSuffix = props.yAxisLabelSuffix, yAxisTextStyle = props.yAxisTextStyle, containerHeight = props.containerHeight, maxValue = props.maxValue, referenceLinesConfig = props.referenceLinesConfig, yAxisLabelTexts = props.yAxisLabelTexts, stepValue = props.stepValue, negativeStepValue = props.negativeStepValue, roundToDigits = props.roundToDigits, yAxisOffset = props.yAxisOffset, formatYLabel = props.formatYLabel, secondaryMaxItem = props.secondaryMaxItem, secondaryMinItem = props.secondaryMinItem, secondaryYAxis = props.secondaryYAxis, secondaryStepValue = props.secondaryStepValue, secondaryNegativeStepValue = props.secondaryNegativeStepValue, secondaryNoOfSectionsBelowXAxis = props.secondaryNoOfSectionsBelowXAxis, showSecondaryFractionalValues = props.showSecondaryFractionalValues, secondaryRoundToDigits = props.secondaryRoundToDigits, secondaryStepHeight = props.secondaryStepHeight, secondaryNegativeStepHeight = props.secondaryNegativeStepHeight;
    var yAxisExtraHeightAtTop = trimYAxisAtTop ? 0 : yAxisExtraHeight;
    /***********************************************************************************************************************************
     *                                                                                                                                  *
     *****************************               secondary Y Axis related props computations               ******************************
     *                                                                                                                                  *
     ***********************************************************************************************************************************/
    var secondaryYAxisConfig = {
        noOfSections: (_a = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.noOfSections) !== null && _a !== void 0 ? _a : noOfSections,
        maxValue: secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.maxValue,
        mostNegativeValue: secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.mostNegativeValue,
        stepValue: secondaryStepValue,
        stepHeight: secondaryStepHeight,
        negativeStepValue: secondaryNegativeStepValue,
        negativeStepHeight: secondaryNegativeStepHeight,
        showFractionalValues: showSecondaryFractionalValues,
        roundToDigits: secondaryRoundToDigits,
        noOfSectionsBelowXAxis: secondaryNoOfSectionsBelowXAxis,
        showYAxisIndices: (_b = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.showYAxisIndices) !== null && _b !== void 0 ? _b : showYAxisIndices,
        yAxisIndicesHeight: (_c = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisIndicesHeight) !== null && _c !== void 0 ? _c : yAxisIndicesHeight,
        yAxisIndicesWidth: (_d = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisIndicesWidth) !== null && _d !== void 0 ? _d : yAxisIndicesWidth,
        yAxisIndicesColor: (_e = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisIndicesColor) !== null && _e !== void 0 ? _e : yAxisIndicesColor,
        yAxisSide: (_f = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisSide) !== null && _f !== void 0 ? _f : yAxisSide,
        yAxisOffset: secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisOffset,
        yAxisThickness: (_g = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisThickness) !== null && _g !== void 0 ? _g : yAxisThickness,
        yAxisColor: (_h = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisColor) !== null && _h !== void 0 ? _h : yAxisColor,
        yAxisLabelContainerStyle: (_j = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisLabelContainerStyle) !== null && _j !== void 0 ? _j : yAxisLabelContainerStyle,
        yAxisLabelTexts: secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisLabelTexts,
        yAxisTextStyle: (_k = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisTextStyle) !== null && _k !== void 0 ? _k : yAxisTextStyle,
        yAxisTextNumberOfLines: (_l = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisTextNumberOfLines) !== null && _l !== void 0 ? _l : yAxisTextNumberOfLines,
        yAxisLabelWidth: (_m = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisLabelWidth) !== null && _m !== void 0 ? _m : yAxisLabelWidth,
        hideYAxisText: (_o = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.hideYAxisText) !== null && _o !== void 0 ? _o : hideYAxisText,
        yAxisLabelPrefix: (_p = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisLabelPrefix) !== null && _p !== void 0 ? _p : yAxisLabelPrefix,
        yAxisLabelSuffix: (_q = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.yAxisLabelSuffix) !== null && _q !== void 0 ? _q : yAxisLabelSuffix,
        hideOrigin: (_r = secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.hideOrigin) !== null && _r !== void 0 ? _r : hideOrigin,
        formatYLabel: secondaryYAxis === null || secondaryYAxis === void 0 ? void 0 : secondaryYAxis.formatYLabel
    };
    secondaryYAxisConfig.maxValue =
        (_s = secondaryYAxisConfig.maxValue) !== null && _s !== void 0 ? _s : (secondaryMaxItem || maxValue);
    secondaryYAxisConfig.mostNegativeValue =
        (_t = secondaryYAxisConfig.mostNegativeValue) !== null && _t !== void 0 ? _t : secondaryMinItem;
    secondaryYAxisConfig.stepHeight =
        secondaryYAxisConfig.stepHeight ||
            containerHeight / ((_u = secondaryYAxisConfig.noOfSections) !== null && _u !== void 0 ? _u : noOfSections);
    var horizSections = [];
    for (var i = 0; i <= noOfSections; i++) {
        var value = maxValue - stepValue * i;
        if (showFractionalValues || roundToDigits) {
            value = parseFloat(value.toFixed(roundToDigits !== null && roundToDigits !== void 0 ? roundToDigits : AxesAndRulesDefaults.roundToDigits));
        }
        horizSections.push({
            value: (yAxisLabelTexts === null || yAxisLabelTexts === void 0 ? void 0 : yAxisLabelTexts.length)
                ? (_v = yAxisLabelTexts[noOfSections + noOfSectionsBelowXAxis - i]) !== null && _v !== void 0 ? _v : value.toString()
                : value.toString()
        });
    }
    var horizSectionsBelow = [];
    if (noOfSectionsBelowXAxis) {
        for (var i = 1; i <= noOfSectionsBelowXAxis; i++) {
            var value = negativeStepValue * -i;
            if (showFractionalValues || roundToDigits) {
                value = parseFloat(value.toFixed(roundToDigits !== null && roundToDigits !== void 0 ? roundToDigits : AxesAndRulesDefaults.roundToDigits));
            }
            horizSectionsBelow.push({
                value: props.yAxisLabelTexts
                    ? (_w = props.yAxisLabelTexts[noOfSectionsBelowXAxis - i]) !== null && _w !== void 0 ? _w : value.toString()
                    : value.toString()
            });
        }
    }
    var secondaryHorizSections = [];
    if (secondaryYAxis) {
        for (var i = 0; i <= ((_x = secondaryYAxisConfig.noOfSections) !== null && _x !== void 0 ? _x : noOfSections); i++) {
            var value = secondaryYAxisConfig.stepValue * i;
            if (secondaryYAxisConfig.showFractionalValues ||
                secondaryYAxisConfig.roundToDigits) {
                value = parseFloat(value.toFixed((_y = secondaryYAxisConfig.roundToDigits) !== null && _y !== void 0 ? _y : AxesAndRulesDefaults.roundToDigits));
            }
            secondaryHorizSections.push({
                value: ((_z = secondaryYAxisConfig.yAxisLabelTexts) === null || _z === void 0 ? void 0 : _z.length)
                    ? (_1 = secondaryYAxisConfig.yAxisLabelTexts[i + ((_0 = secondaryYAxisConfig.noOfSectionsBelowXAxis) !== null && _0 !== void 0 ? _0 : 0)
                    // - noOfSectionsBelowXAxis - 1
                    ]) !== null && _1 !== void 0 ? _1 : value.toString()
                    : value.toString()
            });
        }
    }
    var secondaryHorizSectionsBelow = [];
    if (secondaryYAxisConfig.noOfSectionsBelowXAxis) {
        for (var i = 1; i <= secondaryYAxisConfig.noOfSectionsBelowXAxis; i++) {
            var value = secondaryYAxisConfig.stepValue *
                (i - secondaryYAxisConfig.noOfSectionsBelowXAxis - 1);
            if (secondaryYAxisConfig.showFractionalValues ||
                secondaryYAxisConfig.roundToDigits) {
                value = parseFloat(value.toFixed((_2 = secondaryYAxisConfig.roundToDigits) !== null && _2 !== void 0 ? _2 : AxesAndRulesDefaults.roundToDigits));
            }
            secondaryHorizSectionsBelow.push({
                value: ((_3 = secondaryYAxisConfig.yAxisLabelTexts) === null || _3 === void 0 ? void 0 : _3.length)
                    ? (_4 = secondaryYAxisConfig.yAxisLabelTexts[i - 1]) !== null && _4 !== void 0 ? _4 : value.toString()
                    : value.toString()
            });
        }
    }
    /***********************************************************************************************************************************
     ***********************************************************************************************************************************/
    var showReferenceLine1 = referenceLinesConfig.showReferenceLine1, referenceLine1Position = referenceLinesConfig.referenceLine1Position, referenceLine1Config = referenceLinesConfig.referenceLine1Config, showReferenceLine2 = referenceLinesConfig.showReferenceLine2, referenceLine2Position = referenceLinesConfig.referenceLine2Position, referenceLine2Config = referenceLinesConfig.referenceLine2Config, showReferenceLine3 = referenceLinesConfig.showReferenceLine3, referenceLine3Position = referenceLinesConfig.referenceLine3Position, referenceLine3Config = referenceLinesConfig.referenceLine3Config;
    var defaultReferenceConfig = {
        thickness: rulesThickness,
        width: (width || totalWidth - endSpacing) + endSpacing,
        color: 'black',
        type: rulesType,
        dashWidth: dashWidth,
        dashGap: dashGap,
        labelText: '',
        labelTextStyle: null,
        zIndex: 1
    };
    showReferenceLine1 = referenceLinesConfig.showReferenceLine1 || false;
    referenceLine1Position =
        (_5 = referenceLinesConfig.referenceLine1Position) !== null && _5 !== void 0 ? _5 : (referenceLinesConfig.referenceLine1Position || containerHeight / 2);
    referenceLine1Config = referenceLinesConfig.referenceLine1Config
        ? {
            thickness: referenceLinesConfig.referenceLine1Config.thickness ||
                defaultReferenceConfig.thickness,
            width: (_6 = referenceLinesConfig.referenceLine1Config.width) !== null && _6 !== void 0 ? _6 : defaultReferenceConfig.width,
            color: referenceLinesConfig.referenceLine1Config.color ||
                defaultReferenceConfig.color,
            type: referenceLinesConfig.referenceLine1Config.type ||
                defaultReferenceConfig.type,
            dashWidth: referenceLinesConfig.referenceLine1Config.dashWidth ||
                defaultReferenceConfig.dashWidth,
            dashGap: referenceLinesConfig.referenceLine1Config.dashGap ||
                defaultReferenceConfig.dashGap,
            labelText: referenceLinesConfig.referenceLine1Config.labelText ||
                defaultReferenceConfig.labelText,
            labelTextStyle: referenceLinesConfig.referenceLine1Config.labelTextStyle ||
                defaultReferenceConfig.labelTextStyle,
            zIndex: (_7 = referenceLinesConfig.referenceLine1Config.zIndex) !== null && _7 !== void 0 ? _7 : defaultReferenceConfig.zIndex
        }
        : defaultReferenceConfig;
    showReferenceLine2 = referenceLinesConfig.showReferenceLine2 || false;
    referenceLine2Position =
        (_8 = referenceLinesConfig.referenceLine2Position) !== null && _8 !== void 0 ? _8 : (referenceLinesConfig.referenceLine2Position || (3 * containerHeight) / 2);
    referenceLine2Config = referenceLinesConfig.referenceLine2Config
        ? {
            thickness: referenceLinesConfig.referenceLine2Config.thickness ||
                defaultReferenceConfig.thickness,
            width: (_9 = referenceLinesConfig.referenceLine2Config.width) !== null && _9 !== void 0 ? _9 : defaultReferenceConfig.width,
            color: referenceLinesConfig.referenceLine2Config.color ||
                defaultReferenceConfig.color,
            type: referenceLinesConfig.referenceLine2Config.type ||
                defaultReferenceConfig.type,
            dashWidth: referenceLinesConfig.referenceLine2Config.dashWidth ||
                defaultReferenceConfig.dashWidth,
            dashGap: referenceLinesConfig.referenceLine2Config.dashGap ||
                defaultReferenceConfig.dashGap,
            labelText: referenceLinesConfig.referenceLine2Config.labelText ||
                defaultReferenceConfig.labelText,
            labelTextStyle: referenceLinesConfig.referenceLine2Config.labelTextStyle ||
                defaultReferenceConfig.labelTextStyle,
            zIndex: (_10 = referenceLinesConfig.referenceLine2Config.zIndex) !== null && _10 !== void 0 ? _10 : defaultReferenceConfig.zIndex
        }
        : defaultReferenceConfig;
    showReferenceLine3 = referenceLinesConfig.showReferenceLine3 || false;
    referenceLine3Position =
        (_11 = referenceLinesConfig.referenceLine3Position) !== null && _11 !== void 0 ? _11 : (referenceLinesConfig.referenceLine3Position || containerHeight / 3);
    referenceLine3Config = referenceLinesConfig.referenceLine3Config
        ? {
            thickness: referenceLinesConfig.referenceLine3Config.thickness ||
                defaultReferenceConfig.thickness,
            width: (_12 = referenceLinesConfig.referenceLine3Config.width) !== null && _12 !== void 0 ? _12 : defaultReferenceConfig.width,
            color: referenceLinesConfig.referenceLine3Config.color ||
                defaultReferenceConfig.color,
            type: referenceLinesConfig.referenceLine3Config.type ||
                defaultReferenceConfig.type,
            dashWidth: referenceLinesConfig.referenceLine3Config.dashWidth ||
                defaultReferenceConfig.dashWidth,
            dashGap: referenceLinesConfig.referenceLine3Config.dashGap ||
                defaultReferenceConfig.dashGap,
            labelText: referenceLinesConfig.referenceLine3Config.labelText ||
                defaultReferenceConfig.labelText,
            labelTextStyle: referenceLinesConfig.referenceLine3Config.labelTextStyle ||
                defaultReferenceConfig.labelTextStyle,
            zIndex: (_13 = referenceLinesConfig.referenceLine3Config.zIndex) !== null && _13 !== void 0 ? _13 : defaultReferenceConfig.zIndex
        }
        : defaultReferenceConfig;
    var getLabelTexts = function (val, index) {
        return getLabelTextUtil(val, index, showFractionalValues, yAxisLabelTexts, yAxisOffset, yAxisLabelPrefix, yAxisLabelSuffix, roundToDigits !== null && roundToDigits !== void 0 ? roundToDigits : AxesAndRulesDefaults.roundToDigits, formatYLabel);
    };
    var getLabelTextsForSecondaryYAxis = function (val, index) {
        var showFractionalValues = secondaryYAxisConfig.showFractionalValues, yAxisLabelTexts = secondaryYAxisConfig.yAxisLabelTexts, yAxisOffset = secondaryYAxisConfig.yAxisOffset, yAxisLabelPrefix = secondaryYAxisConfig.yAxisLabelPrefix, yAxisLabelSuffix = secondaryYAxisConfig.yAxisLabelSuffix, roundToDigits = secondaryYAxisConfig.roundToDigits, formatYLabel = secondaryYAxisConfig.formatYLabel;
        return getLabelTextUtil(val, index, showFractionalValues, yAxisLabelTexts, yAxisOffset, yAxisLabelPrefix, yAxisLabelSuffix, roundToDigits !== null && roundToDigits !== void 0 ? roundToDigits : AxesAndRulesDefaults.roundToDigits, formatYLabel);
    };
    return {
        secondaryYAxisConfig: secondaryYAxisConfig,
        horizSections: horizSections,
        yAxisExtraHeightAtTop: yAxisExtraHeightAtTop,
        secondaryHorizSections: secondaryHorizSections,
        showReferenceLine1: showReferenceLine1,
        referenceLine1Config: referenceLine1Config,
        referenceLine1Position: referenceLine1Position,
        showReferenceLine2: showReferenceLine2,
        referenceLine2Config: referenceLine2Config,
        referenceLine2Position: referenceLine2Position,
        showReferenceLine3: showReferenceLine3,
        referenceLine3Config: referenceLine3Config,
        referenceLine3Position: referenceLine3Position,
        horizSectionsBelow: horizSectionsBelow,
        secondaryHorizSectionsBelow: secondaryHorizSectionsBelow,
        getLabelTexts: getLabelTexts,
        getLabelTextsForSecondaryYAxis: getLabelTextsForSecondaryYAxis
    };
};

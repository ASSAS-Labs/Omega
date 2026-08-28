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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Text, View } from 'react-native';
import Rule from '../lineSvg';
import { styles } from '../../LineChart/styles';
import { getHorizSectionVals, yAxisSides, chartTypes, } from 'gifted-charts-core';
export var renderHorizSections = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var chartType = props.chartType, width = props.width, noOfSectionsBelowXAxis = props.noOfSectionsBelowXAxis, totalWidth = props.totalWidth, endSpacing = props.endSpacing, yAxisSide = props.yAxisSide, horizontalRulesStyle = props.horizontalRulesStyle, noOfSections = props.noOfSections, sectionColors = props.sectionColors, stepHeight = props.stepHeight, negativeStepHeight = props.negativeStepHeight, yAxisLabelWidth = props.yAxisLabelWidth, yAxisLabelContainerStyle = props.yAxisLabelContainerStyle, yAxisThickness = props.yAxisThickness, yAxisColor = props.yAxisColor, xAxisThickness = props.xAxisThickness, xAxisColor = props.xAxisColor, xAxisLength = props.xAxisLength, xAxisType = props.xAxisType, dashWidth = props.dashWidth, dashGap = props.dashGap, backgroundColor = props.backgroundColor, hideRules = props.hideRules, rulesLength = props.rulesLength, rulesType = props.rulesType, rulesThickness = props.rulesThickness, rulesColor = props.rulesColor, rulesConfigArray = props.rulesConfigArray, spacing = props.spacing, showYAxisIndices = props.showYAxisIndices, yAxisIndicesHeight = props.yAxisIndicesHeight, yAxisIndicesWidth = props.yAxisIndicesWidth, yAxisIndicesColor = props.yAxisIndicesColor, hideOrigin = props.hideOrigin, hideYAxisText = props.hideYAxisText, yAxisTextNumberOfLines = props.yAxisTextNumberOfLines, yAxisTextStyle = props.yAxisTextStyle, rotateYAxisTexts = props.rotateYAxisTexts, rtl = props.rtl, containerHeight = props.containerHeight, maxValue = props.maxValue, yAxisOffset = props.yAxisOffset, horizontal = props.horizontal, yAxisAtTop = props.yAxisAtTop, secondaryYAxis = props.secondaryYAxis, onlyReferenceLines = props.onlyReferenceLines, onlyLabels = props.onlyLabels, renderReferenceLines = props.renderReferenceLines, secondaryXAxis = props.secondaryXAxis, customBackground = props.customBackground, allowFontScaling = props.allowFontScaling;
    var _k = getHorizSectionVals(props), secondaryYAxisConfig = _k.secondaryYAxisConfig, horizSections = _k.horizSections, yAxisExtraHeightAtTop = _k.yAxisExtraHeightAtTop, secondaryHorizSections = _k.secondaryHorizSections, showReferenceLine1 = _k.showReferenceLine1, referenceLine1Config = _k.referenceLine1Config, referenceLine1Position = _k.referenceLine1Position, showReferenceLine2 = _k.showReferenceLine2, referenceLine2Config = _k.referenceLine2Config, referenceLine2Position = _k.referenceLine2Position, showReferenceLine3 = _k.showReferenceLine3, referenceLine3Config = _k.referenceLine3Config, referenceLine3Position = _k.referenceLine3Position, horizSectionsBelow = _k.horizSectionsBelow, secondaryHorizSectionsBelow = _k.secondaryHorizSectionsBelow, getLabelTexts = _k.getLabelTexts, getLabelTextsForSecondaryYAxis = _k.getLabelTextsForSecondaryYAxis;
    var secondaryYAxisExtraHeightAtBottom = 10;
    var negativeSectionsCountDiffPrimaryVsSecondary = secondaryHorizSectionsBelow.length - horizSectionsBelow.length;
    var isLineChart = chartType === chartTypes.LINE;
    var isLineBiColor = chartType === chartTypes.LINE_BI_COLOR;
    var chartWiseTotalWidth = chartType === chartTypes.BUBBLE ? totalWidth : totalWidth - spacing;
    var renderAxesAndRules = function (index) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var invertedIndex = horizSections.length - index - 1;
        var rulesConfigArrayLocal = rulesConfigArray[invertedIndex - 1];
        return (_jsxs(View, { style: [
                index === noOfSections
                    ? styles.lastLeftPart
                    : !index
                        ? { justifyContent: 'flex-start' }
                        : styles.leftPart,
                {
                    borderColor: yAxisColor,
                    backgroundColor: (_a = sectionColors === null || sectionColors === void 0 ? void 0 : sectionColors[invertedIndex]) !== null && _a !== void 0 ? _a : backgroundColor,
                    width: (props.width || chartWiseTotalWidth) + endSpacing,
                },
                !index ? { height: stepHeight / 2, marginTop: stepHeight / 2 } : null,
                yAxisSide === yAxisSides.RIGHT
                    ? { borderRightWidth: yAxisThickness }
                    : { borderLeftWidth: yAxisThickness },
            ], children: [index === noOfSections ? (_jsx(Rule, { config: {
                        thickness: xAxisThickness,
                        color: xAxisColor,
                        width: xAxisLength ||
                            (props.width || chartWiseTotalWidth) + endSpacing,
                        dashWidth: dashWidth,
                        dashGap: dashGap,
                        type: xAxisType,
                    } })) : hideRules ? null : (_jsx(Rule, { config: {
                        thickness: (_b = rulesConfigArrayLocal === null || rulesConfigArrayLocal === void 0 ? void 0 : rulesConfigArrayLocal.rulesThickness) !== null && _b !== void 0 ? _b : rulesThickness,
                        color: (_c = rulesConfigArrayLocal === null || rulesConfigArrayLocal === void 0 ? void 0 : rulesConfigArrayLocal.rulesColor) !== null && _c !== void 0 ? _c : rulesColor,
                        width: (_e = (_d = rulesConfigArrayLocal === null || rulesConfigArrayLocal === void 0 ? void 0 : rulesConfigArrayLocal.rulesLength) !== null && _d !== void 0 ? _d : rulesLength) !== null && _e !== void 0 ? _e : (props.width || chartWiseTotalWidth) + endSpacing,
                        dashWidth: (_f = rulesConfigArrayLocal === null || rulesConfigArrayLocal === void 0 ? void 0 : rulesConfigArrayLocal.dashWidth) !== null && _f !== void 0 ? _f : dashWidth,
                        dashGap: (_g = rulesConfigArrayLocal === null || rulesConfigArrayLocal === void 0 ? void 0 : rulesConfigArrayLocal.dashGap) !== null && _g !== void 0 ? _g : dashGap,
                        type: (_h = rulesConfigArrayLocal === null || rulesConfigArrayLocal === void 0 ? void 0 : rulesConfigArrayLocal.rulesType) !== null && _h !== void 0 ? _h : rulesType,
                    } })), showYAxisIndices && index !== noOfSections ? (_jsx(View, { style: {
                        position: 'absolute',
                        height: yAxisIndicesHeight,
                        width: yAxisIndicesWidth,
                        left: yAxisIndicesWidth / -2 +
                            (yAxisSide === yAxisSides.RIGHT
                                ? (width !== null && width !== void 0 ? width : totalWidth) +
                                    yAxisLabelWidth / 2 +
                                    yAxisIndicesWidth / 4
                                : 0),
                        backgroundColor: yAxisIndicesColor,
                    } })) : null] }));
    };
    var renderExtraHeightOfYAxisAtTop = function () {
        var _a, _b;
        return (_jsxs(View, { style: [
                styles.horizBar,
                {
                    width: (width !== null && width !== void 0 ? width : totalWidth) + endSpacing,
                    top: stepHeight / 2,
                },
                horizontal &&
                    !yAxisAtTop && {
                    transform: [{ rotateY: '180deg' }],
                },
                horizontalRulesStyle,
            ], children: [_jsx(View, { style: [
                        styles.leftLabel,
                        {
                            height: yAxisExtraHeightAtTop,
                            width: yAxisSide === yAxisSides.RIGHT ? 0 : yAxisLabelWidth,
                        },
                        yAxisLabelContainerStyle,
                    ] }), _jsx(View, { style: [
                        styles.leftPart,
                        {
                            borderLeftColor: yAxisColor,
                            borderRightColor: yAxisColor,
                            borderTopColor: (_a = secondaryXAxis === null || secondaryXAxis === void 0 ? void 0 : secondaryXAxis.color) !== null && _a !== void 0 ? _a : xAxisColor,
                            borderTopWidth: secondaryXAxis
                                ? ((_b = secondaryXAxis.thickness) !== null && _b !== void 0 ? _b : xAxisThickness)
                                : 0,
                            backgroundColor: backgroundColor,
                            width: (props.width || chartWiseTotalWidth) + endSpacing,
                        },
                        yAxisSide === yAxisSides.RIGHT
                            ? { borderRightWidth: yAxisThickness }
                            : { borderLeftWidth: yAxisThickness },
                    ] })] }));
    };
    var renderSecondaryYaxisLabels = function (horizSections, isBelow) {
        return horizSections.map(function (sectionItems, index) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            var label = getLabelTextsForSecondaryYAxis(sectionItems.value, index);
            if (secondaryYAxisConfig.hideOrigin && index === 0) {
                label = '';
            }
            return (_jsxs(View, { style: [
                    styles.horizBar,
                    styles.leftLabel,
                    {
                        position: 'absolute',
                        zIndex: 1,
                        bottom: (index - 0.5) *
                            (isBelow
                                ? ((_b = (_a = secondaryYAxisConfig.negativeStepHeight) !== null && _a !== void 0 ? _a : secondaryYAxisConfig.stepHeight) !== null && _b !== void 0 ? _b : 0)
                                : ((_c = secondaryYAxisConfig.stepHeight) !== null && _c !== void 0 ? _c : 0)) +
                            (isBelow ? secondaryYAxisExtraHeightAtBottom : 0),
                        width: secondaryYAxisConfig.yAxisLabelWidth,
                        height: isBelow
                            ? ((_e = (_d = secondaryYAxisConfig.negativeStepHeight) !== null && _d !== void 0 ? _d : secondaryYAxisConfig.stepHeight) !== null && _e !== void 0 ? _e : 0)
                            : ((_f = secondaryYAxisConfig.stepHeight) !== null && _f !== void 0 ? _f : 0),
                    },
                    (_g = secondaryYAxisConfig.yAxisLabelContainerStyle) !== null && _g !== void 0 ? _g : yAxisLabelContainerStyle,
                ], children: [secondaryYAxisConfig.showYAxisIndices && (index !== 0 || isBelow) ? (_jsx(View, { style: {
                            height: secondaryYAxisConfig.yAxisIndicesHeight,
                            width: secondaryYAxisConfig.yAxisIndicesWidth,
                            position: 'absolute',
                            left: ((_h = secondaryYAxisConfig.yAxisIndicesWidth) !== null && _h !== void 0 ? _h : 0) / -2,
                            backgroundColor: secondaryYAxisConfig.yAxisIndicesColor,
                        } })) : null, _jsx(Text, { numberOfLines: secondaryYAxisConfig.yAxisTextNumberOfLines, ellipsizeMode: 'clip', allowFontScaling: allowFontScaling, style: [
                            {
                                textAlign: 'left',
                                width: (_k = (_j = secondaryYAxisConfig.yAxisLabelContainerStyle) === null || _j === void 0 ? void 0 : _j.width) !== null && _k !== void 0 ? _k : secondaryYAxisConfig.yAxisLabelWidth,
                                marginLeft: 10,
                            },
                            secondaryYAxisConfig.yAxisTextStyle,
                        ], children: label })] }, index));
        });
    };
    var referenceLines = function () {
        return (_jsxs(_Fragment, { children: [showReferenceLine1 ? (_jsxs(View, { style: {
                        position: 'absolute',
                        zIndex: referenceLine1Config.zIndex,
                        bottom: ((referenceLine1Position - (yAxisOffset !== null && yAxisOffset !== void 0 ? yAxisOffset : 0)) *
                            containerHeight) /
                            maxValue,
                        left: yAxisSide === yAxisSides.RIGHT
                            ? 0
                            : yAxisLabelWidth + yAxisThickness,
                    }, children: [_jsx(Rule, { config: referenceLine1Config }), referenceLine1Config.labelText ? (_jsx(Text, { allowFontScaling: allowFontScaling, style: [
                                { position: 'absolute' },
                                referenceLine1Config.labelTextStyle,
                            ], children: referenceLine1Config.labelText })) : null] })) : null, showReferenceLine2 ? (_jsxs(View, { style: {
                        position: 'absolute',
                        zIndex: referenceLine2Config.zIndex,
                        bottom: ((referenceLine2Position - (yAxisOffset !== null && yAxisOffset !== void 0 ? yAxisOffset : 0)) *
                            containerHeight) /
                            maxValue,
                        left: yAxisSide === yAxisSides.RIGHT
                            ? 0
                            : yAxisLabelWidth + yAxisThickness,
                    }, children: [_jsx(Rule, { config: referenceLine2Config }), referenceLine2Config.labelText ? (_jsx(Text, { allowFontScaling: allowFontScaling, style: [
                                { position: 'absolute' },
                                referenceLine2Config.labelTextStyle,
                            ], children: referenceLine2Config.labelText })) : null] })) : null, showReferenceLine3 ? (_jsxs(View, { style: {
                        position: 'absolute',
                        zIndex: referenceLine3Config.zIndex,
                        bottom: ((referenceLine3Position - (yAxisOffset !== null && yAxisOffset !== void 0 ? yAxisOffset : 0)) *
                            containerHeight) /
                            maxValue,
                        left: yAxisSide === yAxisSides.RIGHT
                            ? 0
                            : yAxisLabelWidth + yAxisThickness,
                    }, children: [_jsx(Rule, { config: referenceLine3Config }), referenceLine3Config.labelText ? (_jsx(Text, { allowFontScaling: allowFontScaling, style: [
                                { position: 'absolute' },
                                referenceLine3Config.labelTextStyle,
                            ], children: referenceLine3Config.labelText })) : null] })) : null] }));
    };
    var horizSectionsBelowRenderer = function (index, showBorder) {
        var _a;
        // negative sections height will correspond to negative Y-axis config in case there are extra negative horiz sections corresponding to the secondary Y axis
        var localNegativeStepHeight = !showBorder
            ? ((_a = secondaryYAxisConfig.negativeStepHeight) !== null && _a !== void 0 ? _a : negativeStepHeight)
            : negativeStepHeight;
        return (_jsxs(View, { style: [
                styles.horizBar,
                {
                    width: (width !== null && width !== void 0 ? width : totalWidth) + 15,
                },
                index === 0 && { marginTop: localNegativeStepHeight / 2 },
            ], children: [_jsx(View, { style: [
                        styles.leftLabel,
                        {
                            marginLeft: yAxisThickness,
                        },
                        {
                            height: index === 0
                                ? localNegativeStepHeight * 1.5
                                : localNegativeStepHeight,
                            width: yAxisSide === yAxisSides.RIGHT ? 0 : yAxisLabelWidth,
                        },
                        index === 0 && { marginTop: -localNegativeStepHeight / 2 },
                    ] }), _jsx(View, { style: {
                        position: 'absolute',
                        top: index === 0 ? -localNegativeStepHeight / 2 : 0,
                        left: yAxisSide === yAxisSides.RIGHT
                            ? width
                                ? width + 19
                                : totalWidth -
                                    (isLineChart ? 31 : isLineBiColor ? spacing - 19 : 1)
                            : yAxisLabelWidth,
                        borderRightWidth: yAxisThickness,
                        borderColor: yAxisColor,
                        height: index === 0
                            ? localNegativeStepHeight * 1.5
                            : localNegativeStepHeight,
                    } }), _jsx(View, { style: [styles.leftPart, { backgroundColor: backgroundColor }], children: hideRules ? null : (_jsx(Rule, { config: {
                            thickness: rulesThickness,
                            color: rulesColor,
                            width: rulesLength ||
                                (props.width || chartWiseTotalWidth) + endSpacing,
                            dashWidth: dashWidth,
                            dashGap: dashGap,
                            type: rulesType,
                        } })) })] }, index));
    };
    var leftShiftForRIghtYaxis = (width ? width + (isLineChart ? 50 : 20) : totalWidth) +
        yAxisLabelWidth / 2 +
        endSpacing -
        (isLineChart ? 70 : 40);
    return (_jsx(_Fragment, { children: onlyReferenceLines ? (_jsx(View, { style: {
                flexDirection: 'row',
            }, children: _jsx(View, { style: { width: (width !== null && width !== void 0 ? width : totalWidth) + endSpacing }, children: referenceLines() }) })) : (_jsxs(View, { pointerEvents: "none", style: {
                flexDirection: 'row',
                marginTop: stepHeight / -2,
                position: onlyLabels ? 'absolute' : 'relative',
            }, children: [_jsx(View, { style: { width: (width !== null && width !== void 0 ? width : totalWidth) + endSpacing }, children: onlyLabels ? (!hideYAxisText &&
                        horizSections.map(function (sectionItems, index) {
                            var label = getLabelTexts(sectionItems.value, index);
                            if (hideOrigin && index === horizSections.length - 1) {
                                label = '';
                            }
                            return (_jsx(View, { style: [
                                    styles.horizBar,
                                    styles.leftLabel,
                                    {
                                        position: 'absolute',
                                        zIndex: 1,
                                        top: stepHeight * index + yAxisExtraHeightAtTop,
                                        width: yAxisLabelWidth,
                                        height: index === noOfSections ? stepHeight / 2 : stepHeight,
                                    },
                                    yAxisSide === yAxisSides.RIGHT && {
                                        left: leftShiftForRIghtYaxis,
                                    },
                                    horizontal &&
                                        !yAxisAtTop && {
                                        transform: [
                                            {
                                                translateX: (width !== null && width !== void 0 ? width : totalWidth) - 30 + endSpacing,
                                            },
                                        ],
                                    },
                                    yAxisLabelContainerStyle,
                                ], children: _jsx(Text, { allowFontScaling: allowFontScaling, numberOfLines: yAxisTextNumberOfLines, ellipsizeMode: 'clip', style: [
                                        yAxisTextStyle,
                                        horizontal && {
                                            transform: [
                                                {
                                                    rotate: "".concat(rotateYAxisTexts !== null && rotateYAxisTexts !== void 0 ? rotateYAxisTexts : (rtl ? 90 : -90), "deg"),
                                                },
                                            ],
                                        },
                                        index === noOfSections && {
                                            marginBottom: stepHeight / -2,
                                        },
                                    ], children: label }) }, index));
                        })) : (_jsxs(_Fragment, { children: [customBackground ? (_jsx(View, { style: {
                                    position: 'absolute',
                                    backgroundColor: customBackground.color,
                                    width: (_a = customBackground.width) !== null && _a !== void 0 ? _a : (width !== null && width !== void 0 ? width : totalWidth) +
                                        endSpacing -
                                        9 +
                                        ((_b = customBackground.widthAdjustment) !== null && _b !== void 0 ? _b : 0),
                                    height: (_c = customBackground.height) !== null && _c !== void 0 ? _c : '100%',
                                    left: yAxisLabelWidth +
                                        ((_d = customBackground.horizontalShift) !== null && _d !== void 0 ? _d : 0),
                                    top: (_e = customBackground.verticalShift) !== null && _e !== void 0 ? _e : 0,
                                }, children: customBackground.component
                                    ? customBackground.component()
                                    : null })) : null, yAxisExtraHeightAtTop ? renderExtraHeightOfYAxisAtTop() : null, horizSections.map(function (sectionItems, index) {
                                return (_jsxs(View, { style: [
                                        styles.horizBar,
                                        {
                                            width: (width !== null && width !== void 0 ? width : totalWidth) + endSpacing,
                                        },
                                        horizontal &&
                                            !yAxisAtTop && {
                                            transform: [{ rotateY: '180deg' }],
                                        },
                                        horizontalRulesStyle,
                                    ], children: [_jsx(View, { style: [
                                                styles.leftLabel,
                                                {
                                                    height: index === noOfSections
                                                        ? stepHeight / 2
                                                        : stepHeight,
                                                    width: yAxisSide === yAxisSides.RIGHT
                                                        ? 0
                                                        : yAxisLabelWidth,
                                                },
                                                yAxisLabelContainerStyle,
                                            ] }), renderAxesAndRules(index)] }, index));
                            }), 
                            /***********************************************************************************************/
                            /**************************      Render the y axis labels separately      **********************/
                            /***********************************************************************************************/
                            !hideYAxisText &&
                                horizSections.map(function (sectionItems, index) {
                                    var label = getLabelTexts(sectionItems.value, index);
                                    if (hideOrigin && index === horizSections.length - 1) {
                                        label = '';
                                    }
                                    return (_jsx(View, { style: [
                                            styles.horizBar,
                                            styles.leftLabel,
                                            {
                                                position: 'absolute',
                                                zIndex: 1,
                                                top: stepHeight * index + yAxisExtraHeightAtTop,
                                                width: yAxisLabelWidth,
                                                height: index === noOfSections
                                                    ? stepHeight / 2
                                                    : stepHeight,
                                            },
                                            yAxisSide === yAxisSides.RIGHT && {
                                                left: leftShiftForRIghtYaxis,
                                            },
                                            horizontal &&
                                                !yAxisAtTop && {
                                                transform: [
                                                    {
                                                        translateX: (width !== null && width !== void 0 ? width : totalWidth) - 30 + endSpacing,
                                                    },
                                                ],
                                            },
                                            yAxisLabelContainerStyle,
                                        ], children: _jsx(Text, { allowFontScaling: allowFontScaling, numberOfLines: yAxisTextNumberOfLines, ellipsizeMode: 'clip', style: [
                                                yAxisTextStyle,
                                                horizontal && {
                                                    transform: [
                                                        {
                                                            rotate: "".concat(rotateYAxisTexts !== null && rotateYAxisTexts !== void 0 ? rotateYAxisTexts : (rtl ? 90 : -90), "deg"),
                                                        },
                                                    ],
                                                },
                                                index === noOfSections && {
                                                    marginBottom: stepHeight / -2,
                                                },
                                            ], children: label }) }, index));
                                })
                            /***********************************************************************************************/
                            /***********************************************************************************************/
                            , horizSectionsBelow.map(function (_, index) {
                                return horizSectionsBelowRenderer(index, true);
                            }), 
                            /***********************************************************************************************/
                            /*     If more -ve sections in Secondary Y-axis, then we need to render the Rules for them     */
                            /***********************************************************************************************/
                            secondaryYAxis &&
                                negativeSectionsCountDiffPrimaryVsSecondary > 0
                                ? __spreadArray([], __read(Array(negativeSectionsCountDiffPrimaryVsSecondary).keys()), false).map(function (_, index) {
                                    return horizSectionsBelowRenderer(index, false);
                                })
                                : null, 
                            /***********************************************************************************************/
                            /*************************      Render the y axis labels below origin      *********************/
                            /***********************************************************************************************/
                            !hideYAxisText &&
                                horizSectionsBelow.map(function (_, index) {
                                    var invertedIndex = horizSectionsBelow.length - 1 - index;
                                    var label = getLabelTexts(horizSectionsBelow[invertedIndex].value, index);
                                    return (_jsx(View, { style: [
                                            styles.horizBar,
                                            styles.leftLabel,
                                            {
                                                position: 'absolute',
                                                zIndex: 1,
                                                top: containerHeight +
                                                    negativeStepHeight * (invertedIndex + 1) +
                                                    yAxisExtraHeightAtTop,
                                                width: yAxisLabelWidth,
                                                height: index === noOfSectionsBelowXAxis
                                                    ? negativeStepHeight / 2
                                                    : negativeStepHeight,
                                            },
                                            yAxisSide === yAxisSides.RIGHT && {
                                                left: (width
                                                    ? width - 15
                                                    : totalWidth - (isLineChart ? 65 : 35)) +
                                                    yAxisLabelWidth,
                                            },
                                            yAxisLabelContainerStyle,
                                        ], children: _jsx(Text, { allowFontScaling: allowFontScaling, numberOfLines: yAxisTextNumberOfLines, ellipsizeMode: 'clip', style: [
                                                yAxisTextStyle,
                                                index === noOfSectionsBelowXAxis && {
                                                    marginBottom: negativeStepHeight / -2,
                                                },
                                            ], children: label }) }, index));
                                })
                            /***********************************************************************************************/
                            /***********************************************************************************************/
                            , renderReferenceLines ? referenceLines() : null] })) }), 
                /***********************************************************************************************/
                /*************************      Render the secondary Y Axis                *********************/
                /***********************************************************************************************/
                !onlyLabels && secondaryYAxis ? (_jsx(View, { style: {
                        width: secondaryYAxisConfig.yAxisLabelWidth,
                        left: width ? yAxisLabelWidth : yAxisLabelWidth - spacing,
                        borderColor: secondaryYAxisConfig.yAxisColor,
                        borderLeftWidth: secondaryYAxisConfig.yAxisThickness,
                        height: containerHeight + yAxisExtraHeightAtTop,
                        bottom: stepHeight / -2,
                    }, children: !secondaryYAxisConfig.hideYAxisText
                        ? renderSecondaryYaxisLabels(secondaryHorizSections, false)
                        : null })) : null, 
                /***********************************************************************************************/
                /*************************      Render the secondary Y Axis below origin   *********************/
                /***********************************************************************************************/
                !onlyLabels &&
                    secondaryYAxis &&
                    secondaryYAxisConfig.noOfSectionsBelowXAxis ? (_jsx(View, { style: {
                        width: (_f = secondaryYAxisConfig.yAxisLabelWidth) !== null && _f !== void 0 ? _f : yAxisLabelWidth,
                        left: (width ? yAxisLabelWidth : yAxisLabelWidth - spacing) -
                            ((_g = secondaryYAxisConfig.yAxisLabelWidth) !== null && _g !== void 0 ? _g : yAxisLabelWidth),
                        borderColor: secondaryYAxisConfig.yAxisColor,
                        borderLeftWidth: secondaryYAxisConfig.yAxisThickness,
                        height: ((_j = (_h = secondaryYAxisConfig.negativeStepHeight) !== null && _h !== void 0 ? _h : secondaryYAxisConfig.stepHeight) !== null && _j !== void 0 ? _j : stepHeight) *
                            secondaryHorizSectionsBelow.length +
                            secondaryYAxisExtraHeightAtBottom,
                        bottom: -containerHeight - stepHeight / 2 - yAxisExtraHeightAtTop,
                    }, children: !secondaryYAxisConfig.hideYAxisText
                        ? renderSecondaryYaxisLabels(secondaryHorizSectionsBelow, true)
                        : null })) : null] })) }));
};

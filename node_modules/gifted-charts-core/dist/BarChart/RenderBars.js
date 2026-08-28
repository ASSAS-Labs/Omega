import { AxesAndRulesDefaults } from '../utils/constants';
export var useRenderBars = function (props) {
    var _a, _b, _c;
    var data = props.data, item = props.item, index = props.index, barWidth = props.barWidth, initialSpacing = props.initialSpacing, propSpacing = props.propSpacing, secondaryNegativeStepHeight = props.secondaryNegativeStepHeight, secondaryStepHeight = props.secondaryStepHeight, secondaryNegativeStepValue = props.secondaryNegativeStepValue, secondaryStepValue = props.secondaryStepValue, negativeStepHeight = props.negativeStepHeight, nsv = props.negativeStepValue, stepHeight = props.stepHeight, stepValue = props.stepValue, minHeight = props.minHeight, _d = props.xAxisThickness, xAxisThickness = _d === void 0 ? AxesAndRulesDefaults.xAxisThickness : _d, leftShiftForLastIndexTooltip = props.leftShiftForLastIndexTooltip, leftShiftForTooltip = props.leftShiftForTooltip, renderTooltip = props.renderTooltip, autoCenterTooltip = props.autoCenterTooltip, horizontal = props.horizontal, containerHeight = props.containerHeight, containerHeightIncludingBelowXAxis = props.containerHeightIncludingBelowXAxis;
    var negativeStepValue = Math.abs(nsv);
    var heightFactor = item.isSecondary
        ? item.value < 0
            ? (secondaryNegativeStepHeight !== null && secondaryNegativeStepHeight !== void 0 ? secondaryNegativeStepHeight : secondaryStepHeight) /
                (secondaryNegativeStepValue !== null && secondaryNegativeStepValue !== void 0 ? secondaryNegativeStepValue : secondaryStepValue)
            : secondaryStepHeight / secondaryStepValue
        : item.value < 0
            ? negativeStepHeight / negativeStepValue
            : stepHeight / stepValue;
    var barHeight = Math.max(minHeight, Math.abs(item.value) * heightFactor - xAxisThickness);
    var leftSpacing = initialSpacing;
    for (var i = 0; i < index; i++) {
        leftSpacing +=
            ((_a = data[i].spacing) !== null && _a !== void 0 ? _a : propSpacing) + (data[i].barWidth || barWidth);
    }
    var containsNegativeValue = data.some(function (item) { return item.value < 0; });
    var chartHeightBelowXAxis = containerHeightIncludingBelowXAxis - containerHeight;
    var getBotomForTooltip = function () {
        if (item.value < 0) {
            return chartHeightBelowXAxis - barHeight - 34;
        }
        else {
            return ((containsNegativeValue
                ? barHeight + chartHeightBelowXAxis - 8
                : barHeight) + 2);
        }
    };
    var tooltipProps = {
        barHeight: barHeight,
        barWidth: item.barWidth || barWidth,
        item: item,
        index: index,
        isLast: index === data.length - 1,
        leftSpacing: leftSpacing,
        leftShiftForLastIndexTooltip: leftShiftForLastIndexTooltip,
        leftShiftForTooltip: (_c = (_b = item.leftShiftForTooltip) !== null && _b !== void 0 ? _b : leftShiftForTooltip) !== null && _c !== void 0 ? _c : 0,
        renderTooltip: renderTooltip,
        autoCenterTooltip: autoCenterTooltip,
        horizontal: horizontal,
        bottom: getBotomForTooltip()
    };
    return {
        heightFactor: heightFactor,
        barHeight: barHeight,
        leftSpacing: leftSpacing,
        tooltipProps: tooltipProps
    };
};

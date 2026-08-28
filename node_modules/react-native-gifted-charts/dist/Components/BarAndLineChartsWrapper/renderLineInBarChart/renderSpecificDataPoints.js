import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { getXForLineInBar, getYForLineInBar } from 'gifted-charts-core';
import { Circle, Rect, Text as CanvasText } from 'react-native-svg';
export var renderSpecificDataPoints = function (props) {
    var data = props.data, barWidth = props.barWidth, firstBarWidth = props.firstBarWidth, yAxisLabelWidth = props.yAxisLabelWidth, lineConfig = props.lineConfig, spacing = props.spacing, containerHeight = props.containerHeight, maxValue = props.maxValue, yAxisOffset = props.yAxisOffset;
    return data.map(function (item, index) {
        var currentBarWidth = item.barWidth || barWidth || 30;
        var x = getXForLineInBar(index, firstBarWidth, currentBarWidth, yAxisLabelWidth, lineConfig, spacing);
        var y = getYForLineInBar(item.value, lineConfig.shiftY, containerHeight, maxValue, yAxisOffset);
        if (item.showDataPoint) {
            if (item.dataPointShape === 'rectangular') {
                return (_jsxs(Fragment, { children: [_jsx(Rect, { x: x, y: y - item.dataPointsHeight / 2, width: item.dataPointWidth || lineConfig.dataPointsWidth, height: item.dataPointHeight || 2, fill: item.dataPointColor || 'black' }), item.dataPointText && (_jsx(CanvasText, { fill: item.textColor || 'black', fontSize: item.textFontSize || 10, x: x + (item.textShiftX || lineConfig.textShiftX || 0), y: y -
                                (item.dataPointHeight || lineConfig.dataPointsHeight) / 2 +
                                (item.textShiftY || lineConfig.textShiftY || 0), children: item.dataPointText }))] }, index));
            }
            else {
                return (_jsxs(Fragment, { children: [_jsx(Circle, { cx: x, cy: y, r: item.dataPointRadius || 3, fill: item.dataPointColor || 'black' }), item.dataPointText && (_jsx(CanvasText, { fill: item.textColor || 'black', fontSize: item.textFontSize || 10, x: x + (item.textShiftX || lineConfig.textShiftX || 0), y: y -
                                (item.dataPointHeight || lineConfig.dataPointsHeight) / 2 +
                                (item.textShiftY || lineConfig.textShiftY || 0), children: item.dataPointText }))] }, index));
            }
        }
        return null;
    });
};

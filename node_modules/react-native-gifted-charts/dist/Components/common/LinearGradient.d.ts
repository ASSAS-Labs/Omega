import React from 'react';
type LinearGradientProps = {
    style?: any;
    start?: {
        x: number;
        y: number;
    };
    end?: {
        x: number;
        y: number;
    };
    colors: string[];
    children?: any;
};
declare let LinearGradient: React.FC<LinearGradientProps>;
export default LinearGradient;

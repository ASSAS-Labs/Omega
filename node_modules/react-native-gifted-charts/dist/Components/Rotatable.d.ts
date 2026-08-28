import React from 'react';
type RotatablePieProps = {
    initialAngle: number;
    size: number;
    children: React.ReactNode;
    onAngleChange?: (angle: number) => void;
};
export declare function RotatablePie({ initialAngle, size, children, onAngleChange, }: RotatablePieProps): import("react/jsx-runtime").JSX.Element;
export {};

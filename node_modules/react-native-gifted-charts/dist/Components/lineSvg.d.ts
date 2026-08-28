import { ColorValue } from 'react-native';
type ruleProps = {
    thickness: number;
    width: number;
    color: ColorValue | string | any;
    type: string;
    dashWidth: number;
    dashGap: number;
};
type configType = {
    config: ruleProps;
};
declare function Rule(props: configType): import("react/jsx-runtime").JSX.Element;
export default Rule;

type FontStyle = {
    fontFamily: string;
    fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
};
interface NativeTheme {
    dark: boolean;
    colors: {
        primary: string;
        background: string;
        card: string;
        text: string;
        border: string;
        notification: string;
    };
    fonts: {
        regular: FontStyle;
        medium: FontStyle;
        bold: FontStyle;
        heavy: FontStyle;
    };
}
declare global {
    namespace ReactNavigation {
        interface Theme extends NativeTheme {
        }
    }
}
export type Theme = ReactNavigation.Theme;
export {};
//# sourceMappingURL=types.d.ts.map
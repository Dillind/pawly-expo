import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

const hasGlass = isLiquidGlassAvailable();

export { hasGlass, isAndroid, isIOS, isWeb };

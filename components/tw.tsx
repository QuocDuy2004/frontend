import React from 'react';
import {
  Image as RNImage,
  ImageProps,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  Pressable as RNPressable,
  PressableProps,
  ScrollView as RNScrollView,
  ScrollViewProps,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  View as RNView,
  ViewProps,
} from 'react-native';
import { create } from 'twrnc';

const tw = create(require('../tailwind.config'));

type WithClassName<T> = T & {
  className?: string;
};

type WithContentClassName<T> = T & {
  contentContainerClassName?: string;
};

const classStyle = (className?: string) => (className ? tw.style(className) : undefined);
const webFontStack = 'Signika, "Signika Fallback", sans-serif';

const resolveFontFamily = (className?: string) => {
  if (className?.includes('font-black') || className?.includes('font-extrabold') || className?.includes('font-bold')) {
    return Platform.OS === 'web' ? webFontStack : 'Signika Bold';
  }
  if (className?.includes('font-semibold')) {
    return Platform.OS === 'web' ? webFontStack : 'Signika SemiBold';
  }
  if (className?.includes('font-medium')) {
    return Platform.OS === 'web' ? webFontStack : 'Signika Medium';
  }
  return Platform.OS === 'web' ? webFontStack : 'Signika';
};

export const View = React.forwardRef<RNView, WithClassName<ViewProps>>(({ className, style, ...props }, ref) => (
  <RNView ref={ref} style={[classStyle(className), style]} {...props} />
));
View.displayName = 'TailwindView';

export const Text = React.forwardRef<RNText, WithClassName<TextProps>>(({ className, style, ...props }, ref) => (
  <RNText ref={ref} style={[classStyle(className), { fontFamily: resolveFontFamily(className) }, style]} {...props} />
));
Text.displayName = 'TailwindText';

export const Image = React.forwardRef<RNImage, WithClassName<ImageProps>>(({ className, style, ...props }, ref) => (
  <RNImage ref={ref} style={[classStyle(className), style]} {...props} />
));
Image.displayName = 'TailwindImage';

export const TextInput = React.forwardRef<RNTextInput, WithClassName<TextInputProps>>(({ className, style, ...props }, ref) => (
  <RNTextInput ref={ref} style={[classStyle(className), { fontFamily: resolveFontFamily(className) }, style]} {...props} />
));
TextInput.displayName = 'TailwindTextInput';

export const ScrollView = React.forwardRef<RNScrollView, WithClassName<WithContentClassName<ScrollViewProps>>>(
  ({ className, contentContainerClassName, style, contentContainerStyle, ...props }, ref) => (
    <RNScrollView
      ref={ref}
      style={[classStyle(className), style]}
      contentContainerStyle={[classStyle(contentContainerClassName), contentContainerStyle]}
      {...props}
    />
  ),
);
ScrollView.displayName = 'TailwindScrollView';

export const KeyboardAvoidingView = React.forwardRef<React.ElementRef<typeof RNKeyboardAvoidingView>, WithClassName<KeyboardAvoidingViewProps>>(({ className, style, ...props }, ref) => (
  <RNKeyboardAvoidingView ref={ref} style={[classStyle(className), style]} {...props} />
));
KeyboardAvoidingView.displayName = 'TailwindKeyboardAvoidingView';

export const Pressable = React.forwardRef<RNView, WithClassName<PressableProps>>(({ className, style, ...props }, ref) => (
  <RNPressable
    ref={ref}
    style={(state) => [classStyle(className), typeof style === 'function' ? style(state) : style]}
    {...props}
  />
));
Pressable.displayName = 'TailwindPressable';

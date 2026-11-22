import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ColorValue,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clamp, formatNumber, parseNumber } from '../lib/calc';
import { useHaptics } from '../lib/platform';
import { radius, spacing, useTheme } from '../lib/theme';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// the focus state is already shown by the coloured border; hide the browser outline on web
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

export function Icon({ name, size = 22, color, style }: { name: string; size?: number; color?: string | ColorValue; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  const valid = name in MaterialCommunityIcons.glyphMap ? (name as IconName) : 'circle-outline';
  return <MaterialCommunityIcons name={valid} size={size} color={(color ?? colors.text) as string} style={style} />;
}

type TxtVariant = 'title' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label' | 'number';

export function Txt({
  children,
  variant = 'body',
  color,
  style,
  center,
  bold,
  numberOfLines,
  selectable,
  testID,
}: {
  testID?: string;
  children: React.ReactNode;
  variant?: TxtVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  bold?: boolean;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  const v = textVariants[variant];
  const defaultColor = variant === 'caption' || variant === 'small' || variant === 'label' ? colors.textSecondary : colors.text;
  return (
    <Text
      testID={testID}
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[v, { color: color ?? defaultColor }, center && { textAlign: 'center' }, bold && { fontWeight: '700' }, style]}
    >
      {children}
    </Text>
  );
}

const textVariants = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3 },
  h2: { fontSize: 19, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  number: { fontSize: 28, lineHeight: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  contentStyle,
  refreshControl,
  keyboardShouldPersistTaps = 'handled',
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<any>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
}) {
  const { colors } = useTheme();
  const pad = padded ? { padding: spacing.lg, paddingBottom: 48 } : undefined;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { gap: spacing.md }, contentStyle]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: padded ? spacing.lg : 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  };
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[base, style]}>
      {children}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = spacing.sm,
  align = 'center',
  justify,
  wrap,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align, gap, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>
      {children}
    </View>
  );
}

export function Spacer({ size = spacing.md }: { size?: number }) {
  return <View style={{ height: size }} />;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
  testID,
  full = true,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  full?: boolean;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.card, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    soft: { bg: colors.primarySoft, fg: colors.primary },
  };
  const p = palette[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: p.bg,
          borderRadius: radius.md,
          paddingVertical: small ? 8 : 14,
          paddingHorizontal: small ? 12 : 18,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
          minHeight: small ? 36 : 48,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 18 : 20} color={p.fg} /> : null}
          <Text style={{ color: p.fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color,
  size = 22,
  bg,
  label,
  testID,
  disabled,
}: {
  icon: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  bg?: string;
  label: string;
  testID?: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => ({
        width: size + 18,
        height: size + 18,
        borderRadius: (size + 18) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg ?? 'transparent',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

export function Input({
  label,
  hint,
  error,
  style,
  suffix,
  ...props
}: TextInputProps & { label?: string; hint?: string; error?: string; suffix?: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      {label ? <Txt variant="small" bold color={colors.textSecondary}>{label}</Txt> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.cardAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : focused ? colors.primary : 'transparent',
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12, minHeight: 46 }, webNoOutline]}
        />
        {suffix ? <Txt color={colors.muted}>{suffix}</Txt> : null}
      </View>
      {error ? (
        <Txt variant="caption" color={colors.danger}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption">{hint}</Txt>
      ) : null}
    </View>
  );
}

/** Numeric input that accepts comma decimals and reports parsed numbers */
export function NumberInput({
  value,
  onChange,
  label,
  suffix,
  decimals = 1,
  min,
  max,
  hint,
  testID,
  placeholder,
  style,
  autoFocus,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label?: string;
  suffix?: string;
  decimals?: number;
  min?: number;
  max?: number;
  hint?: string;
  testID?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : formatNumber(value, decimals).replace(/\./g, ''));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    // external value change (e.g. quick-select chip) -> sync the text field
    setPrevValue(value);
    const current = parseNumber(text);
    if (!(value == null && text !== '' && current == null) && current !== value) {
      setText(value == null ? '' : formatNumber(value, decimals).replace(/\./g, ''));
    }
  }
  const parsed = parseNumber(text);
  let error: string | undefined;
  if (text !== '' && parsed == null) error = 'Bitte eine gültige Zahl eingeben';
  else if (parsed != null && min != null && parsed < min) error = `Mindestens ${formatNumber(min, decimals)}`;
  else if (parsed != null && max != null && parsed > max) error = `Höchstens ${formatNumber(max, decimals)}`;
  return (
    <Input
      testID={testID}
      label={label}
      suffix={suffix}
      hint={hint}
      error={error}
      style={style}
      autoFocus={autoFocus}
      placeholder={placeholder}
      keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      value={text}
      onChangeText={(t) => {
        const cleaned = t.replace(/[^0-9.,-]/g, '');
        setText(cleaned);
        onChange(parseNumber(cleaned));
      }}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: selected ? colors.primary : colors.cardAlt,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? colors.onPrimary : colors.text} /> : null}
      <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix?: string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 3 }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            onPress={() => {
              haptics.tap();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.sm + 2,
              alignItems: 'center',
              backgroundColor: sel ? colors.card : 'transparent',
              shadowColor: '#000',
              shadowOpacity: sel ? 0.08 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: sel ? 1 : 0,
            }}
          >
            <Text style={{ color: sel ? colors.text : colors.textSecondary, fontWeight: sel ? '700' : '500', fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  right,
  onPress,
  chevron,
  testID,
  destructive,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  testID?: string;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: iconBg ?? colors.cardAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={20} color={iconColor ?? (destructive ? colors.danger : colors.text)} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt bold color={destructive ? colors.danger : undefined} numberOfLines={2}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={22} color={colors.muted} /> : null}
    </>
  );
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 52 };
  if (onPress) {
    return (
      <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={style}>
      {content}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function SwitchRow({
  title,
  subtitle,
  value,
  onChange,
  icon,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      icon={icon}
      onPress={() => {
        haptics.tap();
        onChange(!value);
      }}
      testID={testID}
      right={
        <Switch
          value={value}
          onValueChange={(v) => {
            haptics.tap();
            onChange(v);
          }}
          trackColor={{ false: colors.track, true: colors.primary }}
          thumbColor="#ffffff"
          accessibilityLabel={title}
        />
      }
    />
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  format,
  testID,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  testID?: string;
  label?: string;
}) {
  const { colors } = useTheme();
  const dec = () => onChange(clamp(Math.round((value - step) * 100) / 100, min, max));
  const inc = () => onChange(clamp(Math.round((value + step) * 100) / 100, min, max));
  return (
    <Row gap={6} style={{ backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 4 }}>
      <IconButton icon="minus" size={18} onPress={dec} label={`${label ?? 'Wert'} verringern`} testID={testID ? `${testID}-minus` : undefined} disabled={value <= min} />
      <Text
        testID={testID ? `${testID}-value` : undefined}
        style={{ minWidth: 56, textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] }}
      >
        {format ? format(value) : formatNumber(value, 2)}
      </Text>
      <IconButton icon="plus" size={18} onPress={inc} label={`${label ?? 'Wert'} erhöhen`} testID={testID ? `${testID}-plus` : undefined} disabled={value >= max} />
    </Row>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  height = 8,
  overColor,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  overColor?: string;
}) {
  const { colors } = useTheme();
  const pct = max > 0 ? clamp(value / max, 0, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View
      style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: over && overColor ? overColor : (color ?? colors.primary),
        }}
      />
    </View>
  );
}

export function SectionHeader({ title, action, onAction, testID }: { title: string; action?: string; onAction?: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Row justify="space-between" style={{ marginTop: spacing.sm }}>
      <Txt variant="h2">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} testID={testID} accessibilityRole="button">
          <Txt bold color={colors.primary}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function EmptyState({ icon, title, text, children }: { icon: string; title: string; text?: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.cardAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={30} color={colors.muted} />
      </View>
      <Txt variant="h3" center>
        {title}
      </Txt>
      {text ? (
        <Txt variant="small" center style={{ maxWidth: 300 }}>
          {text}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

export function Badge({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: bg ?? colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: color ?? colors.primary, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function NutriScore({ grade }: { grade?: string }) {
  if (!grade) return null;
  const map: Record<string, string> = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };
  const fg = grade === 'c' ? '#1a1a1a' : '#ffffff';
  return (
    <View
      accessibilityLabel={`Nutri-Score ${grade.toUpperCase()}`}
      style={{ backgroundColor: map[grade] ?? '#888', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}
    >
      <Text style={{ color: fg, fontWeight: '800', fontSize: 12 }}>Nutri-Score {grade.toUpperCase()}</Text>
    </View>
  );
}

export function StatTile({ label, value, unit, icon, color, testID }: { label: string; value: string; unit?: string; icon?: string; color?: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, padding: spacing.md, gap: 4 }} testID={testID}>
      <Row gap={6}>
        {icon ? <Icon name={icon} size={16} color={color ?? colors.textSecondary} /> : null}
        <Txt variant="caption" numberOfLines={1}>
          {label}
        </Txt>
      </Row>
      <Row gap={4} align="flex-end">
        <Txt variant="h2" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="caption" style={{ marginBottom: 3 }}>
            {unit}
          </Txt>
        ) : null}
      </Row>
    </Card>
  );
}

export function TimeField({
  hour,
  minute,
  onChange,
  testID,
  label,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
  testID?: string;
  label?: string;
}) {
  const { colors } = useTheme();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Row gap={6} style={{ backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 4 }}>
      {label ? (
        <Txt variant="small" style={{ paddingLeft: 8 }}>
          {label}
        </Txt>
      ) : null}
      <IconButton icon="chevron-down" size={18} label="Stunde zurück" testID={testID ? `${testID}-h-minus` : undefined} onPress={() => onChange((hour + 23) % 24, minute)} />
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, fontVariant: ['tabular-nums'] }} testID={testID ? `${testID}-value` : undefined}>
        {pad(hour)}:{pad(minute)}
      </Text>
      <IconButton icon="chevron-up" size={18} label="Stunde vor" testID={testID ? `${testID}-h-plus` : undefined} onPress={() => onChange((hour + 1) % 24, minute)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Minuten ändern"
        testID={testID ? `${testID}-m` : undefined}
        onPress={() => {
          const next = (Math.floor(minute / 15) * 15 + 15) % 60;
          onChange(hour, next);
        }}
        style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.card }}
      >
        <Txt variant="caption" bold>
          +15 min
        </Txt>
      </Pressable>
    </Row>
  );
}

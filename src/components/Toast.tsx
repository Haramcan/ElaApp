import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../lib/theme';
import { Icon } from './ui';

interface ToastOptions {
  message: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

const ToastContext = createContext<(o: ToastOptions | string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (o: ToastOptions | string) => {
      const opts = typeof o === 'string' ? { message: o } : o;
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...opts, key: Date.now() });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: false }).start();
      timer.current = setTimeout(hide, opts.duration ?? (opts.actionLabel ? 5000 : 2600));
    },
    [hide, opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const bg = isDark ? '#f0efec' : '#1f1f1e';
  const fg = isDark ? '#0b0b0b' : '#ffffff';

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, opacity, alignItems: 'center' }}
        >
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID="toast"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: bg,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {toast.icon ? <Icon name={toast.icon} size={20} color={fg} /> : null}
            <Text style={{ color: fg, flex: 1, fontSize: 14, fontWeight: '600' }}>{toast.message}</Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
              >
                <Text style={{ color: isDark ? colors.primary : '#4ade80', fontWeight: '800', fontSize: 14 }}>{toast.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

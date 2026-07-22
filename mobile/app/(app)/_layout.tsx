import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { Redirect, useRouter } from 'expo-router';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { environment } from '../../src/config/env';
import { NavItem } from '../../src/config/menu';
import { radius, spacing } from '../../src/config/theme';
import { Icon } from '../../src/components/ui/Icon';
import { T } from '../../src/components/ui/layout';

const CHEVRON_DOWN = 'M6 9l6 6 6-6';
const CHEVRON_RIGHT = 'M9 6l6 6-6 6';

function CustomDrawer(props: DrawerContentComponentProps) {
  const { palette, toggle, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { visibleNavItems } = usePermissions();
  const router = useRouter();
  const [openGroup, setOpenGroup] = useState<string | null>('Report');

  const go = (path: string) => {
    props.navigation.closeDrawer();
    router.push(path as never);
  };

  const NavRow = ({ label, icon, onPress, child }: { label: string; icon: string; onPress: () => void; child?: boolean }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 12,
        paddingLeft: child ? spacing.xl + spacing.md : spacing.lg,
        paddingRight: spacing.lg,
        backgroundColor: pressed ? palette.primarySoft : 'transparent',
      })}
    >
      <Icon path={icon} size={20} color={palette.textMuted} />
      <T size={14} weight="600" style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <View
        style={{
          paddingTop: 56,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          backgroundColor: palette.primary,
        }}
      >
        <T size={20} weight="800" color={palette.onPrimary}>
          {environment.companyName}
        </T>
        <T size={13} color={palette.onPrimary} style={{ opacity: 0.85, marginTop: 2 }}>
          {user?.userName ?? user?.username ?? 'Signed in'}
        </T>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {visibleNavItems.map((item: NavItem) => {
          if (item.children) {
            const expanded = openGroup === item.label;
            return (
              <View key={item.label}>
                <Pressable
                  onPress={() => setOpenGroup(expanded ? null : item.label)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: 12,
                    paddingHorizontal: spacing.lg,
                  }}
                >
                  <Icon path={item.icon} size={20} color={palette.textMuted} />
                  <T size={14} weight="700" style={{ flex: 1 }}>
                    {item.label}
                  </T>
                  <Icon path={expanded ? CHEVRON_DOWN : CHEVRON_RIGHT} size={18} color={palette.textMuted} />
                </Pressable>
                {expanded
                  ? item.children.map((c) => (
                      <NavRow key={c.path} label={c.menu} icon={c.icon} onPress={() => go(c.path)} child />
                    ))
                  : null}
              </View>
            );
          }
          return <NavRow key={item.label} label={item.label} icon={item.icon} onPress={() => go(item.path!)} />;
        })}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: palette.border, padding: spacing.md, gap: spacing.sm }}>
        <Pressable
          onPress={toggle}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md }}
        >
          <Icon
            path={
              isDark
                ? 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z'
                : 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.42-1.42M6.34 6.34 4.93 4.93m12.02 0-1.41 1.41M6.34 17.66l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'
            }
            size={20}
            color={palette.textMuted}
          />
          <T size={14} weight="600">
            {isDark ? 'Dark mode' : 'Light mode'}
          </T>
        </Pressable>
        <Pressable
          onPress={() => {
            void logout();
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md }}
        >
          <Icon path="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" size={20} color={palette.danger} />
          <T size={14} weight="700" color={palette.danger}>
            Sign out
          </T>
        </Pressable>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { user, initializing } = useAuth();
  const { palette } = useTheme();

  if (!initializing && !user) return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.text, fontWeight: '800' },
        headerTintColor: palette.primary,
        drawerType: 'front',
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="chart-of-account" options={{ title: 'Chart of Account' }} />
      <Drawer.Screen name="ledger" options={{ title: 'Ledger' }} />
      <Drawer.Screen name="voucher" options={{ title: 'Voucher' }} />
      <Drawer.Screen name="cost-center" options={{ title: 'Cost Centers' }} />
      <Drawer.Screen name="asset" options={{ title: 'Fixed Assets' }} />
      <Drawer.Screen name="day-book" options={{ title: 'Day Book' }} />
      <Drawer.Screen name="cash-book" options={{ title: 'Cash Book' }} />
      <Drawer.Screen name="bank-book" options={{ title: 'Bank Book' }} />
      <Drawer.Screen name="receipt-payment-statement" options={{ title: 'Receipt & Payment' }} />
      <Drawer.Screen name="general-ledger" options={{ title: 'General Ledger' }} />
      <Drawer.Screen name="trial-balance" options={{ title: 'Trial Balance' }} />
      <Drawer.Screen name="balance-sheet" options={{ title: 'Balance Sheet' }} />
      <Drawer.Screen name="profit-loss" options={{ title: 'Profit & Loss' }} />
      <Drawer.Screen name="user-list" options={{ title: 'User List' }} />
      <Drawer.Screen name="menu-list" options={{ title: 'Menu List' }} />
    </Drawer>
  );
}

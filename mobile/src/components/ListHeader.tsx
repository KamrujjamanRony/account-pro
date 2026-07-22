import React from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../config/theme';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

/** A search input plus optional "Add" action, used atop master-data lists. */
export function ListHeader({
  search,
  onSearch,
  onSubmit,
  onAdd,
  addLabel = 'Add',
  placeholder = 'Search…',
  canAdd = true,
}: {
  search: string;
  onSearch: (v: string) => void;
  onSubmit?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  placeholder?: string;
  canAdd?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'center' }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
        }}
      >
        <Icon path="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" size={18} color={palette.textMuted} />
        <TextInput
          value={search}
          onChangeText={onSearch}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          style={{ flex: 1, color: palette.text, paddingVertical: 10, fontSize: 15 }}
        />
      </View>
      {onAdd && canAdd ? <Button label={addLabel} icon="M12 5v14M5 12h14" size="sm" onPress={onAdd} /> : null}
    </View>
  );
}

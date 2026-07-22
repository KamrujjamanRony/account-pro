import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../config/theme';
import { Button } from './Button';
import { T } from './layout';
import { Icon } from './Icon';

/**
 * A bottom-sheet modal that hosts an add/edit form, with a sticky header and a
 * Cancel / Save footer.
 */
export function FormSheet({
  visible,
  title,
  onClose,
  onSave,
  saving,
  saveLabel = 'Save',
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: palette.bg,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              maxHeight: '92%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
              }}
            >
              <T size={17} weight="800" style={{ flex: 1 }}>
                {title}
              </T>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Icon path="M6 6l12 12M18 6L6 18" size={22} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={{ paddingHorizontal: spacing.lg }}
              contentContainerStyle={{ paddingVertical: spacing.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {onSave ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: 1,
                  borderTopColor: palette.border,
                }}
              >
                <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} full />
                <Button label={saveLabel} onPress={onSave} loading={saving} style={{ flex: 1 }} full />
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

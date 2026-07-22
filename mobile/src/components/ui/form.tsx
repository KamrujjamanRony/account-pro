import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../config/theme';
import { formatDate, toIsoDate } from '../../lib/format';
import { T } from './layout';
import { Icon } from './Icon';

const CHEVRON = 'M6 9l6 6 6-6';

function Field({ label, children, hint }: { label?: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <T size={13} weight="600" style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      {children}
      {hint ? (
        <T muted size={11} style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const inputBase = {
  borderWidth: 1,
  borderRadius: radius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: Platform.OS === 'ios' ? 12 : 9,
  fontSize: 15,
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  hint,
  autoCapitalize,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'decimal-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  editable?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Field label={label} hint={hint}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[
          inputBase,
          {
            color: palette.text,
            borderColor: palette.border,
            backgroundColor: editable ? palette.surface : palette.surfaceAlt,
            minHeight: multiline ? 80 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
    </Field>
  );
}

export function NumberField(props: Omit<Parameters<typeof TextField>[0], 'keyboardType' | 'value' | 'onChangeText'> & {
  value: number;
  onChangeValue: (v: number) => void;
}) {
  const { value, onChangeValue, ...rest } = props;
  const [text, setText] = useState(String(value ?? 0));
  // Keep local text in sync when the external value changes (e.g. reset).
  React.useEffect(() => {
    setText(value === 0 ? '' : String(value));
  }, [value]);
  return (
    <TextField
      {...rest}
      value={text}
      keyboardType="decimal-pad"
      onChangeText={(t) => {
        setText(t);
        const n = Number(t);
        onChangeValue(Number.isFinite(n) ? n : 0);
      }}
    />
  );
}

export function SwitchField({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
      <T size={14} weight="600">
        {label}
      </T>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: palette.primary }} />
    </View>
  );
}

export interface Option<V = string | number> {
  label: string;
  value: V;
}

/** A modal picker. Set `searchable` for a filterable long list (ledgers etc.). */
export function Select<V extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchable,
  hint,
  disabled,
}: {
  label?: string;
  value: V | null | undefined;
  options: Option<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
  searchable?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <Field label={label} hint={hint}>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[
          inputBase,
          {
            borderColor: palette.border,
            backgroundColor: disabled ? palette.surfaceAlt : palette.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
      >
        <T size={15} color={selected ? palette.text : palette.textMuted}>
          {selected ? selected.label : placeholder}
        </T>
        <Icon path={CHEVRON} size={18} color={palette.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: palette.overlay }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            maxHeight: '70%',
            paddingTop: spacing.md,
          }}
        >
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <T size={16} weight="800">
              {label ?? 'Select'}
            </T>
          </View>
          {searchable ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={palette.textMuted}
                autoFocus
                style={[inputBase, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
              />
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setQuery('');
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: palette.border,
                    backgroundColor: active ? palette.primarySoft : 'transparent',
                  }}
                >
                  <T size={15} color={active ? palette.primary : palette.text} weight={active ? '700' : '400'}>
                    {item.label}
                  </T>
                  {active ? <Icon path="M5 13l4 4L19 7" size={18} color={palette.primary} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: spacing.xl }}>
                <T muted>No options.</T>
              </View>
            }
          />
        </View>
      </Modal>
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label?: string;
  /** ISO yyyy-MM-dd. */
  value: string;
  onChange: (iso: string) => void;
  hint?: string;
}) {
  const { palette } = useTheme();
  const [show, setShow] = useState(false);
  const current = value ? new Date(value) : new Date();

  return (
    <Field label={label} hint={hint}>
      <Pressable
        onPress={() => setShow(true)}
        style={[
          inputBase,
          {
            borderColor: palette.border,
            backgroundColor: palette.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
      >
        <T size={15}>{value ? formatDate(value) : 'Select date'}</T>
        <Icon path="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" size={18} color={palette.textMuted} />
      </Pressable>
      {show ? (
        <DateTimePicker
          value={Number.isNaN(current.getTime()) ? new Date() : current}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            setShow(Platform.OS === 'ios');
            if (event.type === 'set' && date) onChange(toIsoDate(date));
          }}
        />
      ) : null}
    </Field>
  );
}

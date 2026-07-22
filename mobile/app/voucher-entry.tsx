import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { radius, spacing } from '../src/config/theme';
import { voucherService } from '../src/services/voucher';
import { ledgerService } from '../src/services/ledger';
import { costCenterService } from '../src/services/cost-center';
import {
  DEFAULT_VOUCHER_BEHAVIOR,
  LedgerOption,
  Voucher,
  VOUCHER_TYPES,
  VOUCHER_TYPE_BEHAVIOR,
  VoucherTypeBehavior,
} from '../src/models/voucher';
import { errMessage, notify } from '../src/lib/alerts';
import { money, todayIso } from '../src/lib/format';
import { Card, T, Divider } from '../src/components/ui/layout';
import { Button } from '../src/components/ui/Button';
import { Icon } from '../src/components/ui/Icon';
import { TextField, NumberField, Select, DateField, Option } from '../src/components/ui/form';

interface Line {
  ledgerId: number | null;
  debit: number;
  credit: number;
  remarks: string;
}

const blankLine = (): Line => ({ ledgerId: null, debit: 0, credit: 0, remarks: '' });

/** Apply the receipt/payment first-row auto total (mirrors syncLineLocks). */
function recompute(lines: Line[], behavior: VoucherTypeBehavior): Line[] {
  if (!behavior.firstSide) return lines;
  const receipt = behavior.firstSide === 'debit';
  const next = lines.map((l) => ({ ...l }));
  let total = 0;
  next.forEach((l, i) => {
    if (receipt) l.debit = 0;
    else l.credit = 0;
    if (i === 0) {
      if (receipt) l.credit = 0;
      else l.debit = 0;
    } else {
      total += receipt ? l.credit : l.debit;
    }
  });
  if (next[0]) {
    if (receipt) next[0].debit = total;
    else next[0].credit = total;
  }
  return next;
}

export default function VoucherEntry() {
  const { palette } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [type, setType] = useState(VOUCHER_TYPES[0].code);
  const [voucherDate, setVoucherDate] = useState(todayIso());
  const [reference, setReference] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<Line[]>([blankLine(), blankLine()]);

  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);
  const [cashBankLedgers, setCashBankLedgers] = useState<LedgerOption[]>([]);
  const [firstLedgerOptions, setFirstLedgerOptions] = useState<LedgerOption[]>([]);
  const [costCenters, setCostCenters] = useState<Option<string>[]>([]);
  const [extraNames, setExtraNames] = useState<Map<number, string>>(new Map());

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);

  const behavior = VOUCHER_TYPE_BEHAVIOR[type] ?? DEFAULT_VOUCHER_BEHAVIOR;

  const cacheNames = (list: LedgerOption[]) =>
    setExtraNames((prev) => {
      const map = new Map(prev);
      for (const o of list) map.set(o.id, o.ledgerName);
      return map;
    });

  /** Load the option lists for a given type; on reset, seed the first ledger. */
  const loadTypeRefs = useCallback(async (t: string, reset: boolean) => {
    const b = VOUCHER_TYPE_BEHAVIOR[t] ?? DEFAULT_VOUCHER_BEHAVIOR;
    try {
      const list = await ledgerService.searchList({ withoutCashAtBankAndCashInHand: t !== 'JV' });
      setLedgers(list.items.filter((l) => l.id != null).map((l) => ({ id: l.id!, ledgerName: l.ledgerName })));
    } catch {
      /* ignore */
    }
    if (b.cashBankAll) {
      try {
        const cb = await voucherService.cashBankBalances('');
        setCashBankLedgers(cb);
        cacheNames(cb);
      } catch {
        setCashBankLedgers([]);
      }
    } else {
      setCashBankLedgers([]);
    }
    if (b.lockFirst && b.firstSection) {
      try {
        const fo = await voucherService.cashBankBalances(b.firstSection);
        setFirstLedgerOptions(fo);
        cacheNames(fo);
        if (reset && fo[0]) {
          setLines((prev) => {
            const next = prev.map((l) => ({ ...l }));
            if (next[0]) next[0].ledgerId = fo[0].id;
            return recompute(next, b);
          });
        }
      } catch {
        setFirstLedgerOptions([]);
      }
    } else {
      setFirstLedgerOptions([]);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    (async () => {
      try {
        const cc = await costCenterService.search({ activeOnly: true });
        setCostCenters(cc.map((c) => ({ label: c.name, value: c.name })));
      } catch {
        /* ignore */
      }
      if (editingId) {
        try {
          const full = await voucherService.getById(editingId);
          const loaded: Line[] = (full.details ?? []).map((d) => ({
            ledgerId: d.ledgerId,
            debit: d.debit ?? 0,
            credit: d.credit ?? 0,
            remarks: d.remarks ?? '',
          }));
          while (loaded.length < 2) loaded.push(blankLine());
          const t = full.type ?? VOUCHER_TYPES[0].code;
          setType(t);
          setVoucherDate((full.voucherDate ?? '').slice(0, 10) || todayIso());
          setReference(full.reference ?? '');
          setCostCenter(full.costCenter ?? '');
          setNarration(full.narration ?? '');
          setLines(loaded);
          await loadTypeRefs(t, false);
        } catch (err) {
          notify('Error', errMessage(err, 'Failed to load voucher.'));
        } finally {
          setLoading(false);
        }
      } else {
        await loadTypeRefs(VOUCHER_TYPES[0].code, true);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On type change (create only), rebuild the grid.
  const onChangeType = async (t: string) => {
    setType(t);
    setLines(recompute([blankLine(), blankLine()], VOUCHER_TYPE_BEHAVIOR[t] ?? DEFAULT_VOUCHER_BEHAVIOR));
    await loadTypeRefs(t, true);
  };

  const isReadonly = (index: number, side: 'debit' | 'credit'): boolean => {
    if (behavior.firstSide) {
      const receipt = behavior.firstSide === 'debit';
      const lockedColumn = receipt ? 'debit' : 'credit';
      if (side === lockedColumn) return true;
      return index === 0;
    }
    const other = side === 'debit' ? lines[index].credit : lines[index].debit;
    return (Number(other) || 0) > 0;
  };

  const setAmount = (index: number, side: 'debit' | 'credit', value: number) => {
    setLines((prev) => {
      const next = prev.map((l) => ({ ...l }));
      next[index][side] = value;
      // JV / Contra: entering a value on one side clears the other.
      if (!behavior.firstSide && value > 0) {
        next[index][side === 'debit' ? 'credit' : 'debit'] = 0;
      }
      return recompute(next, behavior);
    });
  };

  const setLedger = (index: number, ledgerId: number) => {
    setLines((prev) => {
      const next = prev.map((l) => ({ ...l }));
      next[index].ledgerId = ledgerId;
      return next;
    });
  };

  const setRemarks = (index: number, remarks: string) => {
    setLines((prev) => {
      const next = prev.map((l) => ({ ...l }));
      next[index].remarks = remarks;
      return next;
    });
  };

  const addLine = () => setLines((prev) => recompute([...prev.map((l) => ({ ...l })), blankLine()], behavior));
  const removeLine = (index: number) => {
    if (lines.length <= 2 || (behavior.lockFirst && index === 0)) return;
    setLines((prev) => recompute(prev.filter((_, i) => i !== index), behavior));
  };

  const rowOptions = (index: number): Option<number>[] => {
    let src: LedgerOption[];
    if (behavior.cashBankAll) src = cashBankLedgers;
    else if (behavior.lockFirst && index === 0) src = firstLedgerOptions;
    else src = ledgers;
    return src.map((l) => ({ label: l.ledgerName, value: l.id }));
  };

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of ledgers) map.set(l.id, l.ledgerName);
    for (const [id, name] of extraNames) map.set(id, name);
    return map;
  }, [ledgers, extraNames]);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = totalDebit > 0 && Math.abs(difference) < 0.005;

  const save = async () => {
    const details = lines
      .filter((d) => d.ledgerId != null && ((Number(d.debit) || 0) !== 0 || (Number(d.credit) || 0) !== 0))
      .map((d) => ({ ledgerId: d.ledgerId as number, debit: Number(d.debit) || 0, credit: Number(d.credit) || 0, remarks: (d.remarks ?? '').trim() }));
    if (details.length < 2) {
      notify('Incomplete', 'Add at least two ledger lines.');
      return;
    }
    if (!isBalanced) {
      notify('Not balanced', 'Total debit must equal total credit.');
      return;
    }
    const actor = user?.userName ?? user?.username ?? 'admin';
    const payload: Voucher = {
      type,
      voucherDate,
      reference: reference.trim(),
      costCenter: costCenter.trim(),
      narration: narration.trim(),
      details,
      postBy: actor,
    };
    if (editingId != null) payload.updateBy = actor;
    setSaving(true);
    try {
      if (editingId != null) await voucherService.update(editingId, payload);
      else await voucherService.add(payload);
      notify('Saved', `Voucher ${editingId != null ? 'updated' : 'created'} successfully.`);
      router.back();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <T muted>Loading…</T>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: editingId != null ? 'Edit Voucher' : 'New Voucher' }} />
      <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Card style={{ marginBottom: spacing.lg }}>
          <Select
            label="Type"
            value={type}
            options={VOUCHER_TYPES.map((t) => ({ label: `${t.code} — ${t.label}`, value: t.code }))}
            onChange={(v) => (editingId == null ? onChangeType(v) : undefined)}
            disabled={editingId != null}
            hint={editingId != null ? 'Type cannot be changed on an existing voucher.' : undefined}
          />
          <DateField label="Voucher Date" value={voucherDate} onChange={setVoucherDate} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <TextField label="Reference" value={reference} onChangeText={setReference} />
            </View>
            <View style={{ flex: 1 }}>
              <Select label="Cost Center" value={costCenter || null} options={[{ label: 'None', value: '' }, ...costCenters]} onChange={setCostCenter} searchable placeholder="None" />
            </View>
          </View>
          <TextField label="Narration" value={narration} onChangeText={setNarration} multiline />
        </Card>

        <T size={15} weight="800" style={{ marginBottom: spacing.sm }}>
          Ledger Lines
        </T>

        {lines.map((line, index) => (
          <Card key={index} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <T size={12} weight="700" muted style={{ flex: 1 }}>
                Line {index + 1}
                {behavior.lockFirst && index === 0 ? ' · Cash/Bank' : ''}
              </T>
              {lines.length > 2 && !(behavior.lockFirst && index === 0) ? (
                <Pressable onPress={() => removeLine(index)} hitSlop={8}>
                  <Icon path="M6 6l12 12M18 6L6 18" size={16} color={palette.danger} />
                </Pressable>
              ) : null}
            </View>
            <Select
              value={line.ledgerId}
              options={rowOptions(index)}
              onChange={(v) => setLedger(index, v)}
              searchable
              placeholder="Select ledger"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <NumberField label="Debit" value={line.debit} onChangeValue={(v) => setAmount(index, 'debit', v)} editable={!isReadonly(index, 'debit')} />
              </View>
              <View style={{ flex: 1 }}>
                <NumberField label="Credit" value={line.credit} onChangeValue={(v) => setAmount(index, 'credit', v)} editable={!isReadonly(index, 'credit')} />
              </View>
            </View>
            <TextField label="Remarks" value={line.remarks} onChangeText={(v) => setRemarks(index, v)} />
            {line.ledgerId != null ? (
              <T muted size={11}>
                {nameById.get(line.ledgerId) ?? `#${line.ledgerId}`}
              </T>
            ) : null}
          </Card>
        ))}

        <Button label="Add line" variant="secondary" icon="M12 5v14M5 12h14" onPress={addLine} style={{ marginTop: spacing.xs }} />

        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <T muted>Total Debit</T>
            <T weight="800" color={palette.debit}>
              {money(totalDebit)}
            </T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <T muted>Total Credit</T>
            <T weight="800" color={palette.credit}>
              {money(totalCredit)}
            </T>
          </View>
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T muted>Difference</T>
            <View
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: (isBalanced ? palette.success : palette.danger) + '22' }}
            >
              <T weight="800" color={isBalanced ? palette.success : palette.danger}>
                {isBalanced ? 'Balanced' : money(difference)}
              </T>
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} full />
          <Button label={editingId != null ? 'Update' : 'Save'} onPress={save} loading={saving} disabled={!isBalanced} style={{ flex: 1 }} full />
        </View>
      </ScrollView>
    </>
  );
}

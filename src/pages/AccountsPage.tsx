import type { FormEvent } from "react";
import { Landmark, Pencil, Plus, Scale, Upload, X } from "lucide-react";
import { useState } from "react";
import { adjustBalance, saveAccount } from "../api/customization";
import { BalanceScopeToggle, useHideSavingsInTotal } from "../components/BalanceScopeToggle";
import { IconGlyph, iconPalette } from "../components/IconGlyph";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { accountBalanceInBaseCurrency, totalBalanceMinor } from "../lib/accountBalances";
import { formatDateTime, formatMoney } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

const groupInfo = {
  operating: { title: "Рабочие счета", icon: "wallet" },
  savings: { title: "Сбережения", icon: "piggy-bank" },
  cash: { title: "Наличные", icon: "banknote" },
} as const;
const palette = ["#364C84", "#95B1EE", "#D0D9F5", "#E7F1AB", "#D99A9A", "#C7A9D8"];

export function AccountsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const [editing, setEditing] = useState<DashboardData["accounts"][number] | "new" | null>(null);
  const [newAccountGroup, setNewAccountGroup] = useState<DashboardData["accounts"][number]["group"]>("operating");
  const [adjusting, setAdjusting] = useState<DashboardData["accounts"][number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [hideSavings, setHideSavings] = useHideSavingsInTotal();
  const savingsMinor = data.accounts.reduce((sum, account) => account.group === "savings"
    ? sum + accountBalanceInBaseCurrency(account, data.availableMoney.currency)
    : sum, 0);
  const displayedBalanceMinor = hideSavings ? data.availableMoney.amountMinor : totalBalanceMinor(data);
  const openNewAccount = (group: DashboardData["accounts"][number]["group"] = "operating") => {
    setNewAccountGroup(group);
    setEditing("new");
  };
  const grouped = (Object.keys(groupInfo) as Array<DashboardData["accounts"][number]["group"]>)
    .map((group) => ({ group, items: data.accounts.filter((account) => account.group === group) }));

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader title="Счета" subtitle="Владельцы, названия, иконки и точные остатки" periodLabel={data.meta.periodLabel} fx={data.meta.fx} attentionCount={data.attention.total}
        theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
        activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="accounts-hero">
        <span className="accounts-hero-icon" aria-hidden="true"><Landmark size={24} strokeWidth={1.7} /></span>
        <div className="accounts-hero-total">
          <div className="balance-heading-row"><small>Общий баланс</small><BalanceScopeToggle checked={hideSavings} onChange={setHideSavings} disabled={savingsMinor === 0} /></div>
          <strong>{formatMoney(displayedBalanceMinor, data.availableMoney.currency)}</strong>
        </div>
        <p>Без накоплений для трат доступно {formatMoney(data.availableMoney.amountMinor, data.availableMoney.currency)}. Корректировка остатка сохраняется отдельной операцией.</p>
        <button className="primary-button" type="button" onClick={() => openNewAccount()} disabled={!canWrite}><Plus size={17} />Новый счёт</button>
      </section>

      <section className="account-groups">
        {grouped.map(({ group, items }) => (
          <div className="panel account-group-panel" key={group}>
            <SectionTitle title={groupInfo[group].title} action={<span className="account-group-actions"><IconGlyph name={groupInfo[group].icon} size={18} strokeWidth={1.8} /><button className="text-button" type="button" onClick={() => openNewAccount(group)} disabled={!canWrite}><Plus size={13} />Добавить</button></span>} />
            <div className="finance-list">
              {items.length ? items.map((account) => (
                <article className="account-editor-row" key={account.id}>
                  <button className="account-main-button" type="button" onClick={() => setEditing(account)} disabled={!canWrite}>
                    <span className="account-brand-avatar" style={{ background: account.color }} aria-hidden="true">
                      {account.avatarDataUrl ? <img src={account.avatarDataUrl} alt="" /> : <IconGlyph name={account.iconKey} size={20} />}
                    </span>
                    <span className="account-copy"><strong>{account.name}</strong><small>{account.ownerName} · обновлён {formatDateTime(account.updatedAt)}</small></span>
                    <span className="account-amount"><strong>{formatMoney(account.balanceMinor, account.currency)}</strong><small>Настроить <Pencil size={12} /></small></span>
                  </button>
                  <button className="quiet-button account-adjust-button" type="button" onClick={() => setAdjusting(account)} disabled={!canWrite}><Scale size={15} />Баланс</button>
                </article>
              )) : <div className="inline-empty">В этой группе счетов пока нет.</div>}
            </div>
          </div>
        ))}
      </section>

      {editing ? <AccountDialog
        account={editing === "new" ? null : editing} people={data.people}
        initialGroup={newAccountGroup}
        ownerFallback={activeUserKey || data.people[0]?.key || ""} saving={saving}
        onClose={() => setEditing(null)} onSave={async (account) => {
          if (!canWrite) return;
          setSaving(true);
          try {
            if (source === "demo") {
              const exists = data.accounts.some((item) => item.id === account.id);
              const previous = data.accounts.find((item) => item.id === account.id);
              const wasAvailable = previous && (previous.group === "operating" || previous.group === "cash")
                ? accountBalanceInBaseCurrency(previous, data.availableMoney.currency) : 0;
              const isAvailable = account.group === "operating" || account.group === "cash"
                ? accountBalanceInBaseCurrency(account, data.availableMoney.currency) : 0;
              onDataChange?.({
                ...data,
                availableMoney: { ...data.availableMoney, amountMinor: data.availableMoney.amountMinor - wasAvailable + isAvailable },
                accounts: exists ? data.accounts.map((item) => item.id === account.id ? account : item) : [...data.accounts, account],
              });
            } else {
              await saveAccount(account.id, {
                name: account.name, owner_person_key: account.ownerKey, group: account.group,
                currency: account.currency, icon_key: account.iconKey, color: account.color,
                avatar_data_url: account.avatarDataUrl,
              });
            }
            setEditing(null); if (source === "api") onRefresh?.();
          } finally { setSaving(false); }
        }}
      /> : null}

      {adjusting ? <BalanceDialog account={adjusting} saving={saving} onClose={() => setAdjusting(null)} onSave={async (balanceMinor) => {
        if (!canWrite) return;
        setSaving(true);
        try {
          if (source === "demo") {
            const delta = balanceMinor - adjusting.balanceMinor;
            const changesAvailable = adjusting.currency === data.availableMoney.currency
              && (adjusting.group === "operating" || adjusting.group === "cash");
            onDataChange?.({
              ...data,
              availableMoney: {
                ...data.availableMoney,
                amountMinor: data.availableMoney.amountMinor + (changesAvailable ? delta : 0),
              },
              accounts: data.accounts.map((item) => item.id === adjusting.id
                ? { ...item, balanceMinor, updatedAt: new Date().toISOString() }
                : item),
            });
          }
          else await adjustBalance(adjusting.id, balanceMinor, adjusting.ownerKey, "Ручная сверка остатка через интерфейс");
          setAdjusting(null); if (source === "api") onRefresh?.();
        } finally { setSaving(false); }
      }} /> : null}
    </main>
  );
}

function AccountDialog({ account, people, initialGroup, ownerFallback, saving, onClose, onSave }: {
  account: DashboardData["accounts"][number] | null;
  people: DashboardData["people"];
  initialGroup: DashboardData["accounts"][number]["group"];
  ownerFallback: string;
  saving: boolean;
  onClose: () => void;
  onSave: (account: DashboardData["accounts"][number]) => Promise<void>;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [owner, setOwner] = useState(account?.ownerKey ?? ownerFallback);
  const [group, setGroup] = useState<DashboardData["accounts"][number]["group"]>(account?.group ?? initialGroup);
  const [currency, setCurrency] = useState(account?.currency ?? "RUB");
  const [icon, setIcon] = useState(account?.iconKey ?? "landmark");
  const [color, setColor] = useState(account?.color ?? palette[1]);
  const [avatar, setAvatar] = useState<string | null>(account?.avatarDataUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !owner) return;
    const person = people.find((item) => item.key === owner);
    try {
      setError(null);
      await onSave({
        id: account?.id ?? `account-${Date.now()}`,
        name: name.trim(), group, balanceMinor: account?.balanceMinor ?? 0, currency,
        convertedBalanceMinor: currency === "RUB" ? account?.balanceMinor ?? 0 : null,
        updatedAt: account?.updatedAt ?? new Date().toISOString(), ownerKey: owner,
        ownerName: person?.name || owner, iconKey: icon, color, avatarDataUrl: avatar,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить счёт. Повторите попытку.");
    }
  };
  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="product-dialog" onSubmit={submit}>
        <header><div><h2>{account ? "Настроить счёт" : group === "savings" ? "Новый накопительный счёт" : "Новый счёт"}</h2><p>Название, владелец, тип и фирменный знак банка.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header>
        <div className="avatar-editor"><span className="account-brand-avatar account-brand-avatar-large" style={{ background: color }}>{avatar ? <img src={avatar} alt="" /> : <IconGlyph name={icon} size={26} />}</span><label className="quiet-button"><Upload size={15} />Загрузить аватар<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
          const file = event.target.files?.[0]; if (!file || file.size > 512 * 1024) return;
          const reader = new FileReader(); reader.onload = () => setAvatar(String(reader.result)); reader.readAsDataURL(file);
        }} /></label>{avatar ? <button className="text-button" type="button" onClick={() => setAvatar(null)}>Удалить</button> : null}</div>
        <label><span>Название</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Т-Банк основной" autoFocus /></label>
        <div className="form-split"><label><span>Владелец</span><select value={owner} onChange={(event) => setOwner(event.target.value)}>{people.map((person) => <option value={person.key} key={person.key}>{person.name}</option>)}</select></label><label><span>Тип счёта</span><select aria-label="Тип счёта" value={group} onChange={(event) => setGroup(event.target.value as typeof group)}><option value="operating">Рабочий</option><option value="savings">Накопительный</option><option value="cash">Наличные</option></select></label></div>
        <label><span>Валюта</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="RUB">RUB</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
        <fieldset className="icon-palette"><legend>Иконка</legend>{iconPalette.slice(0, 16).map((key) => <button className={icon === key ? "palette-active" : ""} type="button" onClick={() => { setIcon(key); setAvatar(null); }} aria-label={key} key={key}><IconGlyph name={key} size={18} /></button>)}</fieldset>
        <fieldset className="color-palette"><legend>Цвет</legend>{palette.map((value) => <button className={color === value ? "palette-active" : ""} style={{ background: value }} type="button" onClick={() => setColor(value)} aria-label={`Цвет ${value}`} key={value} />)}</fieldset>
        {error ? <p className="product-dialog-error" role="alert">{error}</p> : null}
        <footer><span /><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Сохранить"}</button></footer>
      </form>
    </div>
  );
}

function BalanceDialog({ account, saving, onClose, onSave }: {
  account: DashboardData["accounts"][number]; saving: boolean; onClose: () => void; onSave: (balanceMinor: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(account.balanceMinor / 100));
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="product-dialog product-dialog-compact" onSubmit={(event) => { event.preventDefault(); const minor = Math.round(Number(value.replace(",", ".")) * 100); if (Number.isFinite(minor)) void onSave(minor); }}><header><div><h2>Уточнить баланс</h2><p>{account.name}. Текущий остаток {formatMoney(account.balanceMinor, account.currency)}.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header><label><span>Фактический баланс</span><input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} autoFocus /></label><div className="audit-callout"><Scale size={17} /><span><strong>История сохранится</strong><small>Будет создана отдельная корректирующая операция с автором и датой.</small></span></div><footer><span /><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Записать баланс"}</button></footer></form></div>;
}

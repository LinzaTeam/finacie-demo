import type { FormEvent } from "react";
import { CheckCircle2, Database, Moon, Save, ShieldCheck, Sun, Upload, UsersRound } from "lucide-react";
import { useState } from "react";
import { saveCategory, saveProfile } from "../api/customization";
import { IconGlyph, iconPalette } from "../components/IconGlyph";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

const palette = ["#364C84", "#95B1EE", "#D0D9F5", "#E7F1AB", "#D99A9A", "#C7A9D8", "#9ED89E", "#333333"];

export function SettingsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const profile = data.people.find((person) => person.key === activeUserKey) ?? data.people[0];
  const [name, setName] = useState(profile?.name ?? activeUser);
  const [avatar, setAvatar] = useState<string | null>(profile?.avatarDataUrl ?? null);
  const [accent, setAccent] = useState(profile?.accentColor ?? palette[0]);
  const [saving, setSaving] = useState(false);

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !name.trim() || !canWrite) return;
    setSaving(true);
    try {
      if (source === "demo") {
        onDataChange?.({ ...data, people: data.people.map((person) => person.key === profile.key ? { ...person, name: name.trim(), avatarDataUrl: avatar, accentColor: accent } : person) });
      } else {
        await saveProfile(profile.key, { display_name: name.trim(), avatar_data_url: avatar, accent_color: accent });
      }
      if (source === "api") onRefresh?.();
    } finally { setSaving(false); }
  };

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader title="Настройки" subtitle="Профиль, категории и внешний вид" periodLabel={data.meta.periodLabel}
        theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
        activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="settings-grid">
        <form className="panel settings-panel profile-settings-card" onSubmit={(event) => void submitProfile(event)}>
          <SectionTitle title="Мой профиль" action={<UsersRound size={19} />} />
          <div className="profile-editor">
            <span className="profile-avatar profile-avatar-large" style={{ background: accent }}>{avatar ? <img src={avatar} alt="" /> : name.slice(0, 1)}</span>
            <div><strong>Аватар участника</strong><small>PNG, JPEG или WebP до 512 КБ</small><label className="quiet-button"><Upload size={15} />Загрузить<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.target.files?.[0]; if (!file || file.size > 512 * 1024) return;
              const reader = new FileReader(); reader.onload = () => setAvatar(String(reader.result)); reader.readAsDataURL(file);
            }} /></label></div>
          </div>
          <label className="settings-field"><span>Имя в приложении</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <fieldset className="color-palette"><legend>Цвет профиля</legend>{palette.map((value) => <button className={accent === value ? "palette-active" : ""} style={{ background: value }} type="button" onClick={() => setAccent(value)} aria-label={`Цвет ${value}`} key={value} />)}</fieldset>
          <button className="primary-button" type="submit" disabled={saving}><Save size={16} />{saving ? "Сохраняю" : "Сохранить профиль"}</button>
        </form>

        <div className="panel settings-panel">
          <SectionTitle title="Семейный контур" />
          <div className="settings-row"><span className="settings-icon" aria-hidden="true"><UsersRound size={20} strokeWidth={1.8} /></span><span><strong>Общие данные</strong><small>Каждая операция хранит автора и участника</small></span><CheckCircle2 size={19} aria-label="Включено" /></div>
          <div className="settings-row"><span className="settings-icon" aria-hidden="true"><ShieldCheck size={20} strokeWidth={1.8} /></span><span><strong>Неизменяемый журнал</strong><small>Корректировки записываются отдельными событиями</small></span><CheckCircle2 size={19} aria-label="Включено" /></div>
          <button className="theme-setting" type="button" onClick={onThemeToggle}><span className="settings-icon">{theme === "light" ? <Sun size={20} /> : <Moon size={20} />}</span><span><strong>{theme === "light" ? "Светлая тема" : "Тёмная тема"}</strong><small>Нажмите, чтобы переключить</small></span><span className="theme-swatch" /></button>
          <div className="settings-row"><span className="settings-icon"><Database size={20} /></span><span><strong>{source === "demo" ? "Демо-профиль" : "Локальная финансовая база"}</strong><small>Часовой пояс: {data.meta.timezone}</small></span><span className="source-status">{source === "demo" ? "Демо" : "Подключено"}</span></div>
        </div>
      </section>

      <section className="panel category-settings-panel">
        <SectionTitle title="Палитра категорий" action={<span className="section-caption">Иконки расходов настраиваются отдельно</span>} />
        <div className="category-editor-grid">
          {data.categories.map((category) => <CategoryEditor category={category} source={source} data={data} onDataChange={onDataChange} onRefresh={onRefresh} key={category.id} />)}
        </div>
      </section>
    </main>
  );
}

function CategoryEditor({ category, source, data, onDataChange, onRefresh }: {
  category: DashboardData["categories"][number]; source: "api" | "demo"; data: DashboardData;
  onDataChange?: (data: DashboardData) => void; onRefresh?: () => void;
}) {
  const [icon, setIcon] = useState(category.iconKey);
  const [color, setColor] = useState(category.color);
  const [saving, setSaving] = useState(false);
  const persist = async () => {
    setSaving(true);
    try {
      if (source === "demo") onDataChange?.({ ...data, categories: data.categories.map((item) => item.id === category.id ? { ...item, iconKey: icon, color } : item) });
      else await saveCategory(category.id, icon, color);
      if (source === "api") onRefresh?.();
    } finally { setSaving(false); }
  };
  return <article className="category-editor-card"><span className="category-preview" style={{ background: color }}><IconGlyph name={icon} size={19} /></span><div><strong>{category.label}</strong><small>{Math.round(category.share * 100)}% расходов</small></div><select aria-label={`Иконка ${category.label}`} value={icon} onChange={(event) => setIcon(event.target.value)}>{iconPalette.map((key) => <option value={key} key={key}>{key}</option>)}</select><input type="color" aria-label={`Цвет ${category.label}`} value={color} onChange={(event) => setColor(event.target.value)} /><button className="icon-button" type="button" onClick={() => void persist()} disabled={saving} aria-label={`Сохранить ${category.label}`}><Save size={16} /></button></article>;
}

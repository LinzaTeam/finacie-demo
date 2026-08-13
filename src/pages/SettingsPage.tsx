import type { FormEvent } from "react";
import { Bug, CheckCircle2, Database, Inbox, LoaderCircle, Moon, Palette, Save, ShieldCheck, SlidersHorizontal, Sun, Upload, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getBugReports, saveCategory, saveProfile, updateBugReportStatus, type BugReport, type BugReportStatus } from "../api/customization";
import { IconGlyph, iconPalette } from "../components/IconGlyph";
import { useBugReport } from "../components/BugReportDialog";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatDateTime } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

const palette = ["#364C84", "#95B1EE", "#D0D9F5", "#E7F1AB", "#D99A9A", "#C7A9D8", "#9ED89E", "#333333"];
const settingsSections = [
  { key: "profile", label: "Профиль", icon: UsersRound },
  { key: "interface", label: "Режим", icon: SlidersHorizontal },
  { key: "categories", label: "Категории", icon: Palette },
  { key: "family", label: "Контур", icon: ShieldCheck },
  { key: "support", label: "Поддержка", icon: Bug },
] as const;
type SettingsSection = (typeof settingsSections)[number]["key"];
type ProfileFeedback = { kind: "success" | "error"; message: string } | null;

const bugStatusLabel: Record<BugReportStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  fixed: "Исправлен",
};

export function SettingsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, simpleMode = false, onSimpleModeChange, onDataChange, onRefresh,
}: FinancePageProps) {
  const profile = data.people.find((person) => person.key === activeUserKey) ?? data.people[0];
  const [section, setSection] = useState<SettingsSection>("profile");
  const [name, setName] = useState(profile?.name ?? activeUser);
  const [avatar, setAvatar] = useState<string | null>(profile?.avatarDataUrl ?? null);
  const [accent, setAccent] = useState(profile?.accentColor ?? palette[0]);
  const [saving, setSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<ProfileFeedback>(null);

  useEffect(() => {
    setName(profile?.name ?? activeUser);
    setAvatar(profile?.avatarDataUrl ?? null);
    setAccent(profile?.accentColor ?? palette[0]);
  }, [activeUser, profile?.accentColor, profile?.avatarDataUrl, profile?.name]);

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileFeedback(null);
    if (!profile) {
      setProfileFeedback({ kind: "error", message: "Не удалось определить текущий профиль. Обновите страницу и попробуйте снова." });
      return;
    }
    if (!name.trim()) {
      setProfileFeedback({ kind: "error", message: "Укажите имя в приложении." });
      return;
    }
    if (!canWrite) {
      setProfileFeedback({
        kind: "error",
        message: "Сессия открыта только для просмотра. Войдите через Telegram заново; если сообщение останется, на сервере нужно включить сохранение.",
      });
      return;
    }
    setSaving(true);
    try {
      const updatedData = {
        ...data,
        people: data.people.map((person) => person.key === profile.key
          ? { ...person, name: name.trim(), avatarDataUrl: avatar, accentColor: accent }
          : person),
      };
      if (source === "demo") {
        onDataChange?.(updatedData);
      } else {
        await saveProfile(profile.key, { display_name: name.trim(), avatar_data_url: avatar, accent_color: accent });
        onDataChange?.(updatedData);
      }
      setProfileFeedback({ kind: "success", message: "Профиль сохранён." });
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "Неизвестная ошибка";
      setProfileFeedback({
        kind: "error",
        message: `Не удалось сохранить профиль. ${detail}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (simpleMode) {
    return (
      <main className="app-page simple-mode-page" id="page-content" tabIndex={-1}>
        <PageHeader title="Настроить" subtitle="Несколько действий для спокойной работы" periodLabel={data.meta.periodLabel} attentionCount={data.attention.total}
          theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={() => undefined}
          activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} simpleMode />

        <section className="panel simple-settings-panel">
          <span className="simple-settings-kicker">Режим приложения</span>
          <h2>Простой режим включён</h2>
          <p>На главной остаются баланс, операции и контроль. Графики, курсы и расширенные разделы не отвлекают от ежедневных записей.</p>
          <button className="quiet-button" type="button" onClick={() => onSimpleModeChange?.(false)}>
            Открыть полный режим
          </button>
        </section>

        <section className="panel simple-settings-panel simple-settings-theme">
          <div>
            <strong>{theme === "light" ? "Светлая тема" : "Тёмная тема"}</strong>
            <span>Выберите оформление, в котором комфортно записывать операции.</span>
          </div>
          <button className="quiet-button" type="button" onClick={onThemeToggle}>
            {theme === "light" ? "Тёмная" : "Светлая"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader title="Настройки" subtitle="Отдельные разделы для профиля, правил и поддержки" periodLabel={data.meta.periodLabel} fx={data.meta.fx} attentionCount={data.attention.total}
        theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
        activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
      <DataNotices source={source} fx={data.meta.fx} />

      <nav className="settings-tabs" aria-label="Разделы настроек">
        {settingsSections.map(({ key, label, icon: Icon }) => (
          <button className={section === key ? "settings-tab settings-tab-active" : "settings-tab"} type="button" onClick={() => setSection(key)} key={key}>
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {section === "profile" ? (
        <section className="settings-section settings-grid">
          <form className="panel settings-panel profile-settings-card" onSubmit={(event) => void submitProfile(event)}>
            <SectionTitle title="Мой профиль" action={<UsersRound size={19} />} />
            <div className="profile-editor">
              <span className="profile-avatar profile-avatar-large" style={{ background: accent }}>{avatar ? <img src={avatar} alt="" /> : name.slice(0, 1)}</span>
              <div><strong>Аватар участника</strong><small>PNG, JPEG или WebP до 512 КБ</small><label className="quiet-button"><Upload size={15} />Загрузить<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 512 * 1024) {
                  setProfileFeedback({ kind: "error", message: "Аватар больше 512 КБ. Выберите файл меньшего размера." });
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => { setAvatar(String(reader.result)); setProfileFeedback(null); };
                reader.readAsDataURL(file);
              }} /></label></div>
            </div>
            <label className="settings-field"><span>Имя в приложении</span><input value={name} onChange={(event) => { setName(event.target.value); setProfileFeedback(null); }} /></label>
            <fieldset className="color-palette"><legend>Цвет профиля</legend>{palette.map((value) => <button className={accent === value ? "palette-active" : ""} style={{ background: value }} type="button" onClick={() => { setAccent(value); setProfileFeedback(null); }} aria-label={`Цвет ${value}`} key={value} />)}</fieldset>
            {!canWrite ? <p className="profile-save-hint">Сейчас доступен только просмотр. Нажмите «Сохранить профиль», чтобы увидеть, как восстановить доступ.</p> : null}
            {profileFeedback ? <p className={`profile-save-feedback profile-save-feedback-${profileFeedback.kind}`} role={profileFeedback.kind === "error" ? "alert" : "status"}>
              {profileFeedback.kind === "success" ? <CheckCircle2 size={16} aria-hidden="true" /> : null}
              <span>{profileFeedback.message}</span>
            </p> : null}
            <button className="primary-button" type="submit" disabled={saving || !profile || !name.trim()}><Save size={16} />{saving ? "Сохраняю" : "Сохранить профиль"}</button>
          </form>
          <ProfileRulesPanel source={source} timezone={data.meta.timezone} theme={theme} onThemeToggle={onThemeToggle} />
        </section>
      ) : null}

      {section === "interface" ? (
        <section className="panel settings-panel interface-mode-panel settings-section">
          <SectionTitle title="Режим приложения" />
          <div className="interface-mode-copy">
            <span className="settings-icon"><SlidersHorizontal size={20} /></span>
            <div>
              <strong>Простой режим</strong>
              <p>Для ежедневной работы: баланс, лента операций, контроль и одна понятная кнопка добавления. Графики, курсы и расширенные разделы скрываются.</p>
              <small>Настройка сохраняется в этом браузере.</small>
            </div>
          </div>
          <button className="primary-button" type="button" onClick={() => onSimpleModeChange?.(true)}>
            Включить простой режим
          </button>
        </section>
      ) : null}

      {section === "categories" ? (
        <section className="panel category-settings-panel settings-section">
          <SectionTitle title="Палитра категорий" action={<span className="section-caption">Иконки расходов настраиваются отдельно</span>} />
          <div className="category-editor-grid">
            {data.categories.map((category) => <CategoryEditor category={category} source={source} data={data} canWrite={canWrite} onDataChange={onDataChange} onRefresh={onRefresh} key={category.id} />)}
          </div>
        </section>
      ) : null}

      {section === "family" ? <FamilyPanel source={source} timezone={data.meta.timezone} theme={theme} onThemeToggle={onThemeToggle} /> : null}
      {section === "support" ? <SupportPanel source={source} canWrite={canWrite} /> : null}
    </main>
  );
}

function ProfileRulesPanel({ source, timezone, theme, onThemeToggle }: { source: "api" | "demo"; timezone: string; theme: "light" | "dark"; onThemeToggle: () => void }) {
  return <div className="panel settings-panel settings-guidance-card">
    <SectionTitle title="В этом разделе" />
    <div className="settings-row"><span className="settings-icon"><UsersRound size={20} /></span><span><strong>Личный профиль</strong><small>Имя, аватар и акцентный цвет видны семье</small></span><CheckCircle2 size={19} aria-label="Включено" /></div>
    <div className="settings-row"><span className="settings-icon"><Database size={20} /></span><span><strong>{source === "demo" ? "Демо-профиль" : "Семейная база"}</strong><small>Часовой пояс: {timezone}</small></span><span className="source-status">{source === "demo" ? "Демо" : "Онлайн"}</span></div>
    <button className="theme-setting" type="button" onClick={onThemeToggle}><span className="settings-icon">{theme === "light" ? <Sun size={20} /> : <Moon size={20} />}</span><span><strong>{theme === "light" ? "Светлая тема" : "Тёмная тема"}</strong><small>Нажмите, чтобы переключить</small></span><span className="theme-swatch" /></button>
  </div>;
}

function FamilyPanel({ source, timezone, theme, onThemeToggle }: { source: "api" | "demo"; timezone: string; theme: "light" | "dark"; onThemeToggle: () => void }) {
  return <section className="panel settings-panel settings-section family-settings-panel">
    <SectionTitle title="Семейный контур" />
    <div className="settings-row"><span className="settings-icon" aria-hidden="true"><UsersRound size={20} strokeWidth={1.8} /></span><span><strong>Общие данные</strong><small>Каждая операция хранит автора и участника</small></span><CheckCircle2 size={19} aria-label="Включено" /></div>
    <div className="settings-row"><span className="settings-icon" aria-hidden="true"><ShieldCheck size={20} strokeWidth={1.8} /></span><span><strong>Неизменяемый журнал</strong><small>Корректировки записываются отдельными событиями</small></span><CheckCircle2 size={19} aria-label="Включено" /></div>
    <div className="settings-row"><span className="settings-icon"><Database size={20} /></span><span><strong>{source === "demo" ? "Демо-профиль" : "Семейная база"}</strong><small>Часовой пояс: {timezone}</small></span><span className="source-status">{source === "demo" ? "Демо" : "Подключено"}</span></div>
    <button className="theme-setting" type="button" onClick={onThemeToggle}><span className="settings-icon">{theme === "light" ? <Sun size={20} /> : <Moon size={20} />}</span><span><strong>{theme === "light" ? "Светлая тема" : "Тёмная тема"}</strong><small>Нажмите, чтобы переключить</small></span><span className="theme-swatch" /></button>
  </section>;
}

function SupportPanel({ source, canWrite }: { source: "api" | "demo"; canWrite: boolean }) {
  const openBugReport = useBugReport();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [filter, setFilter] = useState<BugReportStatus | "all">("all");
  const [loading, setLoading] = useState(source === "api");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadReports = useCallback(async () => {
    if (source !== "api") {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setReports(await getBugReports(filter === "all" ? undefined : filter));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить баг-репорты");
    } finally {
      setLoading(false);
    }
  }, [filter, source]);

  useEffect(() => { void loadReports(); }, [loadReports]);
  useEffect(() => {
    const refresh = () => { void loadReports(); };
    window.addEventListener("finance:bug-report-created", refresh);
    return () => window.removeEventListener("finance:bug-report-created", refresh);
  }, [loadReports]);

  const changeStatus = async (report: BugReport, status: BugReportStatus) => {
    if (!canWrite || status === report.status) return;
    setUpdatingId(report.report_id);
    try {
      const updated = await updateBugReportStatus(report.report_id, status);
      setReports((current) => current.map((item) => item.report_id === updated.report_id ? updated : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить статус");
    } finally {
      setUpdatingId(null);
    }
  };

  return <section className="settings-section support-section">
    <div className="support-header panel">
      <div><span className="eyebrow"><Bug size={15} aria-hidden="true" /> Поддержка</span><h2>Баг-репорты семьи</h2><p>Проблемы, скриншоты, автор и статус в одном месте. Новый отчёт можно создать из верхней панели.</p></div>
      <button className="primary-button" type="button" onClick={() => openBugReport?.()} disabled={!openBugReport || !canWrite}><Bug size={16} />Сообщить о проблеме</button>
    </div>
    <div className="support-toolbar">
      <label><span>Показать</span><select value={filter} onChange={(event) => setFilter(event.target.value as BugReportStatus | "all")}><option value="all">Все статусы</option><option value="new">Новые</option><option value="in_progress">В работе</option><option value="fixed">Исправленные</option></select></label>
      <span>{reports.length} {reports.length === 1 ? "отчёт" : "отчётов"}</span>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {loading ? <div className="support-empty panel"><LoaderCircle className="spin" size={22} /><span>Загружаю отчёты</span></div> : null}
    {!loading && source === "demo" ? <div className="support-empty panel"><Inbox size={24} /><strong>В демо нет обращений</strong><span>Войдите в семейный контур, чтобы отправлять и видеть баг-репорты.</span></div> : null}
    {!loading && source === "api" && reports.length === 0 ? <div className="support-empty panel"><Inbox size={24} /><strong>Пока нет обращений</strong><span>Если что-то работает не так, нажмите жучок сверху и опишите проблему.</span></div> : null}
    {!loading && reports.length > 0 ? <div className="bug-report-list">{reports.map((report) => <article className="bug-report-card panel" key={report.report_id}>
      <header><div><span className={`bug-status bug-status-${report.status}`}>{bugStatusLabel[report.status]}</span><strong>#{report.report_id} · {report.author_name}</strong></div><time dateTime={report.created_at}>{formatDateTime(report.created_at)}</time></header>
      <p>{report.message}</p>
      {report.screenshots.length ? <div className="bug-report-previews">{report.screenshots.map((screenshot, index) => <a href={screenshot} target="_blank" rel="noreferrer" key={screenshot}><img src={screenshot} alt={`Скриншот ${index + 1} к отчёту #${report.report_id}`} /></a>)}</div> : null}
      <footer><label><span>Статус</span><select value={report.status} disabled={!canWrite || updatingId === report.report_id} onChange={(event) => void changeStatus(report, event.target.value as BugReportStatus)}>{(Object.keys(bugStatusLabel) as BugReportStatus[]).map((status) => <option value={status} key={status}>{bugStatusLabel[status]}</option>)}</select></label>{updatingId === report.report_id ? <LoaderCircle className="spin" size={17} /> : null}</footer>
    </article>)}</div> : null}
  </section>;
}

function CategoryEditor({ category, source, data, canWrite, onDataChange, onRefresh }: {
  category: DashboardData["categories"][number]; source: "api" | "demo"; data: DashboardData; canWrite: boolean;
  onDataChange?: (data: DashboardData) => void; onRefresh?: () => void;
}) {
  const [icon, setIcon] = useState(category.iconKey);
  const [color, setColor] = useState(category.color);
  const [saving, setSaving] = useState(false);
  const persist = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      if (source === "demo") onDataChange?.({ ...data, categories: data.categories.map((item) => item.id === category.id ? { ...item, iconKey: icon, color } : item) });
      else await saveCategory(category.id, icon, color);
      if (source === "api") onRefresh?.();
    } finally { setSaving(false); }
  };
  return <article className="category-editor-card"><span className="category-preview" style={{ background: color }}><IconGlyph name={icon} size={19} /></span><div><strong>{category.label}</strong><small>{Math.round(category.share * 100)}% расходов</small></div><select aria-label={`Иконка ${category.label}`} value={icon} disabled={!canWrite} onChange={(event) => setIcon(event.target.value)}>{iconPalette.map((key) => <option value={key} key={key}>{key}</option>)}</select><input type="color" aria-label={`Цвет ${category.label}`} value={color} disabled={!canWrite} onChange={(event) => setColor(event.target.value)} /><button className="icon-button" type="button" onClick={() => void persist()} disabled={saving || !canWrite} aria-label={`Сохранить ${category.label}`}><Save size={16} /></button></article>;
}

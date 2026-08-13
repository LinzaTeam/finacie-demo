import { Bug, ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DashboardSource } from "../api/dashboard";
import { createBugReport } from "../api/customization";

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 1024 * 1024;

const BugReportContext = createContext<(() => void) | null>(null);

export function BugReportProvider({
  onOpen,
  children,
}: {
  onOpen: (() => void) | null;
  children: ReactNode;
}) {
  return <BugReportContext.Provider value={onOpen}>{children}</BugReportContext.Provider>;
}

export function useBugReport() {
  return useContext(BugReportContext);
}

type BugReportDialogProps = {
  open: boolean;
  source: DashboardSource;
  canWrite: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не получилось прочитать скриншот"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function BugReportDialog({
  open,
  source,
  canWrite,
  onClose,
  onSubmitted,
}: BugReportDialogProps) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => messageRef.current?.focus(), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (open) return;
    setMessage("");
    setScreenshots([]);
    setError(null);
    setSaving(false);
    setSaved(false);
  }, [open]);

  if (!open) return null;

  const addScreenshots = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = [...files];
    if (screenshots.length + selected.length > MAX_SCREENSHOTS) {
      setError(`Можно приложить до ${MAX_SCREENSHOTS} скриншотов.`);
      return;
    }
    const invalid = selected.find((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_SCREENSHOT_BYTES);
    if (invalid) {
      setError("Подойдут PNG, JPEG или WebP до 1 МБ каждый.");
      return;
    }
    try {
      const images = await Promise.all(selected.map(readImage));
      setScreenshots((current) => [...current, ...images]);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не получилось добавить скриншот");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (source !== "api") {
      setError("В демо-профиле отчёты не отправляются. Войдите в семейный контур.");
      return;
    }
    if (!canWrite) {
      setError("У этого сеанса нет права отправлять изменения.");
      return;
    }
    if (message.trim().length < 5) {
      setError("Опишите проблему хотя бы несколькими словами.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBugReport({ message: message.trim(), screenshots });
      setSaved(true);
      onSubmitted();
      window.setTimeout(onClose, 700);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить отчёт");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bug-report-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <form ref={dialogRef} className="bug-report-dialog" onSubmit={(event) => void submit(event)} role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
        <header className="bug-report-header">
          <div>
            <span className="eyebrow"><Bug size={15} aria-hidden="true" /> Обратная связь</span>
            <h2 id="bug-report-title">Сообщить о проблеме</h2>
            <p>Опишите, что произошло. Можно приложить экран — отчёт сохранится в общей базе.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Закрыть форму баг-репорта">
            <X size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <label className="form-field bug-message-field">
          <span>Что не так?</span>
          <textarea ref={messageRef} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="Например: при сохранении цели не видно, что операция прошла" />
        </label>

        <div className="bug-attachment-section">
          <div className="bug-attachment-heading">
            <span>Скриншоты</span>
            <small>До 3 файлов, PNG/JPEG/WebP до 1 МБ</small>
          </div>
          <div className="bug-attachments">
            {screenshots.map((screenshot, index) => (
              <figure className="bug-attachment" key={screenshot}>
                <img src={screenshot} alt={`Скриншот ${index + 1} к баг-репорту`} />
                <button type="button" onClick={() => setScreenshots((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Удалить скриншот ${index + 1}`}>
                  <X size={14} aria-hidden="true" />
                </button>
              </figure>
            ))}
            {screenshots.length < MAX_SCREENSHOTS ? (
              <label className="bug-attachment-add">
                <ImagePlus size={19} aria-hidden="true" />
                <span>Добавить</span>
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => void addScreenshots(event.target.files)} />
              </label>
            ) : null}
          </div>
        </div>

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {saved ? <p className="form-success" role="status">Отчёт сохранён — он уже появился в разделе поддержки.</p> : null}
        <footer className="bug-report-footer">
          <span>Автор и время сохраняются автоматически.</span>
          <button className="primary-button" type="submit" disabled={saving || saved}>
            {saving ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            {saved ? "Сохранено" : saving ? "Сохраняю" : "Отправить отчёт"}
          </button>
        </footer>
      </form>
    </div>
  );
}

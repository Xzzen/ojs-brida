import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

const BridaDialogContext = createContext(null);

function normalizeOptions(kind, input) {
  const opts = typeof input === 'string' ? { message: input } : { ...(input || {}) };
  const isDestructive = opts.variant === 'destructive';

  const defaultTitle =
    kind === 'alert'
      ? 'Pemberitahuan'
      : kind === 'prompt'
      ? 'Masukkan Informasi'
      : isDestructive
      ? 'Konfirmasi Penghapusan'
      : 'Konfirmasi Tindakan';

  const defaultConfirmText =
    kind === 'alert'
      ? 'Mengerti'
      : kind === 'prompt'
      ? 'Simpan'
      : isDestructive
      ? 'Ya, Hapus'
      : 'Ya, Lanjutkan';

  return {
    kind,
    title: opts.title || defaultTitle,
    message: opts.message || '',
    confirmText: opts.confirmText || defaultConfirmText,
    cancelText: opts.cancelText || 'Batal',
    variant: opts.variant || 'accent',
    placeholder: opts.placeholder || '',
    defaultValue: opts.defaultValue ?? '',
    required: Boolean(opts.required),
    requiredMessage: opts.requiredMessage || 'Kolom ini wajib diisi sebelum melanjutkan.',
    allowBackdropClose:
      typeof opts.allowBackdropClose === 'boolean'
        ? opts.allowBackdropClose
        : kind === 'alert',
    disableEscape: Boolean(opts.disableEscape)
  };
}

/**
 * Provider global untuk dialog kustom OJS BRIDA (pengganti alert, confirm, dan prompt bawaan browser).
 * Mendukung pemanggilan Promise-based yang aman bagi alur sinkron maupun asinkron.
 */
export function BridaDialogProvider({ children }) {
  const queueRef = useRef([]);
  const [active, setActive] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState('');

  const inputRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const enqueueDialog = useCallback((kind, input) => {
    const options = normalizeOptions(kind, input);
    return new Promise((resolve) => {
      const entry = { options, resolve };
      setActive((curr) => {
        if (!curr) {
          setPromptValue(options.defaultValue || '');
          setPromptError('');
          return entry;
        }
        queueRef.current.push(entry);
        return curr;
      });
    });
  }, []);

  const closeActive = useCallback(
    (result) => {
      if (!active) return;
      const { resolve } = active;
      if (queueRef.current.length > 0) {
        const nextItem = queueRef.current.shift();
        setPromptValue(nextItem.options.defaultValue || '');
        setPromptError('');
        setActive(nextItem);
      } else {
        setActive(null);
      }
      resolve(result);
    },
    [active]
  );

  const handleConfirm = useCallback(() => {
    if (!active) return;
    const { options } = active;
    if (options.kind === 'prompt') {
      if (options.required && !promptValue.trim()) {
        setPromptError(options.requiredMessage);
        inputRef.current?.focus();
        return;
      }
      closeActive(promptValue);
      return;
    }
    if (options.kind === 'confirm') {
      closeActive(true);
      return;
    }
    closeActive(undefined);
  }, [active, closeActive, promptValue]);

  const handleCancel = useCallback(() => {
    if (!active) return;
    const { options } = active;
    if (options.kind === 'prompt') {
      closeActive(null);
      return;
    }
    if (options.kind === 'confirm') {
      closeActive(false);
      return;
    }
    closeActive(undefined);
  }, [active, closeActive]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      if (active.options.kind === 'prompt') {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (active.options.kind === 'confirm') {
        cancelBtnRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !active.options.disableEscape) {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, handleCancel]);

  const api = useMemo(
    () => ({
      alert: (input) => enqueueDialog('alert', input),
      confirm: (input) => enqueueDialog('confirm', input),
      prompt: (input) => enqueueDialog('prompt', input)
    }),
    [enqueueDialog]
  );

  const opts = active?.options;
  const isDestructive = opts?.variant === 'destructive';

  return (
    <BridaDialogContext.Provider value={api}>
      {children}

      {active && opts && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-backdrop-fade"
          onClick={() => {
            if (opts.allowBackdropClose) handleCancel();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="brida-dialog-title"
            aria-describedby="brida-dialog-message"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white border border-[#D4D4D8] shadow-[0_24px_60px_-15px_rgba(17,24,39,0.32)] overflow-hidden animate-modal-pop"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isDestructive
                      ? 'bg-[#FCEEEF] border-[#E0B6BC] text-[#7F1D28]'
                      : 'bg-[#FDF2F2] border-[#DFBABA] text-[#7A2222]'
                  }`}
                >
                  {isDestructive ? (
                    <AlertTriangle size={19} />
                  ) : opts.kind === 'alert' ? (
                    <Info size={19} />
                  ) : (
                    <HelpCircle size={19} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      id="brida-dialog-title"
                      className="text-base font-bold text-[#111827] leading-snug"
                    >
                      {opts.title}
                    </h3>
                    {!opts.disableEscape && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        aria-label="Tutup dialog"
                        className="p-1 -mr-1 -mt-1 rounded-lg text-[#525252] hover:text-[#111827] hover:bg-[#F4F4F5] transition cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <p
                    id="brida-dialog-message"
                    className="mt-1.5 text-xs sm:text-[13px] font-normal text-[#374151] leading-relaxed whitespace-pre-line break-words"
                  >
                    {opts.message}
                  </p>
                </div>
              </div>

              {opts.kind === 'prompt' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleConfirm();
                  }}
                  className="space-y-1.5 pt-1"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={promptValue}
                    onChange={(e) => {
                      setPromptValue(e.target.value);
                      if (promptError) setPromptError('');
                    }}
                    placeholder={opts.placeholder}
                    className="w-full rounded-xl border border-[#D4D4D8] bg-[#FAFAFA] focus:bg-white focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/12 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#111827] placeholder:text-[#6B7280] placeholder:font-normal outline-none transition"
                  />
                  {promptError && (
                    <p className="text-[11px] font-semibold text-[#7F1D28]">{promptError}</p>
                  )}
                </form>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#E4E4E7]">
                {opts.kind !== 'alert' && (
                  <button
                    ref={cancelBtnRef}
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl border border-[#D4D4D8] bg-white hover:bg-[#F4F4F5] text-xs font-semibold text-[#374151] transition duration-150 cursor-pointer"
                  >
                    {opts.cancelText}
                  </button>
                )}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={handleConfirm}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition duration-150 active:scale-[0.98] cursor-pointer shadow-[0_6px_14px_-6px_rgba(122,34,34,0.45)] ${
                    isDestructive
                      ? 'bg-[#882832] hover:bg-[#6E1F27]'
                      : 'bg-[#7A2222] hover:bg-[#5E1818]'
                  }`}
                >
                  {opts.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BridaDialogContext.Provider>
  );
}

/**
 * Hook untuk menampilkan dialog alert/confirm/prompt kustom OJS BRIDA.
 */
export function useBridaDialog() {
  const ctx = useContext(BridaDialogContext);
  if (!ctx) {
    throw new Error('useBridaDialog harus digunakan di dalam BridaDialogProvider.');
  }
  return ctx;
}

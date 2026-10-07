"use client";

import { ChangeEvent, useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ArrowRotate from "reicon-react/icons/ArrowRotate";
import Box from "reicon-react/icons/Box";
import Box2 from "reicon-react/icons/Box2";
import Box3 from "reicon-react/icons/Box3";
import Calculator from "reicon-react/icons/Calculator";
import CartCheck from "reicon-react/icons/CartCheck";
import Check from "reicon-react/icons/Check";
import ChevronDown from "reicon-react/icons/ChevronDown";
import CloseCircle from "reicon-react/icons/CloseCircle";
import Document from "reicon-react/icons/Document";
import FileText from "reicon-react/icons/FileText";
import Fullscreen from "reicon-react/icons/Fullscreen";
import InfoCircle from "reicon-react/icons/InfoCircle";
import Layer from "reicon-react/icons/Layer";
import Pause from "reicon-react/icons/Pause";
import Play from "reicon-react/icons/Play";
import Ruler from "reicon-react/icons/Ruler";
import Upload from "reicon-react/icons/Upload";

import { LocaleContext } from "./locale-context";
import { buildQuoteText, dictionaries, formatFoldProgress, formatMoney, formatNumber, formatQuantity, formatQuantityBasis, LOCALE_COOKIE, type Locale } from "./i18n";

function PreviewLoading() {
  const locale = useContext(LocaleContext);
  return <div className="preview-loading" role="status">{dictionaries[locale].copy.loading}</div>;
}

const BoxPreview = dynamic(() => import("./BoxPreview"), {
  ssr: false,
  loading: () => <PreviewLoading />,
});

type BoxType = "mailer" | "shipping" | "drawer";
type Paper = "kraft" | "white" | "green";
type PrintType = "none" | "one" | "full";
type ViewMode = "closed" | "open" | "dieline" | "folding";
type ViewTabMode = Exclude<ViewMode, "folding">;

type Asset = {
  name: string;
  type: "AI" | "PDF";
  size: string;
};

const boxTypeOptions = [
  { id: "mailer", icon: Box3 },
  { id: "shipping", icon: Box },
  { id: "drawer", icon: Box2 },
] as const;

const materialOptions = [
  { id: "kraft", swatch: "#C99B62" },
  { id: "white", swatch: "#F2EFE8" },
  { id: "green", swatch: "#C8E6CD" },
] as const;

export default function BoxStudio({ initialLocale = "ko" }: { initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = dictionaries[locale];
  const boxTypes = boxTypeOptions.map((item) => ({ ...item, ...t.boxes[item.id] }));
  const materials = materialOptions.map((item) => ({ ...item, ...t.materials[item.id] }));
  const numberFormatter = { format: (value: number) => formatNumber(value, locale) };
  const money = (value: number) => formatMoney(value, locale);
  const quantityLabel = (value: number) => formatQuantity(value, locale);
  const [boxType, setBoxType] = useState<BoxType>("mailer");
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [foldProgress, setFoldProgress] = useState(1);
  const [paper, setPaper] = useState<Paper>("kraft");
  const [printType, setPrintType] = useState<PrintType>("one");
  const [width, setWidth] = useState(240);
  const [depth, setDepth] = useState(160);
  const [height, setHeight] = useState(90);
  const [quantity, setQuantity] = useState(500);
  const [coating, setCoating] = useState(false);
  const [express, setExpress] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewResetKey, setViewResetKey] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([
    { name: "brand_graphic_v4.ai", type: "AI", size: "2.8 MB" },
    { name: "mailer_G240.pdf", type: "PDF", size: "428 KB" },
  ]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.meta.description);
    for (const property of ["og:title", "twitter:title"]) {
      document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.setAttribute("content", t.meta.title);
    }
    for (const property of ["og:description", "twitter:description"]) {
      document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.setAttribute("content", t.meta.description);
    }
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", locale === "en" ? "en_US" : "ko_KR");
    document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  }, [locale, t.meta.title, t.meta.description]);

  useEffect(() => {
    if (!quoteOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    modal?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQuoteOpen(false);
      if (event.key !== "Tab" || !modal) return;
      const controls = Array.from(modal.querySelectorAll<HTMLElement>("button, [href], input, select, [tabindex='0']"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [quoteOpen]);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState(window.history.state, "", url);
  };

  const quote = useMemo(() => {
    const volumeFactor = (width * depth * height) / 1_000_000;
    const typeFactor = { mailer: 1.14, shipping: 0.92, drawer: 1.42 }[boxType];
    const paperFactor = { kraft: 1, white: 1.16, green: 1.1 }[paper];
    const printUnit = { none: 0, one: 92, full: 278 }[printType];
    const finishUnit = coating ? 64 : 0;
    const discount =
      quantity >= 2000
        ? 0.68
        : quantity >= 1000
          ? 0.76
          : quantity >= 500
            ? 0.84
            : 1;
    const rawUnit =
      (310 + volumeFactor * 6.3) * typeFactor * paperFactor +
      printUnit +
      finishUnit;
    const unit = Math.max(420, Math.round((rawUnit * discount) / 10) * 10);
    const plate = printType === "none" ? 0 : printType === "one" ? 55000 : 132000;
    const die = 88000;
    const production = unit * quantity;
    const rush = express ? Math.round((production + plate + die) * 0.12) : 0;
    const subtotal = production + plate + die + rush;
    return {
      unit,
      plate,
      die,
      production,
      rush,
      subtotal,
      vat: Math.round(subtotal * 0.1),
      total: Math.round(subtotal * 1.1),
    };
  }, [
    width,
    depth,
    height,
    boxType,
    paper,
    printType,
    coating,
    quantity,
    express,
  ]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const type = file.name.toLowerCase().endsWith(".ai") ? "AI" : "PDF";
    setAssets((current) => [
      ...current,
      {
        name: file.name,
        type,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      },
    ]);
    event.target.value = "";
  };

  const openFullscreen = () => {
    stageRef.current?.requestFullscreen?.();
  };

  const handleViewModeChange = (mode: ViewTabMode) => {
    setViewMode(mode);
    setFoldProgress(mode === "dieline" ? 0 : 1);
  };

  const handleFoldProgressChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextProgress = Number(event.target.value) / 100;
    setFoldProgress(nextProgress);
    setViewMode(
      nextProgress === 0 ? "dieline" : nextProgress === 1 ? "closed" : "folding",
    );
  };

  const handleBoxTypeChange = (nextBoxType: BoxType) => {
    setBoxType(nextBoxType);
  };

  const downloadQuote = () => {
    const quoteText = buildQuoteText(locale, {
      boxType, paper, width, depth, height, quantity, unit: quote.unit, total: quote.total,
    });
    const url = URL.createObjectURL(
      new Blob([quoteText], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `formbox-quote-${locale}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setQuoteOpen(false);
  };

  return (
    <LocaleContext.Provider value={locale}>
    <main className="studio-shell">
      <header className="studio-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>FORMBOX</span>
          <span className="brand-tag">BETA</span>
        </div>
        <div className="project-title">
          <strong>
            {t.copy.project} · {boxTypes.find((item) => item.id === boxType)?.name}
          </strong>
          <span><Check size={14} aria-hidden="true" /> {t.copy.session}</span>
        </div>
        <nav className="header-actions" aria-label={t.copy.projectMenu}>
          <div className="language-switch" role="group" aria-label={t.copy.language}>
            <button type="button" lang="ko" aria-label={t.copy.switchKorean} aria-pressed={locale === "ko"} onClick={() => changeLocale("ko")}>KO</button>
            <button type="button" lang="en" aria-label={t.copy.switchEnglish} aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
          </div>
          <button className="plain-button" disabled title={t.copy.demoControl}>{t.copy.library}</button>
          <button className="pill-button light" disabled title={t.copy.demoControl}>
            <FileText size={18} aria-hidden="true" />
            {t.copy.quotes}
          </button>
          <button
            className="avatar-button"
            aria-label={t.copy.userMenu}
            title={t.copy.demoControl}
            disabled
          >
            BF
          </button>
        </nav>
      </header>

      <div className="workflow-bar">
        <div className="workflow-step done"><span>1</span> {t.copy.chooseBox}</div>
        <div className="workflow-line active" />
        <div className="workflow-step active"><span>2</span> {t.copy.configure}</div>
        <div className="workflow-line" />
        <div className="workflow-step"><span>3</span> {t.copy.reviewQuote}</div>
      </div>

      <section className="workspace">
        <aside className="template-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">BOX TYPE</span>
              <h1>{t.copy.boxShape}</h1>
            </div>
            <button className="round-button" aria-label={t.copy.boxShapeHelp} title={t.copy.boxShapeDetail}>
              <InfoCircle size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="type-list">
            {boxTypes.map((item) => {
              const Icon = item.icon;
              const selected = boxType === item.id;
              return (
                <button
                  key={item.id}
                  className={`type-card ${selected ? "selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => handleBoxTypeChange(item.id)}
                >
                  <span className="type-icon">
                    <Icon
                      size={26}
                      weight={selected ? "Filled" : "Outline"}
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </span>
                  {selected ? (
                    <span className="selected-dot"><Check size={12} aria-hidden="true" /></span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="asset-section">
            <div className="asset-title">
              <span>{t.copy.drawings}</span>
              <span className="asset-count">{assets.length}</span>
            </div>
            <p>{t.copy.drawingsNote}</p>
            <div className="asset-list">
              {assets.map((asset, index) => (
                <div className="asset-row" key={`${asset.name}-${index}`}>
                  <span className={`file-badge ${asset.type.toLowerCase()}`}>
                    <Document size={15} aria-hidden="true" />
                  </span>
                  <span className="asset-name">
                    <strong>{asset.name}</strong>
                    <small>{asset.type} · {asset.size}</small>
                  </span>
                  <span className="asset-ok"><Check size={13} aria-hidden="true" /></span>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept=".ai,.pdf,application/pdf"
              aria-label={t.copy.drawingInput}
              onChange={handleFile}
            />
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={17} aria-hidden="true" />
              {t.copy.addDrawing}
            </button>
          </div>
        </aside>

        <section className="preview-panel" ref={stageRef}>
          <div className="preview-topbar">
            <div className="view-tabs" role="tablist" aria-label={t.copy.viewModes}>
              {([
                ["closed", t.views.closed],
                ["open", t.views.open],
                ["dieline", t.views.dieline],
              ] as Array<[ViewTabMode, string]>).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={viewMode === id}
                  className={viewMode === id ? "active" : ""}
                  onClick={() => handleViewModeChange(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="preview-actions">
              <button
                className={`round-button ${autoRotate ? "active" : ""}`}
                onClick={() => setAutoRotate((value) => !value)}
                aria-label={autoRotate ? t.copy.stopRotate : t.copy.startRotate}
                title={autoRotate ? t.copy.stopRotate : t.copy.startRotate}
              >
                {autoRotate ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
              </button>
              <button
                className="round-button"
                onClick={() => {
                  if (viewMode === "dieline") handleViewModeChange("open");
                  setViewResetKey((value) => value + 1);
                }}
                aria-label={t.copy.resetView}
                title={t.copy.resetView}
              >
                <ArrowRotate size={18} aria-hidden="true" />
              </button>
              <button
                className="round-button"
                onClick={openFullscreen}
                aria-label={t.copy.fullscreen}
                title={t.copy.fullscreen}
              >
                <Fullscreen size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={`stage-canvas ${boxType === "mailer" ? "mailer-preview" : ""}`}>
            <div className="grid-floor" aria-hidden="true" />
            <BoxPreview
              boxType={boxType}
              locale={locale}
              width={width}
              depth={depth}
              height={height}
              mode={viewMode}
              paper={paper}
              print={printType}
              autoRotate={autoRotate}
              foldProgress={foldProgress}
              viewResetKey={viewResetKey}
              onManualRotate={() => setAutoRotate(false)}
            />
            <div className="fold-progress-control">
              <div className="fold-progress-heading">
                <label htmlFor="box-fold-progress">
                  <Layer size={15} aria-hidden="true" />
                  {t.copy.foldProgress}
                </label>
                <output htmlFor="box-fold-progress">
                  {viewMode === "open"
                    ? t.openStatus[boxType]
                    : `${Math.round(foldProgress * 100)}%`}
                </output>
              </div>
              <input
                id="box-fold-progress"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(foldProgress * 100)}
                onChange={handleFoldProgressChange}
                aria-valuetext={viewMode === "open"
                  ? t.openStatusAria[boxType]
                  : formatFoldProgress(Math.round(foldProgress * 100), locale)}
                aria-describedby="box-fold-endpoints"
                style={{
                  background: `linear-gradient(to right, var(--mint-deep) 0 ${foldProgress * 100}%, rgba(37, 95, 74, 0.18) ${foldProgress * 100}% 100%)`,
                }}
              />
              <div
                className="fold-progress-endpoints"
                id="box-fold-endpoints"
              >
                <span>{t.views.dieline}</span>
                <span>{t.views.closed}</span>
              </div>
            </div>
            <div className="dimension dimension-width">
              <span />
              <b>{width} mm</b>
              <span />
            </div>
            <div className="dimension dimension-height">
              <span />
              <b>{height} mm</b>
              <span />
            </div>
          </div>

          <div className="preview-footer">
            <div>
              <span className="material-chip">
                <i style={{ background: materials.find((item) => item.id === paper)?.swatch }} />
                {materials.find((item) => item.id === paper)?.label}
              </span>
              <span className="scale-chip">{t.copy.scaled}</span>
            </div>
            <p>
              <Layer size={16} aria-hidden="true" />
              {boxType === "mailer"
                ? t.copy.mailerHinges
                : t.copy.sharedHinges}
            </p>
          </div>
        </section>

        <aside className="config-panel">
          <div className="config-scroll">
            <div className="config-header">
              <div>
                <span className="eyebrow">CONFIGURATION</span>
                <h2>{t.copy.configure}</h2>
              </div>
              <span className="live-badge"><i /> {t.copy.live}</span>
            </div>

            <section className="config-section">
              <div className="section-title">
                <span className="section-number">01</span>
                <strong>{t.copy.internalSize}</strong>
                <Ruler size={17} aria-hidden="true" />
              </div>
              <div className="dimension-inputs">
                {[
                  [t.copy.width, width, setWidth],
                  [t.copy.depth, depth, setDepth],
                  [t.copy.height, height, setHeight],
                ].map(([label, value, setter]) => (
                  <label key={label as string}>
                    <span>{label as string}</span>
                    <span className="input-wrap">
                      <input
                        type="number"
                        min="40"
                        max="1000"
                        value={value as number}
                        onChange={(event) =>
                          (setter as (value: number) => void)(
                            Math.min(
                              1000,
                              Math.max(40, Number(event.target.value)),
                            ),
                          )
                        }
                      />
                      <small>mm</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="config-section">
              <div className="section-title">
                <span className="section-number">02</span>
                <strong>{t.copy.material}</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <div className="material-list">
                {materials.map((item) => (
                  <button
                    key={item.id}
                    className={`material-option ${paper === item.id ? "selected" : ""}`}
                    aria-pressed={paper === item.id}
                    onClick={() => setPaper(item.id)}
                  >
                    <i style={{ background: item.swatch }} />
                    <span><strong>{item.label}</strong><small>{item.sub}</small></span>
                    <span className="radio-mark">{paper === item.id ? <Check size={12} aria-hidden="true" /> : null}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="config-section">
              <div className="section-title">
                <span className="section-number">03</span>
                <strong>{t.copy.printFinish}</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <div className="segmented-options">
                {([
                  ["none", t.printing.none],
                  ["one", t.printing.one],
                  ["full", t.printing.full],
                ] as Array<[PrintType, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    className={printType === id ? "selected" : ""}
                    aria-pressed={printType === id}
                    onClick={() => setPrintType(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={coating}
                  onChange={(event) => setCoating(event.target.checked)}
                />
                <span className="custom-check">{coating ? <Check size={13} aria-hidden="true" /> : null}</span>
                <span><strong>{t.copy.matte}</strong><small>{t.copy.matteNote}</small></span>
                <b>+{money(64)}</b>
              </label>
            </section>

            <section className="config-section last">
              <div className="section-title">
                <span className="section-number">04</span>
                <strong>{t.copy.quantityLeadTime}</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <div className="quantity-row">
                <label>
                  <span>{t.copy.quantity}</span>
                  <select
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                  >
                    <option value="100">{quantityLabel(100)}</option>
                    <option value="300">{quantityLabel(300)}</option>
                    <option value="500">{quantityLabel(500)}</option>
                    <option value="1000">{quantityLabel(1000)}</option>
                    <option value="2000">{quantityLabel(2000)}</option>
                  </select>
                </label>
                <label>
                  <span>{t.copy.leadTime}</span>
                  <select
                    value={express ? "express" : "standard"}
                    onChange={(event) => setExpress(event.target.value === "express")}
                  >
                    <option value="standard">{t.copy.standard}</option>
                    <option value="express">{t.copy.express}</option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <div className="quote-card">
            <div className="quote-label">
              <span><Calculator size={18} aria-hidden="true" /> {t.copy.estimate}</span>
              <small>{t.copy.vatCurrency}</small>
            </div>
            <div className="unit-price">
              <span>{t.copy.unit} <b>{money(quote.unit)}</b></span>
              <small>{formatQuantityBasis(quantity, locale)}</small>
            </div>
            <div className="quote-total">
              <strong>{numberFormatter.format(quote.total)}</strong>
              <span>{t.copy.currencyUnit}</span>
            </div>
            <div className="quote-details">
              <span>{t.copy.productionCost} <b>{money(quote.production)}</b></span>
              <span>{t.copy.tooling} <b>{money(quote.die + quote.plate)}</b></span>
            </div>
            <button className="quote-button" onClick={() => setQuoteOpen(true)}>
              <CartCheck size={20} aria-hidden="true" />
              {t.copy.getQuote}
            </button>
          </div>
        </aside>
      </section>

      {quoteOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setQuoteOpen(false)}>
          <section
            className="quote-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setQuoteOpen(false)}
              aria-label={t.copy.closeQuote}
            >
              <CloseCircle size={24} aria-hidden="true" />
            </button>
            <span className="modal-kicker"><Check size={14} aria-hidden="true" /> {t.copy.quoteReady}</span>
            <h2 id="quote-modal-title">{t.copy.quoteTitle}</h2>
            <p>{t.copy.quoteDescription}</p>
            <div className="modal-summary">
              <div><span>{t.copy.box}</span><strong>{boxTypes.find((item) => item.id === boxType)?.name}</strong></div>
              <div><span>{t.copy.dimensions}</span><strong>{width} × {depth} × {height} mm</strong></div>
              <div><span>{t.copy.quantity}</span><strong>{quantityLabel(quantity)}</strong></div>
              <div><span>{t.copy.total}</span><strong>{money(quote.total)}</strong></div>
            </div>
            <button className="modal-primary" onClick={downloadQuote}>
              <Document size={19} aria-hidden="true" />
              {t.copy.saveQuote}
            </button>
            <small className="modal-note">{t.copy.quoteNote}</small>
          </section>
        </div>
      ) : null}
    </main>
    </LocaleContext.Provider>
  );
}

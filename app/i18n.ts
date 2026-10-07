export type Locale = "ko" | "en";
export type BoxType = "mailer" | "shipping" | "drawer";
export type Paper = "kraft" | "white" | "green";
export type PrintType = "none" | "one" | "full";

export const LOCALE_COOKIE = "formbox-locale";
export const LOCALE_HEADER = "x-formbox-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "ko" || value === "en";
}

export function resolveLocale(query: unknown, saved: unknown): Locale {
  return isLocale(query) ? query : isLocale(saved) ? saved : "ko";
}

const ko = {
  meta: {
    title: "FORMBOX — 3D 박스 실시간 견적",
    description: "박스 형태와 사양을 고르면 3D 결과와 예상 제작 견적을 즉시 확인할 수 있습니다. 한국어와 영어로 이용할 수 있는 패키지 구성 데모입니다.",
    imageAlt: "FORMBOX 3D 박스 구성기와 예상 견적",
  },
  boxes: {
    mailer: { name: "G형 택배박스", detail: "0427 계열 · 롤엔드", previewName: "G형 롤엔드 택배박스" },
    shipping: { name: "A형 골판지박스", detail: "0201 계열 · 접착식", previewName: "A형 골판지박스" },
    drawer: { name: "서랍형 패키지", detail: "트레이 + 슬리브 · 2매", previewName: "서랍형 패키지" },
  },
  materials: {
    kraft: { label: "KLB 크라프트", sub: "E골 · 1.5 mm" },
    white: { label: "화이트보드", sub: "E골 · 1.5 mm" },
    green: { label: "그린보드", sub: "F골 · 1.2 mm" },
  },
  views: { closed: "완성", open: "열림", dieline: "전개도", folding: "접힘" },
  printing: { none: "무지", one: "1도 인쇄", full: "4도 컬러" },
  openStatus: {
    mailer: "몸체 완성 · 뚜껑 열림",
    shipping: "몸체 완성 · 상부 열림",
    drawer: "트레이 완성 · 서랍 열림",
  },
  openStatusAria: {
    mailer: "몸체 완성, 뚜껑만 열림",
    shipping: "몸체와 바닥 완성, 상부 플랩 열림",
    drawer: "트레이와 슬리브 완성, 서랍 열림",
  },
  copy: {
    loading: "3D 모델을 준비하고 있어요",
    project: "오브젝트 패키지",
    session: "데모 · 현재 세션에서만 유지",
    projectMenu: "프로젝트 메뉴",
    library: "도면 라이브러리",
    quotes: "견적 목록",
    userMenu: "사용자 메뉴",
    demoControl: "데모에서는 제공되지 않는 기능입니다",
    language: "언어 선택",
    switchKorean: "한국어로 전환",
    switchEnglish: "영어로 전환",
    currencyUnit: "원",
    chooseBox: "박스 선택",
    configure: "사양 설정",
    reviewQuote: "견적 확인",
    boxShape: "박스 형태",
    boxShapeHelp: "박스 형태 안내",
    boxShapeDetail: "롤엔드 택배박스, 골판지박스, 서랍형 패키지를 선택할 수 있습니다.",
    drawings: "도면 파일",
    drawingsNote: "데모용 파일 목록입니다. 추가한 파일은 현재 세션에서만 표시됩니다.",
    addDrawing: "도면 추가",
    drawingInput: "AI 또는 PDF 도면 파일 선택",
    viewModes: "박스 보기 모드",
    stopRotate: "자동 회전 멈추기",
    startRotate: "자동 회전 시작",
    resetView: "3D 보기 초기화",
    fullscreen: "전체 화면",
    foldProgress: "접힘 진행",
    scaled: "치수 비례 유지",
    mailerHinges: "롤엔드 전개도와 3D가 동일한 힌지로 연결됩니다",
    sharedHinges: "전개도와 완성 상태가 동일한 접힘선으로 연결됩니다",
    live: "실시간 반영",
    internalSize: "내부 사이즈",
    width: "가로",
    depth: "세로",
    height: "높이",
    material: "재질",
    printFinish: "인쇄 · 후가공",
    matte: "무광 코팅",
    matteNote: "표면 보호와 차분한 질감을 더합니다.",
    quantityLeadTime: "수량 · 납기",
    quantity: "제작 수량",
    leadTime: "납기",
    standard: "일반 · 10일",
    express: "빠른 · 6일",
    estimate: "예상 견적",
    vatCurrency: "VAT 포함 · KRW",
    unit: "개당",
    productionCost: "박스 제작비",
    tooling: "목형 · 인쇄판",
    getQuote: "견적서 확인",
    closeQuote: "견적서 닫기",
    quoteReady: "견적 계산 완료",
    quoteTitle: "예상 견적이 준비됐어요.",
    quoteDescription: "선택한 옵션을 기준으로 데모 견적서를 만들었습니다.",
    box: "박스",
    dimensions: "규격",
    total: "예상 총액",
    saveQuote: "견적서 저장",
    quoteNote: "실제 제작 가능 여부와 최종 금액은 도면 검토 후 확정됩니다.",
    quoteDocument: "FORMBOX 예상 견적서 (데모)",
    estimatedUnit: "개당 예상 단가",
    totalWithVat: "예상 총액(VAT 포함)",
    currencyNote: "모든 금액은 한국 원화(KRW)이며 환율이 적용되지 않습니다.",
  },
};

type TextShape<T> = { [K in keyof T]: T[K] extends string ? string : TextShape<T[K]> };
export type Dictionary = TextShape<typeof ko>;

const en: Dictionary = {
  meta: {
    title: "FORMBOX — 3D Box Configurator & Instant Estimates",
    description: "Explore box styles, dimensions, materials, and folding in 3D with instant estimated production costs. A packaging configurator demo in English and Korean.",
    imageAlt: "FORMBOX 3D box configurator and estimated production costs",
  },
  boxes: {
    mailer: { name: "Roll-end mailer", detail: "0427 style · Roll-end", previewName: "roll-end mailer box" },
    shipping: { name: "Corrugated shipper", detail: "0201 style · Glued seam", previewName: "corrugated shipping box" },
    drawer: { name: "Drawer package", detail: "Tray + sleeve · 2 pieces", previewName: "drawer package" },
  },
  materials: {
    kraft: { label: "KLB kraft", sub: "E-flute · 1.5 mm" },
    white: { label: "White board", sub: "E-flute · 1.5 mm" },
    green: { label: "Green board", sub: "F-flute · 1.2 mm" },
  },
  views: { closed: "Assembled", open: "Open", dieline: "Dieline", folding: "Folding" },
  printing: { none: "Unprinted", one: "1 color", full: "4 colors" },
  openStatus: {
    mailer: "Body assembled · Lid open",
    shipping: "Body assembled · Top open",
    drawer: "Tray assembled · Drawer open",
  },
  openStatusAria: {
    mailer: "Body assembled with only the lid open",
    shipping: "Body and base assembled with the top flaps open",
    drawer: "Tray and sleeve assembled with the drawer open",
  },
  copy: {
    loading: "Preparing your 3D model",
    project: "Object packaging",
    session: "Demo · Changes last this session",
    projectMenu: "Project menu",
    library: "Dieline library",
    quotes: "Quotes",
    userMenu: "User menu",
    demoControl: "This feature is unavailable in the demo",
    language: "Choose language",
    switchKorean: "Switch to Korean",
    switchEnglish: "Switch to English",
    currencyUnit: "KRW",
    chooseBox: "Choose a box",
    configure: "Configure",
    reviewQuote: "Review estimate",
    boxShape: "Box style",
    boxShapeHelp: "About box styles",
    boxShapeDetail: "Choose a roll-end mailer, corrugated shipping box, or drawer package.",
    drawings: "Dieline files",
    drawingsNote: "Demo file list. Added files appear in this session only.",
    addDrawing: "Add a dieline",
    drawingInput: "Choose an AI or PDF dieline file",
    viewModes: "Box view modes",
    stopRotate: "Pause auto-rotation",
    startRotate: "Start auto-rotation",
    resetView: "Reset 3D view",
    fullscreen: "Full screen",
    foldProgress: "Fold progress",
    scaled: "Dimensions to scale",
    mailerHinges: "The roll-end dieline and 3D model share the same hinges",
    sharedHinges: "The dieline and assembled box share the same fold lines",
    live: "Live preview",
    internalSize: "Internal dimensions",
    width: "Width",
    depth: "Depth",
    height: "Height",
    material: "Material",
    printFinish: "Printing & finish",
    matte: "Matte coating",
    matteNote: "Adds surface protection and a soft finish.",
    quantityLeadTime: "Quantity & lead time",
    quantity: "Quantity",
    leadTime: "Lead time",
    standard: "Standard · 10 days",
    express: "Express · 6 days",
    estimate: "Estimated cost",
    vatCurrency: "VAT incl. · KRW",
    unit: "Per box",
    productionCost: "Box production",
    tooling: "Die & print plates",
    getQuote: "View estimate",
    closeQuote: "Close estimate",
    quoteReady: "Estimate calculated",
    quoteTitle: "Your estimate is ready.",
    quoteDescription: "A demo estimate based on your selected options.",
    box: "Box",
    dimensions: "Dimensions",
    total: "Estimated total",
    saveQuote: "Save estimate",
    quoteNote: "Manufacturability and final pricing require a dieline review.",
    quoteDocument: "FORMBOX estimated quote (demo)",
    estimatedUnit: "Estimated unit price",
    totalWithVat: "Estimated total (VAT included)",
    currencyNote: "All prices are in South Korean won (KRW). No currency conversion is applied.",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { ko, en };

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR").format(value);
}

export function formatMoney(value: number, locale: Locale): string {
  return `${formatNumber(value, locale)}${locale === "en" ? " KRW" : "원"}`;
}

export function formatQuantity(value: number, locale: Locale): string {
  return `${formatNumber(value, locale)}${locale === "en" ? " boxes" : "개"}`;
}

export function formatQuantityBasis(value: number, locale: Locale): string {
  const quantity = formatQuantity(value, locale);
  return locale === "en" ? `For ${quantity}` : `${quantity} 기준`;
}

export function formatFoldProgress(percent: number, locale: Locale): string {
  return locale === "en" ? `${percent}% folded` : `${percent}% 접힘`;
}

export function previewLabel(
  locale: Locale,
  boxType: BoxType,
  dimensions: readonly [number, number, number],
  mode: "closed" | "open" | "dieline" | "folding",
  foldProgress: number,
): string {
  const t = dictionaries[locale];
  const size = dimensions.join(" × ");
  const state = mode === "folding" ? formatFoldProgress(Math.round(foldProgress * 100), locale) : t.views[mode];
  return locale === "en"
    ? `${size} millimeter ${t.boxes[boxType].previewName}, ${state.toLowerCase()} view`
    : `${size} 밀리미터 ${t.boxes[boxType].previewName}의 ${state} 상태`;
}

export function buildQuoteText(locale: Locale, quote: {
  boxType: BoxType;
  paper: Paper;
  width: number;
  depth: number;
  height: number;
  quantity: number;
  unit: number;
  total: number;
}): string {
  const t = dictionaries[locale];
  return [
    t.copy.quoteDocument,
    `${t.copy.box}: ${t.boxes[quote.boxType].name}`,
    `${t.copy.dimensions}: ${quote.width} × ${quote.depth} × ${quote.height} mm`,
    `${t.copy.material}: ${t.materials[quote.paper].label}`,
    `${t.copy.quantity}: ${formatQuantity(quote.quantity, locale)}`,
    `${t.copy.estimatedUnit}: ${formatMoney(quote.unit, locale)}`,
    `${t.copy.totalWithVat}: ${formatMoney(quote.total, locale)}`,
    "",
    t.copy.currencyNote,
    t.copy.quoteNote,
  ].join("\n");
}

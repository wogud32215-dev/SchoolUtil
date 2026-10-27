import type {
  AccentCard,
  AppSettings,
  AppTheme,
  BackgroundFill,
  CardTexture,
  FontFamilySetting,
  FontWeightLevel,
  UiDensity,
} from "@/types/state";
import { FONT_WEIGHT_LEVEL_OPTIONS } from "@/utils/fontWeightLevel";
import { SettingsRow } from "@/components/settings/SettingsRow";
import {
  BACKGROUND_FILL_OPTIONS,
  clampCardOpacity,
  themeDefaultCardOpacity,
} from "@/utils/designAppearance";

const THEME_SWATCHES: { id: AppTheme; label: string }[] = [
  { id: "sky", label: "하늘" },
  { id: "paper", label: "종이" },
  { id: "mint", label: "민트" },
  { id: "sand", label: "모래" },
  { id: "slate", label: "슬레이트" },
  { id: "pink", label: "분홍" },
  { id: "coral", label: "산호" },
  { id: "blue", label: "파랑" },
  { id: "green", label: "초록" },
  { id: "dark", label: "나이트" },
];

const TEXTURE_OPTIONS: { id: CardTexture; label: string }[] = [
  { id: "glass", label: "기본" },
  { id: "paper", label: "지면" },
  { id: "memo", label: "메모지" },
  { id: "whiteboard", label: "화이트보드" },
  { id: "chalkboard", label: "칠판" },
  { id: "terminal", label: "터미널" },
];

const DENSITY_OPTIONS: { id: UiDensity; label: string }[] = [
  { id: "cozy", label: "넉넉" },
  { id: "normal", label: "보통" },
  { id: "compact", label: "촘촘" },
];

const ACCENT_CARD_OPTIONS: { id: AccentCard; label: string }[] = [
  { id: "none", label: "없음" },
  { id: "clock", label: "시계" },
  { id: "weather", label: "날씨" },
];

type Props = {
  settings: AppSettings;
  onDesignSave: (settings: AppSettings) => Promise<boolean>;
};

export function DesignSettingsSection({ settings, onDesignSave }: Props) {
  async function applyTheme(theme: AppTheme) {
    if (theme === settings.theme) return;
    await onDesignSave({ ...settings, theme });
  }

  async function applyFont(fontFamily: FontFamilySetting) {
    if (fontFamily === settings.fontFamily) return;
    await onDesignSave({ ...settings, fontFamily });
  }

  async function applyFontWeight(level: FontWeightLevel) {
    if (level === (settings.fontWeightLevel ?? "medium")) return;
    await onDesignSave({ ...settings, fontWeightLevel: level });
  }

  async function applyDensity(uiDensity: UiDensity) {
    if (uiDensity === settings.uiDensity) return;
    await onDesignSave({ ...settings, uiDensity });
  }

  async function applyTexture(cardTexture: CardTexture) {
    if (cardTexture === settings.cardTexture) return;
    await onDesignSave({ ...settings, cardTexture });
  }

  async function applyAccentCard(accentCard: AccentCard) {
    if (accentCard === settings.accentCard) return;
    await onDesignSave({ ...settings, accentCard });
  }

  async function toggleDesignPeek() {
    await onDesignSave({ ...settings, designPeek: !settings.designPeek });
  }

  async function applyCardOpacity(cardOpacity: number) {
    const next = clampCardOpacity(cardOpacity);
    if (next === settings.cardOpacity) return;
    await onDesignSave({ ...settings, cardOpacity: next });
  }

  async function applyBackgroundFill(backgroundFill: BackgroundFill) {
    if (backgroundFill === settings.backgroundFill) return;
    await onDesignSave({ ...settings, backgroundFill });
  }

  const themeDefaultOpacity = themeDefaultCardOpacity(settings.theme);

  return (
    <section className="settings-tab-pane" aria-label="디자인">
      <div className="settings-peek-banner">
        <button
          type="button"
          className={`design-peek-toggle${settings.designPeek ? " is-on" : ""}`}
          aria-pressed={settings.designPeek}
          onClick={() => void toggleDesignPeek()}
        >
          바탕화면 보면서 고르기
        </button>
        <p className="settings-row-hint">
          창이 오른쪽 위로 작아지며 카드·바탕화면을 함께 볼 수 있습니다. 색·질감은
          누르면 바로 저장됩니다.
        </p>
      </div>

      <SettingsRow title="색상">
        <div className="design-swatch-row" role="radiogroup" aria-label="테마 색">
          {THEME_SWATCHES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="design-swatch"
              data-theme-id={id}
              role="radio"
              aria-checked={settings.theme === id}
              aria-label={label}
              title={label}
              onClick={() => void applyTheme(id)}
            />
          ))}
        </div>
      </SettingsRow>

      <SettingsRow
        title="카드 질감"
        hint="유리·지면·메모지 등 카드 표면 느낌을 바꿉니다."
      >
        <div
          className="design-option-row"
          role="radiogroup"
          aria-label="카드 질감"
        >
          {TEXTURE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="design-chip"
              role="radio"
              aria-checked={settings.cardTexture === id}
              onClick={() => void applyTexture(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow
        title="카드 진하기"
        hint="100%면 카드가 불투명합니다. 낮추면 바탕이 더 비치고 블러가 조금 강해집니다."
      >
        <div className="settings-opacity-control">
          <input
            type="range"
            className="settings-opacity-slider"
            min={15}
            max={100}
            step={1}
            value={settings.cardOpacity}
            aria-valuemin={15}
            aria-valuemax={100}
            aria-valuenow={settings.cardOpacity}
            aria-label="카드 불투명도"
            onChange={(e) =>
              void applyCardOpacity(Number.parseInt(e.target.value, 10))
            }
          />
          <span className="settings-opacity-value">{settings.cardOpacity}%</span>
        </div>
        <button
          type="button"
          className="settings-inline-btn settings-opacity-reset"
          onClick={() => void applyCardOpacity(themeDefaultOpacity)}
        >
          테마 기본값으로 ({themeDefaultOpacity}%)
        </button>
      </SettingsRow>

      <SettingsRow
        title="배경 채우기"
        hint="위젯 사이 빈 공간을 어떻게 채울지 고릅니다. «없음»이면 바탕화면이 보입니다."
      >
        <div
          className="design-option-row"
          role="radiogroup"
          aria-label="배경 채우기"
        >
          {BACKGROUND_FILL_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="design-chip"
              role="radio"
              aria-checked={settings.backgroundFill === id}
              onClick={() => void applyBackgroundFill(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow title="포인트 카드" hint="강조할 위젯 카드를 고릅니다.">
        <div
          className="design-option-row"
          role="radiogroup"
          aria-label="포인트 카드"
        >
          {ACCENT_CARD_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="design-chip"
              role="radio"
              aria-checked={settings.accentCard === id}
              onClick={() => void applyAccentCard(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow title="글꼴" hint="앱에 포함된 글꼴을 골라 바로 적용합니다.">
        <div className="design-option-row" role="radiogroup" aria-label="글꼴">
          <button
            type="button"
            className="design-chip"
            role="radio"
            aria-checked={settings.fontFamily === "pretendard"}
            onClick={() => void applyFont("pretendard")}
          >
            Pretendard (기본)
          </button>
          <button
            type="button"
            className="design-chip"
            role="radio"
            aria-checked={settings.fontFamily === "system"}
            onClick={() => void applyFont("system")}
          >
            시스템 기본
          </button>
        </div>
      </SettingsRow>

      <SettingsRow
        title="글자 굵기"
        hint="본문·제목·강조 글자가 함께 조절됩니다. 기본은 3단계(중간)입니다."
      >
        <div
          className="design-font-weight-grid"
          role="radiogroup"
          aria-label="글자 굵기"
        >
          {FONT_WEIGHT_LEVEL_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="design-font-weight-chip"
              role="radio"
              aria-checked={(settings.fontWeightLevel ?? "medium") === id}
              data-weight={id}
              onClick={() => void applyFontWeight(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow title="카드 간격" hint="위젯 카드 사이 여백을 조절합니다.">
        <div className="design-option-row" role="radiogroup" aria-label="카드 간격">
          {DENSITY_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="design-chip"
              role="radio"
              aria-checked={settings.uiDensity === id}
              onClick={() => void applyDensity(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsRow>
    </section>
  );
}

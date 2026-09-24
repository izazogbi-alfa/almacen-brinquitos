/** Tab bar row (icon + label + padding), excluding safe-area. */
export const APP_TAB_BAR_H = "4.5rem";

/** Sticky Capturar bar: outer padding + h-14 button. */
export const APP_CAPTURA_ACTION_H = "5.75rem";

export const APP_CAPTURA_ACTION_BOTTOM = `calc(${APP_TAB_BAR_H} + env(safe-area-inset-bottom, 0px))`;

export const APP_SCROLL_PAD_CON_CAPTURA = `calc(${APP_TAB_BAR_H} + ${APP_CAPTURA_ACTION_H} + env(safe-area-inset-bottom, 0px))`;

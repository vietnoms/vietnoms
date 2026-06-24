import { getMarketingSettings } from "@/lib/marketing/settings";
import { SignupPopup } from "./signup-popup";

/** Server gate: renders the signup popup only when enabled in admin settings. */
export async function PopupGate() {
  const settings = await getMarketingSettings();
  if (!settings.popupEnabled) return null;

  return (
    <SignupPopup
      delaySeconds={settings.popupDelaySeconds}
      headline={settings.popupHeadline}
      offer={settings.popupOffer}
    />
  );
}

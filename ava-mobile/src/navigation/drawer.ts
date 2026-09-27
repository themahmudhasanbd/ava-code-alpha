import { DrawerActions } from "@react-navigation/native";

/**
 * Reliably open the main app drawer from any screen.
 * Walks up the navigator tree to find the drawer; if the current screen lives
 * outside the drawer (e.g. a stack screen), jumps back to "Main" first.
 */
export function openAppDrawer(navigation: any) {
  if (!navigation) return;
  let nav: any = navigation;
  while (nav) {
    const state = nav.getState?.();
    if (state?.type === "drawer") {
      nav.dispatch(DrawerActions.openDrawer());
      return;
    }
    nav = nav.getParent?.();
  }
  // Not inside the drawer: go to Main, then open the drawer.
  try {
    navigation.navigate("Main");
    setTimeout(() => {
      try {
        navigation.navigate("Main");
        navigation.dispatch(DrawerActions.openDrawer());
      } catch {}
    }, 60);
  } catch (e) {
    console.warn("Drawer open error:", e);
  }
}

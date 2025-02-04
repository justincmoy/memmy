import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import * as Notifications from "expo-notifications";
import { StatusBar, StatusBarStyle } from "expo-status-bar";
import { extendTheme, NativeBaseProvider } from "native-base";
import React, { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AppState, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import merge from "deepmerge";
import Stack from "./Stack";
import MemmyErrorView from "./src/components/common/Loading/MemmyErrorView";
import { writeToLog } from "./src/helpers/LogHelper";
import { lemmyAuthToken, lemmyInstance } from "./src/LemmyInstance";
import { loadAccounts } from "./src/slices/accounts/accountsActions";
import { selectAccountsLoaded } from "./src/slices/accounts/accountsSlice";
import {
  loadSettings,
  setSetting,
} from "./src/slices/settings/settingsActions";
import { selectSettings } from "./src/slices/settings/settingsSlice";
import { getUnreadCount } from "./src/slices/site/siteActions";
import { useAppDispatch, useAppSelector } from "./store";
import getFontScale from "./src/theme/fontSize";
import { darkTheme } from "./src/theme/theme";
import { ThemeOptionsArr, ThemeOptionsMap } from "./src/theme/themeOptions";
import Toast from "./src/components/common/Toast";
import { systemFontSettings } from "./src/theme/common";

const logError = (e, info) => {
  writeToLog(e.toString());
  writeToLog(
    info && info.componentStack ? info.componentStack.toString() : "No stack."
  );
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function Start() {
  const [loaded, setLoaded] = useState(false);
  const dispatch = useAppDispatch();
  const accountsLoaded = useAppSelector(selectAccountsLoaded);

  const [statusBarColor, setStatusBarColor] = useState<StatusBarStyle>("dark");

  const {
    theme,
    themeMatchSystem,
    themeDark,
    themeLight,
    fontSize,
    isSystemTextSize,
    isSystemFont,
    accentColor,
  } = useAppSelector(selectSettings);

  const [selectedTheme, setSelectedTheme] = useState<any>(darkTheme);
  const colorScheme = useColorScheme();
  const currentTheme = themeMatchSystem
    ? colorScheme === "light"
      ? themeLight
      : themeDark
    : theme;

  const appState = useRef(AppState.currentState);

  let refreshInterval;

  useEffect(() => {
    if (!loaded) return;

    startInterval();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        !refreshInterval
      ) {
        writeToLog("Starting refresh interval.");
        startInterval();
      } else if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        writeToLog("Ending refresh interval.");
        clearInterval(refreshInterval);
        refreshInterval = null;
      }

      appState.current = nextAppState;
    });

    // eslint-disable-next-line consistent-return
    return () => {
      subscription.remove();
    };
  }, [loaded]);

  const startInterval = () => {
    refreshInterval = setInterval(() => {
      if (lemmyInstance && lemmyAuthToken) {
        dispatch(getUnreadCount());
      }
    }, 30000);
  };

  useEffect(() => {
    let usedTheme = currentTheme;

    // @ts-ignore
    if (!ThemeOptionsArr.includes(usedTheme)) {
      usedTheme = "Dark";

      dispatch(setSetting({ theme: usedTheme }));
    }

    const newTheme = extendTheme(
      merge.all([
        ThemeOptionsMap[usedTheme],
        accentColor
          ? {
              colors: {
                app: {
                  accent: accentColor,
                },
              },
            }
          : {},
        {
          components: {
            Text: {
              defaultProps: {
                color: ThemeOptionsMap[usedTheme].colors.app.textPrimary,
              },
            },
          },
        },
        isSystemTextSize
          ? {
              components: {
                Text: {
                  defaultProps: {
                    allowFontScaling: false,
                  },
                },
              },
            }
          : { fontSizes: getFontScale() },
        isSystemFont ? systemFontSettings : {},
      ])
    );
    // TODO add fallback
    setSelectedTheme(newTheme);
    setStatusBarColor(
      newTheme.config.initialColorMode === "dark" ? "light" : "dark"
    );
    // ! fontSize has to be here
  }, [
    currentTheme,
    fontSize,
    getFontScale,
    isSystemTextSize,
    isSystemFont,
    accentColor,
  ]);

  if (!loaded) {
    dispatch(loadSettings());
    dispatch(loadAccounts());
    setLoaded(true);
  }

  if (!accountsLoaded) {
    return null;
  }

  return (
    <NativeBaseProvider theme={selectedTheme}>
      <ErrorBoundary onError={logError} FallbackComponent={MemmyErrorView}>
        {/* eslint-disable-next-line react/style-prop-object */}
        <StatusBar style={statusBarColor} />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ActionSheetProvider>
            <>
              <Toast />
              <Stack />
            </>
          </ActionSheetProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </NativeBaseProvider>
  );
}

export default Start;

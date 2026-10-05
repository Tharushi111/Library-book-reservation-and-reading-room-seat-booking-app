import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";
import { BottomTabParamList } from "../../navigation/types";

type Props = BottomTabScreenProps<
  BottomTabParamList,
  "Notifications"
>;

type NotificationType =
  | "book_available"
  | "collection_reminder"
  | "due_date"
  | "room_booking"
  | "system";

type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

type FilterType =
  | "all"
  | "unread"
  | "system";

export default function NotificationsScreen({
  navigation,
}: Props) {
  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<FilterType>("all");

  const [userId, setUserId] =
    useState<string | null>(null);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications =
    useCallback(async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          Alert.alert(
            "Session Error",
            "Please login again."
          );

          return;
        }

        setUserId(user.id);

        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select(
            `
            id,
            user_id,
            title,
            message,
            type,
            is_read,
            created_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setNotifications(
          (data ?? []) as NotificationItem[]
        );
      } catch (error: any) {
        console.error(
          "Notification load error:",
          error
        );

        Alert.alert(
          "Unable to Load Notifications",
          error?.message ||
            "Please try again."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // Refresh when user opens Notifications tab
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length,
    [notifications]
  );

  // =====================================================
  // FILTER
  // =====================================================

  const filteredNotifications =
    useMemo(() => {
      if (
        activeFilter === "unread"
      ) {
        return notifications.filter(
          (notification) =>
            !notification.is_read
        );
      }

      if (
        activeFilter === "system"
      ) {
        return notifications.filter(
          (notification) =>
            notification.type ===
            "system"
        );
      }

      return notifications;
    }, [
      activeFilter,
      notifications,
    ]);

  // =====================================================
  // UPDATE: MARK AS READ
  // =====================================================

  const markAsRead = async (
    notificationId: string
  ) => {
    if (!userId) {
      return;
    }

    const selectedNotification =
      notifications.find(
        (notification) =>
          notification.id ===
          notificationId
      );

    if (
      !selectedNotification ||
      selectedNotification.is_read
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq(
            "id",
            notificationId
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        throw error;
      }

      setNotifications(
        (currentNotifications) =>
          currentNotifications.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );
    } catch (error: any) {
      console.error(
        "Mark notification read error:",
        error
      );

      Alert.alert(
        "Update Failed",
        error?.message ||
          "Unable to update notification."
      );
    }
  };

  // =====================================================
  // NOTIFICATION PRESS
  // =====================================================

  const handleNotificationPress =
    async (
      notification: NotificationItem
    ) => {
      if (!notification.is_read) {
        await markAsRead(
          notification.id
        );
      }

      /*
       * Later, if needed, we can
       * navigate different notification
       * types to their related screens.
       *
       * Example:
       * room_booking -> booking details
       * book_available -> book details
       */
    };

  // =====================================================
  // TIME FORMAT
  // =====================================================

  const formatTimeAgo = (
    createdAt: string
  ) => {
    const createdTime =
      new Date(createdAt).getTime();

    const currentTime =
      new Date().getTime();

    const difference =
      currentTime - createdTime;

    const minutes = Math.floor(
      difference / 60000
    );

    const hours = Math.floor(
      difference / 3600000
    );

    const days = Math.floor(
      difference / 86400000
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    if (hours < 24) {
      return `${hours} h ago`;
    }

    if (days < 7) {
      return `${days} d ago`;
    }

    return new Date(
      createdAt
    ).toLocaleDateString();
  };

  // =====================================================
  // ICON BY TYPE
  // =====================================================

  const getNotificationIcon = (
    notification: NotificationItem
  ):
    | "book-outline"
    | "notifications-outline"
    | "desktop-outline"
    | "information-circle-outline" => {
    if (
      notification.type ===
      "book_available"
    ) {
      return "book-outline";
    }

    if (
      notification.type ===
        "due_date" ||
      notification.type ===
        "collection_reminder"
    ) {
      return "notifications-outline";
    }

    if (
      notification.type ===
      "room_booking"
    ) {
      return "desktop-outline";
    }

    return "information-circle-outline";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <View style={styles.container}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.navigate(
                "Home"
              )
            }
          >
            <Ionicons
              name="chevron-back"
              size={26}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Notifications
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        {/* =================================================
            FILTER TABS
        ================================================= */}

        <View
          style={
            styles.filterContainer
          }
        >
          <FilterButton
            title="All"
            selected={
              activeFilter === "all"
            }
            onPress={() =>
              setActiveFilter("all")
            }
          />

          <FilterButton
            title={`Unread (${unreadCount})`}
            selected={
              activeFilter ===
              "unread"
            }
            onPress={() =>
              setActiveFilter(
                "unread"
              )
            }
          />

          <FilterButton
            title="System"
            selected={
              activeFilter ===
              "system"
            }
            onPress={() =>
              setActiveFilter(
                "system"
              )
            }
          />
        </View>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <ScrollView
          style={styles.body}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {loading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading
                notifications...
              </Text>
            </View>
          ) : filteredNotifications
              .length === 0 ? (
            <View
              style={
                styles.emptyContainer
              }
            >
              <View
                style={
                  styles.emptyIconContainer
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={34}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No Notifications
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                {activeFilter ===
                "unread"
                  ? "You have no unread notifications."
                  : activeFilter ===
                      "system"
                    ? "There are no system notifications."
                    : "Your notifications will appear here."}
              </Text>
            </View>
          ) : (
            filteredNotifications.map(
              (notification) => (
                <NotificationCard
                  key={
                    notification.id
                  }
                  notification={
                    notification
                  }
                  timeLabel={formatTimeAgo(
                    notification.created_at
                  )}
                  icon={getNotificationIcon(
                    notification
                  )}
                  onPress={() =>
                    handleNotificationPress(
                      notification
                    )
                  }
                />
              )
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// =========================================================
// FILTER BUTTON
// =========================================================

type FilterButtonProps = {
  title: string;
  selected: boolean;
  onPress: () => void;
};

function FilterButton({
  title,
  selected,
  onPress,
}: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selected &&
          styles.selectedFilterButton,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.filterText,
          selected &&
            styles.selectedFilterText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// =========================================================
// NOTIFICATION CARD
// =========================================================

type NotificationCardProps = {
  notification: NotificationItem;

  icon:
    | "book-outline"
    | "notifications-outline"
    | "desktop-outline"
    | "information-circle-outline";

  timeLabel: string;

  onPress: () => void;
};

function NotificationCard({
  notification,
  icon,
  timeLabel,
  onPress,
}: NotificationCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,

        !notification.is_read &&
          styles.unreadCard,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* ICON */}

      <View
        style={
          styles.notificationIconContainer
        }
      >
        <Ionicons
          name={icon}
          size={20}
          color="#1683E8"
        />
      </View>

      {/* CONTENT */}

      <View
        style={
          styles.notificationContent
        }
      >
        <View
          style={
            styles.notificationTitleRow
          }
        >
          <Text
            style={
              styles.notificationTitle
            }
            numberOfLines={1}
          >
            {notification.title}
          </Text>

          <Text
            style={
              styles.notificationTime
            }
          >
            {timeLabel}
          </Text>
        </View>

        <Text
          style={
            styles.notificationMessage
          }
          numberOfLines={2}
        >
          {notification.message}
        </Text>
      </View>

      {/* UNREAD DOT */}

      {!notification.is_read && (
        <View
          style={
            styles.unreadDot
          }
        />
      )}
    </TouchableOpacity>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    // =====================================================
    // HEADER
    // =====================================================

    header: {
      height: 66,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      paddingHorizontal: 20,

      backgroundColor:
        COLORS.background,
    },

    backButton: {
      width: 40,
      height: 40,

      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    headerSpacer: {
      width: 40,
    },

    // =====================================================
    // FILTER
    // =====================================================

    filterContainer: {
      height: 45,

      flexDirection: "row",

      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 16,

      padding: 3,

      borderRadius: 10,

      backgroundColor:
        "#EDF5FD",
    },

    filterButton: {
      flex: 1,

      borderRadius: 8,

      alignItems: "center",
      justifyContent: "center",
    },

    selectedFilterButton: {
      backgroundColor:
        COLORS.secondary,
    },

    filterText: {
      fontSize: 10,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    selectedFilterText: {
      color:
        COLORS.white,
    },

    // =====================================================
    // BODY
    // =====================================================

    body: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,

      paddingHorizontal: 18,
      paddingBottom: 35,
    },

    // =====================================================
    // NOTIFICATION CARD
    // =====================================================

    notificationCard: {
      minHeight: 84,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor:
        COLORS.white,

      borderWidth: 1,
      borderColor:
        "#D4E1F0",

      borderRadius: 11,

      paddingHorizontal: 10,
      paddingVertical: 12,

      marginBottom: 9,
    },

    unreadCard: {
      backgroundColor:
        "#FFFFFF",
    },

    notificationIconContainer: {
      width: 36,
      height: 36,

      borderRadius: 18,

      backgroundColor:
        "#EFF6FE",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 10,
    },

    notificationContent: {
      flex: 1,
    },

    notificationTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    notificationTitle: {
      flex: 1,

      paddingRight: 8,

      fontSize: 12,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    notificationTime: {
      fontSize: 9,

      color: "#93A0B2",
    },

    notificationMessage: {
      marginTop: 6,

      paddingRight: 6,

      fontSize: 9.5,

      lineHeight: 14,

      color:
        COLORS.textSecondary,
    },

    unreadDot: {
      width: 7,
      height: 7,

      borderRadius: 4,

      backgroundColor:
        COLORS.secondary,

      marginLeft: 7,
    },

    // =====================================================
    // LOADING
    // =====================================================

    loadingContainer: {
      flex: 1,

      minHeight: 300,

      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 10,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    // =====================================================
    // EMPTY
    // =====================================================

    emptyContainer: {
      flex: 1,

      minHeight: 350,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 30,
    },

    emptyIconContainer: {
      width: 70,
      height: 70,

      borderRadius: 35,

      backgroundColor:
        "#EEF5FC",

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 14,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    emptySubtitle: {
      marginTop: 6,

      textAlign: "center",

      fontSize: 11,

      lineHeight: 17,

      color:
        COLORS.textSecondary,
    },
  });
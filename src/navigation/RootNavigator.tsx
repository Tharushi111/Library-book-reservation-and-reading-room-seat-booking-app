import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomTabNavigator from "./BottomTabNavigator";
import StaffTabNavigator from "./StaffTabNavigator";

// =========================================================
// AUTHENTICATION
// =========================================================

import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

// =========================================================
// MEMBER 1 - CORE ACCESS
// =========================================================

import AccountSettingsScreen from "../screens/profile/AccountSettingsScreen";
import BookSearchScreen from "../screens/books/BookSearchScreen";
import RecentSearchesScreen from "../screens/books/RecentSearchesScreen";

// =========================================================
// MEMBER 2 - BOOKS
// =========================================================

import BookCatalogueScreen from "../screens/books/bookCatalogueScreen";
import BookDetailsScreen from "../screens/books/bookDetailsScreen";
import ReservationConfirmationScreen from "../screens/books/reservationConfirmationScreen";
import QueueConfirmationScreen from "../screens/books/queueConfirmationScreen";
import SearchResultsScreen from "../screens/books/SearchResultsScreen";

// =========================================================
// MEMBER 3 - STUDY SPACES
// =========================================================

import SpaceReservationScreen from "../screens/spaces/SpaceReservationScreen";
import StudyRoomsScreen from "../screens/spaces/StudyRoomsScreen";
import BookStudyRoomScreen from "../screens/spaces/BookStudyRoomScreen";
import BookingConfirmationScreen from "../screens/spaces/BookingConfirmationScreen";
import BookingDetailsScreen from "../screens/spaces/BookingDetailsScreen";

// =========================================================
// MEMBER 4 - ACTIVITY
// =========================================================

import MyBookReservations from "../screens/activity/MyBookReservations";
import MyStudyRoomBookings from "../screens/activity/MyStudyRoomBookings";
import BorrowedBooks from "../screens/activity/BorrowedBooks";
import ReservationDetails from "../screens/activity/ReservationDetails";
import ActivityBookingDetails from "../screens/activity/BookingDetails";

// =========================================================
// STAFF & ADMIN
// =========================================================

import StaffBookDetailsScreen from "../screens/staff/StaffBookDetailsScreen";
import StaffAddEditBookScreen from "../screens/staff/StaffAddEditBookScreen";
import StaffLoanManagementScreen from "../screens/staff/StaffLoanManagementScreen";
import StaffReservationManagementScreen from "../screens/staff/StaffReservationManagementScreen";
import StaffRoomManagementScreen from "../screens/staff/StaffRoomManagementScreen";
import StaffAddEditRoomScreen from "../screens/staff/StaffAddEditRoomScreen";
import StaffRoomScheduleScreen from "../screens/staff/StaffRoomScheduleScreen";
import StaffAnnouncementScreen from "../screens/staff/StaffAnnouncementScreen";
import StaffAddEditAnnouncementScreen from "../screens/staff/StaffAddEditAnnouncementScreen";
import AdminUserManagementScreen from "../screens/admin/AdminUserManagementScreen";

import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* =================================================
          AUTHENTICATION
      ================================================= */}

      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

      {/* =================================================
          STUDENT MAIN NAVIGATION
      ================================================= */}

      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="BookSearch" component={BookSearchScreen} />
      <Stack.Screen name="RecentSearches" component={RecentSearchesScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />

      {/* =================================================
          MEMBER 2 - BOOKS
      ================================================= */}

      <Stack.Screen name="BookCatalogue" component={BookCatalogueScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="BookDetails" component={BookDetailsScreen} />
      <Stack.Screen
        name="ReservationConfirmation"
        component={ReservationConfirmationScreen}
      />
      <Stack.Screen
        name="QueueConfirmation"
        component={QueueConfirmationScreen}
      />

      {/* =================================================
          MEMBER 3 - STUDY SPACES
      ================================================= */}

      <Stack.Screen name="SpaceReservation" component={SpaceReservationScreen} />
      <Stack.Screen name="StudyRooms" component={StudyRoomsScreen} />
      <Stack.Screen name="BookStudyRoom" component={BookStudyRoomScreen} />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
      />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />

      {/* =================================================
          MEMBER 4 - ACTIVITY
      ================================================= */}

      <Stack.Screen name="MyBookReservations" component={MyBookReservations} />
      <Stack.Screen
        name="MyStudyRoomBookings"
        component={MyStudyRoomBookings}
      />
      <Stack.Screen name="BorrowedBooks" component={BorrowedBooks} />
      <Stack.Screen
        name="ReservationDetails"
        component={ReservationDetails}
      />
      <Stack.Screen
        name="ActivityBookingDetails"
        component={ActivityBookingDetails}
      />

      {/* =================================================
          STAFF & ADMIN PORTAL
      ================================================= */}

      <Stack.Screen name="StaffTabs" component={StaffTabNavigator} />
      <Stack.Screen
        name="StaffBookDetails"
        component={StaffBookDetailsScreen}
      />
      <Stack.Screen
        name="StaffAddEditBook"
        component={StaffAddEditBookScreen}
      />
      <Stack.Screen
        name="StaffLoanManagement"
        component={StaffLoanManagementScreen}
      />
      <Stack.Screen
        name="StaffIssueLoan"
        component={StaffLoanManagementScreen}
      />
      <Stack.Screen
        name="StaffReservationManagement"
        component={StaffReservationManagementScreen}
      />
      <Stack.Screen
        name="StaffRoomManagement"
        component={StaffRoomManagementScreen}
      />
      <Stack.Screen
        name="StaffAddEditRoom"
        component={StaffAddEditRoomScreen}
      />
      <Stack.Screen
        name="StaffRoomSchedule"
        component={StaffRoomScheduleScreen}
      />
      <Stack.Screen
        name="StaffAnnouncement"
        component={StaffAnnouncementScreen}
      />
      <Stack.Screen
        name="StaffAddEditAnnouncement"
        component={StaffAddEditAnnouncementScreen}
      />
      <Stack.Screen
        name="AdminUserManagement"
        component={AdminUserManagementScreen}
      />
    </Stack.Navigator>
  );
}
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomTabNavigator from "./BottomTabNavigator";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import MyBookReservations from "../screens/activity/MyBookReservations";
import MyStudyRoomBookings from "../screens/activity/MyStudyRoomBookings";
import BorrowedBooks from "../screens/activity/BorrowedBooks";
import ReservationDetails from "../screens/activity/ReservationDetails";
import BookingDetails from "../screens/activity/BookingDetails";
import SearchResultsScreen from "../screens/books/SearchResultsScreen";

// =========================================================
// MEMBER 1 - CORE ACCESS
// =========================================================

import LoginScreen from "../screens/auth/LoginScreen";
import AccountSettingsScreen from "../screens/profile/AccountSettingsScreen";
import BookSearchScreen from "../screens/books/BookSearchScreen";
import RecentSearchesScreen from "../screens/books/RecentSearchesScreen";

import { RootStackParamList } from "./types";

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* =================================================
          MEMBER 1 - CORE ACCESS
      ================================================= */}

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
      />

      {/* YOUR BOOK SEARCH SCREEN */}
      <Stack.Screen
        name="BookSearch"
        component={BookSearchScreen}
      />

      {/* YOUR RECENT SEARCHES SCREEN */}
      <Stack.Screen
        name="RecentSearches"
        component={RecentSearchesScreen}
      />

      {/* YOUR EDIT PROFILE / ACCOUNT SETTINGS */}
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
      />

      {/* =================================================
          MEMBER 2 - BOOKS
      ================================================= */}

      <Stack.Screen name="BookCatalogue">
        {() => (
          <PlaceholderScreen
            title="Book Catalogue"
          />
        )}
      </Stack.Screen>

     <Stack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
      />

      <Stack.Screen name="BookDetails">
        {() => (
          <PlaceholderScreen
            title="Book Details"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BorrowedBookDetails">
        {() => (
          <PlaceholderScreen
            title="Borrowed Book Details"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ReservationConfirmation">
        {() => (
          <PlaceholderScreen
            title="Reservation Confirmation"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="QueueConfirmation">
        {() => (
          <PlaceholderScreen
            title="Queue Confirmation"
          />
        )}
      </Stack.Screen>

      {/* =================================================
          MEMBER 3 - STUDY SPACES
      ================================================= */}

      <Stack.Screen name="SpaceReservation">
        {() => (
          <PlaceholderScreen
            title="Space Reservation"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="StudyRooms">
        {() => (
          <PlaceholderScreen
            title="Study Rooms"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookStudyRoom">
        {() => (
          <PlaceholderScreen
            title="Book Study Room"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookingConfirmation">
        {() => (
          <PlaceholderScreen
            title="Booking Confirmation"
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookingDetails" component={BookingDetails} />

      {/* =================================================
          MEMBER 4 - ACTIVITY
      ================================================= */}

      <Stack.Screen name="MyBookReservations" component={MyBookReservations} />
      <Stack.Screen name="MyStudyRoomBookings" component={MyStudyRoomBookings} />
      <Stack.Screen name="BorrowedBooks" component={BorrowedBooks} />
      <Stack.Screen name="ReservationDetails" component={ReservationDetails} />
    </Stack.Navigator>
  );
}
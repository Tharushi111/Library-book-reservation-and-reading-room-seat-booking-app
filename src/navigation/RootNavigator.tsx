import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomTabNavigator from "./BottomTabNavigator";
import PlaceholderScreen from "../screens/PlaceholderScreen";

import { RootStackParamList } from "./types";

import BookCatalogueScreen from "../screens/books/bookCatalogueScreen";
import BookDetailsScreen from "../screens/books/bookDetailsScreen";
import ReservationConfirmationScreen from "../screens/books/reservationConfirmationScreen";
import QueueConfirmationScreen from "../screens/books/queueConfirmationScreen";


import LoginScreen from "../screens/auth/LoginScreen";

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
      {/*MEMBER 1 - CORE ACCESS*/}

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
      />

      <Stack.Screen name="RecentSearches">
        {() => (
          <PlaceholderScreen title="Recent Searches" />
        )}
      </Stack.Screen>

      <Stack.Screen name="AccountSettings">
        {() => (
          <PlaceholderScreen title="Account Settings" />
        )}
      </Stack.Screen>


      {/*MEMBER 2 - BOOKS*/}

      <Stack.Screen
        name="BookCatalogue"
        component={BookCatalogueScreen}
      />

      <Stack.Screen
        name="BookDetails"
        component={BookDetailsScreen}
      />

      <Stack.Screen name="BorrowedBookDetails">
        {() => (
          <PlaceholderScreen title="Borrowed Book Details" />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ReservationConfirmation"
        component={ReservationConfirmationScreen}
      />

      <Stack.Screen
        name="QueueConfirmation"
        component={QueueConfirmationScreen}
      />


      {/*MEMBER 3 - STUDY SPACES*/}

      <Stack.Screen name="SpaceReservation">
        {() => (
          <PlaceholderScreen title="Space Reservation" />
        )}
      </Stack.Screen>

      <Stack.Screen name="StudyRooms">
        {() => (
          <PlaceholderScreen title="Study Rooms" />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookStudyRoom">
        {() => (
          <PlaceholderScreen title="Book Study Room" />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookingConfirmation">
        {() => (
          <PlaceholderScreen title="Booking Confirmation" />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookingDetails">
        {() => (
          <PlaceholderScreen title="Booking Details" />
        )}
      </Stack.Screen>


      {/*MEMBER 4 - ACTIVITY*/}

      <Stack.Screen name="MyBookReservations">
        {() => (
          <PlaceholderScreen title="My Book Reservations" />
        )}
      </Stack.Screen>

      <Stack.Screen name="MyStudyRoomBookings">
        {() => (
          <PlaceholderScreen title="My Study Room Bookings" />
        )}
      </Stack.Screen>

      <Stack.Screen name="BorrowedBooks">
        {() => (
          <PlaceholderScreen title="Borrowed Books" />
        )}
      </Stack.Screen>

      <Stack.Screen name="ReservationDetails">
        {() => (
          <PlaceholderScreen title="Reservation Details" />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
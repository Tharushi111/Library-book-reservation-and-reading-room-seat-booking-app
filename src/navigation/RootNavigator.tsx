import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomTabNavigator from "./BottomTabNavigator";
import PlaceholderScreen from "../screens/PlaceholderScreen";

import { RootStackParamList } from "./types";
import SpaceReservationScreen from "../screens/spaces/SpaceReservationScreen";
import StudyRoomsScreen from "../screens/spaces/StudyRoomsScreen";
import BookStudyRoomScreen from "../screens/spaces/BookStudyRoomScreen";
import BookingConfirmationScreen from "../screens/spaces/BookingConfirmationScreen";
import BookingDetailsScreen from "../screens/spaces/BookingDetailsScreen";

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

      <Stack.Screen name="Login">
        {() => (
          <PlaceholderScreen title="Login" />
        )}
      </Stack.Screen>

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

      <Stack.Screen name="BookCatalogue">
        {() => (
          <PlaceholderScreen title="Book Catalogue" />
        )}
      </Stack.Screen>

      <Stack.Screen name="SearchResults">
        {() => (
          <PlaceholderScreen title="Search Results" />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookDetails">
        {() => (
          <PlaceholderScreen title="Book Details" />
        )}
      </Stack.Screen>

      <Stack.Screen name="BorrowedBookDetails">
        {() => (
          <PlaceholderScreen title="Borrowed Book Details" />
        )}
      </Stack.Screen>

      <Stack.Screen name="ReservationConfirmation">
        {() => (
          <PlaceholderScreen title="Reservation Confirmation" />
        )}
      </Stack.Screen>

      <Stack.Screen name="QueueConfirmation">
        {() => (
          <PlaceholderScreen title="Queue Confirmation" />
        )}
      </Stack.Screen>


      {/*MEMBER 3 - STUDY SPACES*/}

            {/*MEMBER 3 - STUDY SPACES*/}

      <Stack.Screen name="SpaceReservation" component={SpaceReservationScreen} />
      <Stack.Screen name="StudyRooms" component={StudyRoomsScreen} />
      <Stack.Screen name="BookStudyRoom" component={BookStudyRoomScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />


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
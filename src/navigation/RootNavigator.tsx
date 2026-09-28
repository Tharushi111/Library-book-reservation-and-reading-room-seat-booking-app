import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomTabNavigator from "./BottomTabNavigator";
import PlaceholderScreen from "../screens/PlaceholderScreen";
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
      {/* Member 1 */}
      <Stack.Screen name="Login">
        {() => <PlaceholderScreen title="Login" />}
      </Stack.Screen>

      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
      />

      {/* Member 2 - Books */}
      <Stack.Screen name="BookCatalogue">
        {() => <PlaceholderScreen title="Book Catalogue" />}
      </Stack.Screen>

      <Stack.Screen name="SearchResults">
        {() => <PlaceholderScreen title="Search Results" />}
      </Stack.Screen>

      <Stack.Screen name="BookDetails">
        {() => <PlaceholderScreen title="Book Details" />}
      </Stack.Screen>

      <Stack.Screen name="BorrowedBookDetails">
        {() => <PlaceholderScreen title="Borrowed Book Details" />}
      </Stack.Screen>

      <Stack.Screen name="ReservationConfirmation">
        {() => <PlaceholderScreen title="Reservation Confirmation" />}
      </Stack.Screen>

      <Stack.Screen name="QueueConfirmation">
        {() => <PlaceholderScreen title="Queue Confirmation" />}
      </Stack.Screen>

      {/* Member 3 - Study Spaces */}
      <Stack.Screen name="SpaceReservation">
        {() => <PlaceholderScreen title="Space Reservation" />}
      </Stack.Screen>

      <Stack.Screen name="StudyRooms">
        {() => <PlaceholderScreen title="Study Rooms" />}
      </Stack.Screen>

      <Stack.Screen name="BookStudyRoom">
        {() => <PlaceholderScreen title="Book Study Room" />}
      </Stack.Screen>

      <Stack.Screen name="BookingConfirmation">
        {() => <PlaceholderScreen title="Booking Confirmation" />}
      </Stack.Screen>

      <Stack.Screen name="BookingDetails">
        {() => <PlaceholderScreen title="Booking Details" />}
      </Stack.Screen>

      {/* Member 4 - Activity */}
      <Stack.Screen name="MyBookReservations">
        {() => <PlaceholderScreen title="My Book Reservations" />}
      </Stack.Screen>

      <Stack.Screen name="MyStudyRoomBookings">
        {() => <PlaceholderScreen title="My Study Room Bookings" />}
      </Stack.Screen>

      <Stack.Screen name="BorrowedBooks">
        {() => <PlaceholderScreen title="Borrowed Books" />}
      </Stack.Screen>

      <Stack.Screen name="ReservationDetails">
        {() => <PlaceholderScreen title="Reservation Details" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
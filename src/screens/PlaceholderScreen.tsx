import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  title: string;
};

export default function PlaceholderScreen({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>Screen under development</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
  },

  text: {
    marginTop: 8,
    fontSize: 14,
  },
});
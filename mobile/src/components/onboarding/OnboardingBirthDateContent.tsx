import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { OnboardingStyles } from "./OnboardingConstants";

interface OnboardingBirthDateContentProps {
  onDataChange: (data: { dateOfBirth: string }) => void;
}

export function OnboardingBirthDateContent({
  onDataChange,
}: OnboardingBirthDateContentProps) {
  const [month, setMonth] = useState("January");
  const [day, setDay] = useState("1");
  const [year, setYear] = useState("2000");
  const [dataInitialized, setDataInitialized] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Generate days 1-31 as strings
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  // Generate years from 1930 to current year minus 18 as strings
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 100; // 100 years ago
  const endYear = currentYear - 18; // Must be at least 18
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) =>
    (startYear + i).toString()
  ).reverse(); // Reverse to show newest years first

  // Update date of birth when selections change
  useEffect(() => {
    if (!dataInitialized) {
      setDataInitialized(true);
      return;
    }

    const monthIndex = months.indexOf(month);
    // Format as YYYY-MM-DD
    const formattedDate = `${year}-${String(monthIndex + 1).padStart(
      2,
      "0"
    )}-${day.padStart(2, "0")}`;
    onDataChange({ dateOfBirth: formattedDate });
  }, [month, day, year, months, dataInitialized, onDataChange]);

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>When were you born?</Text>
      <Text style={OnboardingStyles.subtitle}>
        This will be used to calibrate your custom plan.
      </Text>

      <View style={styles.pickerRowContainer}>
        {/* Month Picker */}
        <View style={styles.pickerItemMonth}>
          <Picker
            selectedValue={month}
            onValueChange={(value: string) => setMonth(value)}
            style={styles.picker}
            itemStyle={styles.pickerItemText}
          >
            {months.map((m) => (
              <Picker.Item key={m} label={m} value={m} color="#333" />
            ))}
          </Picker>
        </View>

        {/* Day Picker */}
        <View style={styles.pickerItemDay}>
          <Picker
            selectedValue={day}
            onValueChange={(value: string) => setDay(value)}
            style={styles.picker}
            itemStyle={styles.pickerItemText}
          >
            {days.map((d) => (
              <Picker.Item key={d} label={d} value={d} color="#333" />
            ))}
          </Picker>
        </View>

        {/* Year Picker */}
        <View style={styles.pickerItemYear}>
          <Picker
            selectedValue={year}
            onValueChange={(value: string) => setYear(value)}
            style={styles.picker}
            itemStyle={styles.pickerItemText}
          >
            {years.map((y) => (
              <Picker.Item key={y} label={y} value={y} color="#333" />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    width: "100%",
  },
  pickerItemMonth: {
    backgroundColor: "transparent",
    borderRadius: 14,
    width: "44%",
    height: 220,
    overflow: "hidden",
    marginHorizontal: 0,
  },
  pickerItemDay: {
    backgroundColor: "transparent",
    borderRadius: 14,
    width: "23%",
    height: 220,
    overflow: "hidden",
    marginHorizontal: 0,
  },
  pickerItemYear: {
    backgroundColor: "transparent",
    borderRadius: 14,
    width: "28%",
    height: 220,
    overflow: "hidden",
    marginHorizontal: 0,
  },
  picker: {
    width: "100%",
    height: 220,
  },
  pickerItemText: {
    fontSize: 16,
    color: "#333",
  },
});

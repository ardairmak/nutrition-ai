import { StyleSheet, Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

// Shared styles for all onboarding screens to ensure consistency
export const OnboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "left",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
    textAlign: "left",
    color: "#666",
    fontWeight: "400",
  },
  // Additional common styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  // Common picker styles
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    width: "100%",
  },
  pickerColumn: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 4,
  },
  // Special column widths for different picker types
  pickerColumnMonth: {
    width: screenWidth * 0.45, // Month names need more space
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 4,
  },
  pickerColumnDay: {
    width: screenWidth * 0.15, // Days need less space
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 4,
  },
  pickerColumnYear: {
    width: screenWidth * 0.25, // Years need medium space
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 4,
  },
  picker: {
    width: "100%",
    height: 180,
  },
  pickerItem: {
    fontSize: 18,
    height: 110,
  },
  pickerItemSmall: {
    fontSize: 16,
    height: 110,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 15,
    color: "#333",
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    color: "#666",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  gridItem: {
    width: "48%",
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  selectedGridItem: {
    borderColor: "#007bff",
    backgroundColor: "#e6f2ff",
  },
  gridItemText: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
  },
  inputContainer: {
    marginTop: 20,
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#f9f9f9",
  },
});

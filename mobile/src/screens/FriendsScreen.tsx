import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import userService from "../services/userService";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type Friend = {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  email?: string;
};

type FriendRequest = {
  id: string;
  user: Friend;
};

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await userService.getFriends();
      setFriends(response);
    } catch (err) {
      setError("Failed to load friends");
      console.error("Error loading friends:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await userService.getFriendRequests();
      setFriendRequests(response);
    } catch (err) {
      console.error("Error loading friend requests:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await userService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      Alert.alert("Error", "Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await userService.sendFriendRequest(userId);
      Alert.alert("Success", "Friend request sent!");
      setSearchResults([]);
      setSearchQuery("");
    } catch (err) {
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleAcceptRequest = async (requestId: string, userId: string) => {
    try {
      await userService.acceptFriendRequest(userId);
      await loadFriends();
      await loadFriendRequests();
      Alert.alert("Success", "Friend request accepted!");
    } catch (err) {
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (requestId: string, userId: string) => {
    try {
      await userService.rejectFriendRequest(userId);
      await loadFriendRequests();
      Alert.alert("Success", "Friend request rejected");
    } catch (err) {
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await userService.removeFriend(friendId);
      await loadFriends();
      Alert.alert("Success", "Friend removed");
    } catch (err) {
      Alert.alert("Error", "Failed to remove friend");
    }
  };

  const handleViewProfile = (friend: Friend) => {
    navigation.navigate("FriendProfile", { friend });
  };

  const renderFriendItem = (friend: Friend) => (
    <TouchableOpacity
      key={friend.id}
      onPress={() => handleViewProfile(friend)}
      style={styles.friendItem}
    >
      <View style={styles.friendInfo}>
        {friend.profilePicture ? (
          <Image
            source={{ uri: friend.profilePicture }}
            style={styles.profilePicture}
          />
        ) : (
          <View style={styles.profilePicturePlaceholder}>
            <Icon name="account" size={24} color="#666" />
          </View>
        )}
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>
            {friend.firstName} {friend.lastName}
          </Text>
          {friend.email && (
            <Text style={styles.friendEmail}>{friend.email}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFriend(friend.id)}
        style={styles.removeButton}
      >
        <Icon name="account-remove" size={24} color="#FF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFriendRequest = (request: FriendRequest) => (
    <View key={request.id} style={styles.friendRequestItem}>
      <View style={styles.friendInfo}>
        {request.user.profilePicture ? (
          <Image
            source={{ uri: request.user.profilePicture }}
            style={styles.profilePicture}
          />
        ) : (
          <View style={styles.profilePicturePlaceholder}>
            <Icon name="account" size={24} color="#666" />
          </View>
        )}
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>
            {request.user.firstName} {request.user.lastName}
          </Text>
          {request.user.email && (
            <Text style={styles.friendEmail}>{request.user.email}</Text>
          )}
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          onPress={() => handleAcceptRequest(request.id, request.user.id)}
          style={[styles.requestButton, styles.acceptButton]}
        >
          <Icon name="check" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRejectRequest(request.id, request.user.id)}
          style={[styles.requestButton, styles.rejectButton]}
        >
          <Icon name="close" size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = (user: Friend) => (
    <View key={user.id} style={styles.searchResultItem}>
      <View style={styles.friendInfo}>
        {user.profilePicture ? (
          <Image
            source={{ uri: user.profilePicture }}
            style={styles.profilePicture}
          />
        ) : (
          <View style={styles.profilePicturePlaceholder}>
            <Icon name="account" size={24} color="#666" />
          </View>
        )}
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>
            {user.firstName} {user.lastName}
          </Text>
          {user.email && <Text style={styles.friendEmail}>{user.email}</Text>}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleSendRequest(user.id)}
        style={styles.addButton}
      >
        <Icon name="account-plus" size={24} color="#4285F4" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon
              name="magnify"
              size={24}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                style={styles.clearButton}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {searchQuery ? (
            searching ? (
              <ActivityIndicator size="large" color="#4285F4" />
            ) : searchResults.length === 0 ? (
              <Text style={styles.emptyText}>No users found</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {searchResults.map(renderSearchResult)}
              </>
            )
          ) : (
            <>
              {friendRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Friend Requests</Text>
                  {friendRequests.map(renderFriendRequest)}
                </>
              )}
              <Text style={styles.sectionTitle}>My Friends</Text>
              {loading ? (
                <ActivityIndicator size="large" color="#4285F4" />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : friends.length === 0 ? (
                <Text style={styles.emptyText}>No friends yet</Text>
              ) : (
                friends.map(renderFriendItem)
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  friendRequestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendDetails: {
    flex: 1,
    marginLeft: 12,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePicturePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  friendName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  friendEmail: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestButton: {
    padding: 8,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
  },
  rejectButton: {
    backgroundColor: "#FFEBEE",
    borderRadius: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    color: "#666666",
    textAlign: "center",
    marginTop: 20,
  },
});

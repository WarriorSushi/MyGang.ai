import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isEcosystemSpeed,
  type EcosystemSpeed,
} from "./ecosystem-speed";

function storageKey(userId: string): string {
  return `mygang:ecosystem-speed:${userId}`;
}

export async function loadEcosystemSpeed(
  userId: string,
): Promise<EcosystemSpeed> {
  try {
    const value = await AsyncStorage.getItem(storageKey(userId));
    return isEcosystemSpeed(value) ? value : "normal";
  } catch {
    return "normal";
  }
}

export async function saveEcosystemSpeed(
  userId: string,
  speed: EcosystemSpeed,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), speed);
}


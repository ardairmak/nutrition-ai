declare module "expo-clipboard" {
  export function getStringAsync(): Promise<string>;
  export function setStringAsync(text: string): Promise<boolean>;
  export function hasStringAsync(): Promise<boolean>;
}

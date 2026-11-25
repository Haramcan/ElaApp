import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

/** Opens the camera or library; returns a picked image URI or null */
export async function pickImage(source: PhotoSource, opts: { base64?: boolean; quality?: number } = {}): Promise<ImagePicker.ImagePickerAsset | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: opts.quality ?? 0.8, base64: opts.base64, allowsEditing: false };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Kein Zugriff auf die Kamera. Bitte in den Einstellungen erlauben.');
    const res = await ImagePicker.launchCameraAsync(options);
    return res.canceled ? null : (res.assets[0] ?? null);
  }
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') throw new Error('Kein Zugriff auf die Fotos. Bitte in den Einstellungen erlauben.');
  }
  const res = await ImagePicker.launchImageLibraryAsync(options);
  return res.canceled ? null : (res.assets[0] ?? null);
}

/** Copies a picked image into the app's private documents folder so it survives cache clean-ups */
export async function persistPhoto(uri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'progress');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${id}.jpg`);
  if (dest.exists) dest.delete();
  await new File(uri).copy(dest);
  return dest.uri;
}

export function deletePhotoFile(uri: string) {
  if (Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignore
  }
}

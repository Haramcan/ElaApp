import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { useToast } from '../components/Toast';
import { Button, Card, Chip, EmptyState, Row, Screen, Segmented, Txt } from '../components/ui';
import { formatWeight } from '../lib/calc';
import { dateKey, formatShortDate } from '../lib/date';
import { confirm, notify } from '../lib/platform';
import { deletePhotoFile, persistPhoto, pickImage, type PhotoSource } from '../lib/photos';
import { latestWeightKg } from '../lib/selectors';
import { uid, useStore } from '../lib/store';
import { radius, useTheme } from '../lib/theme';
import type { PhotoPose, ProgressPhoto } from '../lib/types';

const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Vorne' },
  { value: 'side', label: 'Seite' },
  { value: 'back', label: 'Hinten' },
];

export default function Photos() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [pose, setPose] = useState<PhotoPose>('front');
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const wu = state.settings.weightUnit;
  const list = useMemo(() => state.photos.filter((p) => p.pose === pose).sort((a, b) => b.createdAt - a.createdAt), [state.photos, pose]);

  const add = async (source: PhotoSource) => {
    try {
      setBusy(true);
      const asset = await pickImage(source, { quality: 0.7 });
      if (!asset) return;
      const id = uid('ph_');
      const uri = await persistPhoto(asset.uri, id);
      actions.addPhoto({ date: dateKey(), uri, pose, weightKg: latestWeightKg(state) });
      toast({ message: 'Foto gespeichert – nur auf deinem Gerät', icon: 'camera' });
    } catch (e) {
      notify('Foto', e instanceof Error ? e.message : 'Das Foto konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
  const pair = compare.map((id) => state.photos.find((p) => p.id === id)).filter((p): p is ProgressPhoto => !!p).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <Screen edges={['bottom']}>
      <Txt variant="small">Fotos zeigen Fortschritte, die die Waage nicht sieht. Am besten gleiches Licht, gleiche Pose, alle 1–2 Wochen. Die Bilder bleiben nur auf diesem Gerät.</Txt>
      <Segmented options={POSES} value={pose} onChange={(p) => { setPose(p); setCompare([]); }} />
      <Row gap={10}>
        <Button title="Foto aufnehmen" icon="camera" full={false} style={{ flex: 1 }} onPress={() => void add('camera')} loading={busy} testID="photo-camera" />
        <Button title="Aus Galerie" icon="image-multiple" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => void add('library')} disabled={busy} testID="photo-library" />
      </Row>

      {pair.length === 2 ? (
        <Card style={{ gap: 8 }} testID="photo-compare">
          <Txt variant="h3">Vergleich</Txt>
          <Row gap={8} align="flex-start">
            {pair.map((p) => (
              <View key={p.id} style={{ flex: 1, gap: 4 }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.cardAlt }} resizeMode="cover" />
                <Txt variant="small" bold center>
                  {formatShortDate(p.date)}
                </Txt>
                {p.weightKg ? (
                  <Txt variant="caption" center>
                    {formatWeight(p.weightKg, wu)}
                  </Txt>
                ) : null}
              </View>
            ))}
          </Row>
          {pair[0].weightKg && pair[1].weightKg ? (
            <Txt variant="small" center>
              Unterschied: {pair[1].weightKg - pair[0].weightKg > 0 ? '+' : ''}
              {formatWeight(pair[1].weightKg - pair[0].weightKg, wu)}
            </Txt>
          ) : null}
        </Card>
      ) : list.length >= 2 ? (
        <Txt variant="caption" center>
          Tippe auf zwei Fotos, um sie nebeneinander zu vergleichen.
        </Txt>
      ) : null}

      {list.length === 0 ? (
        <EmptyState icon="camera-outline" title="Noch keine Fotos" text={`Mach dein erstes Foto (${POSES.find((p) => p.value === pose)?.label}) als Startpunkt.`} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {list.map((p) => {
            const sel = compare.includes(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggleCompare(p.id)}
                onLongPress={async () => {
                  if (await confirm('Foto löschen?', 'Das Foto wird dauerhaft von diesem Gerät gelöscht.', 'Löschen', true)) {
                    deletePhotoFile(p.uri);
                    actions.removePhoto(p.id);
                    setCompare((c) => c.filter((x) => x !== p.id));
                  }
                }}
                accessibilityRole="button"
                accessibilityHint="Tippen zum Vergleichen, lange drücken zum Löschen"
                style={{ width: '31.5%', gap: 2 }}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.sm, borderWidth: sel ? 3 : 0, borderColor: colors.primary, backgroundColor: colors.cardAlt }}
                />
                <Txt variant="caption" center>
                  {formatShortDate(p.date)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}
      {compare.length > 0 ? <Chip label="Auswahl aufheben" onPress={() => setCompare([])} /> : null}
      <Txt variant="caption" center>
        Lange drücken zum Löschen.
      </Txt>
    </Screen>
  );
}

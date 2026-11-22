import { router } from 'expo-router';
import React, { useState } from 'react';

import { useToast } from '../../components/Toast';
import { Button, Card, Divider, EmptyState, IconButton, ListItem, Screen, Segmented } from '../../components/ui';
import { formatNumber } from '../../lib/calc';
import { putFood } from '../../lib/foodCache';
import { confirm } from '../../lib/platform';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function MyFoods() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<'custom' | 'favorites' | 'recent'>('custom');
  const list = tab === 'custom' ? state.customFoods : tab === 'favorites' ? state.favorites : state.recentFoods;

  return (
    <Screen edges={['bottom']}>
      <Segmented
        options={[
          { value: 'custom', label: `Eigene (${state.customFoods.length})` },
          { value: 'favorites', label: `Favoriten (${state.favorites.length})` },
          { value: 'recent', label: 'Zuletzt' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'custom' ? <Button title="Neues Lebensmittel anlegen" icon="plus" variant="soft" onPress={() => router.push('/food/custom')} /> : null}
      {list.length === 0 ? (
        <EmptyState
          icon={tab === 'favorites' ? 'star-outline' : 'food-apple-outline'}
          title="Noch leer"
          text={tab === 'favorites' ? 'Tippe beim Hinzufügen auf den Stern, um Favoriten zu speichern.' : 'Hier erscheinen deine Lebensmittel.'}
        />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          {list.map((f, i) => (
            <React.Fragment key={f.id}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                title={f.name}
                subtitle={`${f.brand ? `${f.brand} · ` : ''}${formatNumber(f.per100.kcal)} kcal / 100 ${f.unit}`}
                onPress={() => {
                  putFood(f);
                  router.push({ pathname: '/food/add', params: { foodId: f.id } });
                }}
                right={
                  tab === 'custom' ? (
                    <IconButton icon="pencil" label="Bearbeiten" color={colors.primary} onPress={() => router.push({ pathname: '/food/custom', params: { id: f.id } })} />
                  ) : tab === 'favorites' ? (
                    <IconButton icon="star" label="Favorit entfernen" color={colors.warning} onPress={() => actions.toggleFavorite(f)} />
                  ) : undefined
                }
              />
            </React.Fragment>
          ))}
        </Card>
      )}
      {tab === 'recent' && list.length > 0 ? (
        <Button
          title="Verlauf leeren"
          variant="danger"
          icon="delete-sweep"
          onPress={async () => {
            if (await confirm('Verlauf leeren?', 'Die Liste der zuletzt verwendeten Lebensmittel wird geleert.', 'Leeren', true)) {
              actions.clearRecent();
              toast('Verlauf geleert');
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

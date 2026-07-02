import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ISRAELI_CITIES = [
  'Jerusalem', 'Tel Aviv', 'Haifa', 'Rishon LeZion', 'Petah Tikva',
  'Ashdod', 'Netanya', 'Beer Sheva', 'Bnei Brak', 'Holon',
  'Ramat Gan', 'Rehovot', 'Bat Yam', 'Ashkelon', 'Beit Shemesh',
  "Modi'in", 'Nazareth', 'Lod', "Ra'anana", 'Kfar Saba',
  'Herzliya', 'Hadera', 'Ramla', 'Acre', 'Eilat',
  'Nahariya', 'Afula', 'Kiryat Gat', 'Kiryat Ata', 'Kiryat Bialik',
  'Givatayim', 'Kiryat Motzkin', 'Or Yehuda', 'Tiberias', 'Rosh HaAyin',
  'Hod HaSharon', 'Dimona', 'Migdal HaEmek', 'Sderot', 'Umm al-Fahm',
  'Tamra', 'Taibeh', 'Shfaram', 'Rahat', 'Sakhnin',
  'Tira', 'Kafr Qasim', "Baqa al-Gharbiyye", 'Nesher', 'Yehud',
  'Gan Yavne', 'Even Yehuda', 'Shoham', 'Pardes Hanna', 'Zichron Yaakov',
  'Netivot', 'Ofakim', 'Arad', 'Mitzpe Ramon', 'Kiryat Shmona',
  'Safed', "Ma'alot-Tarshiha", 'Yokneam', 'Tirat Carmel', 'Givat Shmuel',
  'Ganei Tikva', 'Or Akiva', 'Kafr Kanna', 'Kfar Yona', 'Ariel',
];

type CityPickerProps = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
};

export default function CityPicker({ value, onChange, placeholder = 'Select city' }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() =>
    query.trim().length === 0
      ? ISRAELI_CITIES
      : ISRAELI_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const handleSelect = (city: string) => {
    onChange(city);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        }}
        className="dark:bg-surface-cardDark dark:border-slate-800"
      >
        <Ionicons name="location-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <Text style={{ flex: 1, fontSize: 14, color: value ? '#0F172A' : '#94A3B8' }}
              className={value ? 'dark:text-text-darkPrimary' : ''}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0' }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Choose City</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor="#94A3B8"
              autoFocus
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A' }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 15,
                    borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9',
                    backgroundColor: selected ? '#CCFBF1' : '#FFFFFF',
                  }}
                >
                  <Ionicons
                    name={selected ? 'location' : 'location-outline'}
                    size={16}
                    color={selected ? '#0F766E' : '#94A3B8'}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: selected ? '700' : '400', color: selected ? '#0F766E' : '#0F172A' }}>
                    {item}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color="#0F766E" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: '#94A3B8', fontSize: 14 }}>No cities found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

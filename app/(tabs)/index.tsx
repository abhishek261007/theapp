import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  RefreshControl
} from 'react-native';

import {
  useEffect,
  useState,
  useMemo
} from 'react';

import api from '../../services/api';

import { router } from 'expo-router';

export default function CatalogsScreen() {
  const [catalogs, setCatalogs] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState('');

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const res = await api.get(
        '/public/catalogs'
      );

      setCatalogs(res.data);

    } catch (err) {
      console.log(err);

    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchCatalogs();

    setRefreshing(false);
  };

  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(
      (catalog: any) =>
        catalog.name
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );
  }, [catalogs, search]);

  const openCatalog = (item: any) => {
    router.push({
      pathname: '/catalog/[id]',
      params: {
        id: item._id,
        name: item.name
      }
    });
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#F8F8F8'
      }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 20
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom: 24
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '700',
                color: '#111'
              }}
            >
              PM Jewellers
            </Text>

            <Text
              style={{
                marginTop: 4,
                color: '#777',
                letterSpacing: 2,
                fontSize: 12,
                fontWeight: '600'
              }}
            >
              COLLECTIONS
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push('/cart')
            }
            style={{
              backgroundColor: '#000',
              width: 58,
              height: 58,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 24
              }}
            >
              🛒
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Search collections..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={{
            backgroundColor: '#fff',
            padding: 18,
            borderRadius: 18,
            marginBottom: 20,
            fontSize: 16,
            color: '#111',
            borderWidth: 1,
            borderColor: '#ECECEC'
          }}
        />

        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ActivityIndicator
              size="large"
            />
          </View>
        ) : (
          <FlatList
            data={filteredCatalogs}
            keyExtractor={(item: any) =>
              item._id
            }
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={{
              paddingBottom: 40,
              flexGrow:
                filteredCatalogs.length === 0
                  ? 1
                  : 0
            }}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  openCatalog(item)
                }
                style={{
                  backgroundColor: '#fff',
                  padding: 24,
                  borderRadius: 24,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#ECECEC',
                  shadowColor: '#000',
                  shadowOpacity: 0.03,
                  shadowRadius: 10,
                  elevation: 2
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: '#111'
                  }}
                >
                  {item.name}
                </Text>

                <Text
                  style={{
                    color: '#777',
                    marginTop: 8,
                    fontSize: 15
                  }}
                >
                  {item.description ||
                    'Jewellery Collection'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingBottom: 120
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    marginBottom: 16
                  }}
                >
                  💎
                </Text>

                <Text
                  style={{
                    color: '#111',
                    fontSize: 24,
                    fontWeight: '700'
                  }}
                >
                  No collections yet
                </Text>

                <Text
                  style={{
                    color: '#777',
                    marginTop: 10,
                    fontSize: 16,
                    textAlign: 'center',
                    lineHeight: 24,
                    paddingHorizontal: 20
                  }}
                >
                  Pull down to refresh
                  collections.
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
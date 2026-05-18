import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput
} from 'react-native';

import {
  useLocalSearchParams,
  router
} from 'expo-router';

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import api from '../../services/api';

export default function CatalogDetailsScreen() {
  const { id, name } = useLocalSearchParams();

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const res = await api.get(
        `/public/designs?catalogId=${id}`
      );

      setDesigns(res.data);

    } catch (err) {
      console.log(err);

    } finally {
      setLoading(false);
    }
  };

  const filteredDesigns = useMemo(() => {
    return designs.filter((item: any) => {
      const query = search.toLowerCase();

      return (
        item.title?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query)
      );
    });
  }, [search, designs]);

  const openDesign = (item: any) => {
    router.push({
      pathname: '/design/[id]',
      params: {
        id: item._id,
        title: item.title,
        sku: item.sku,
        weight: item.weight,
        status: item.status,
        imageUrl: item.imageUrl
      }
    });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F8F8F8',
        paddingTop: 80,
        paddingHorizontal: 20
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 30
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16
          }}
        >
          <Text
            style={{
              fontSize: 22
            }}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: '#111'
            }}
          >
            {name}
          </Text>

          <Text
            style={{
              color: '#777',
              letterSpacing: 2,
              marginTop: 4,
              fontWeight: '600',
              fontSize: 12
            }}
          >
            DESIGNS
          </Text>
        </View>
      </View>

      <TextInput
        placeholder="Search designs..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
        style={{
          backgroundColor: '#fff',
          padding: 18,
          borderRadius: 18,
          marginBottom: 24,
          fontSize: 16
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
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredDesigns}
          keyExtractor={(item: any) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            flexGrow: filteredDesigns.length === 0 ? 1 : 0
          }}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openDesign(item)}
              style={{
                backgroundColor: '#fff',
                borderRadius: 24,
                padding: 16,
                marginBottom: 16
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{
                    uri:
                      `https://apis.27012610.xyz${item.imageUrl}`
                  }}
                  style={{
                    width: '100%',
                    height: 220,
                    borderRadius: 18,
                    marginBottom: 16
                  }}
                  resizeMode="cover"
                />
              ) : null}

              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#111'
                }}
              >
                {item.title}
              </Text>

              <Text
                style={{
                  color: '#777',
                  marginTop: 6,
                  fontSize: 15
                }}
              >
                SKU: {item.sku}
              </Text>

              <Text
                style={{
                  color: '#777',
                  marginTop: 4,
                  fontSize: 15
                }}
              >
                Weight: {item.weight}g
              </Text>

              <View
                style={{
                  marginTop: 16,
                  alignSelf: 'flex-start',
                  backgroundColor:
                    item.status === 'sold'
                      ? '#FFE5E5'
                      : '#E8F8EC',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999
                }}
              >
                <Text
                  style={{
                    color:
                      item.status === 'sold'
                        ? '#D33'
                        : '#14833B',
                    fontWeight: '700'
                  }}
                >
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
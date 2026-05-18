import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';

import {
  useLocalSearchParams,
  router
} from 'expo-router';

import useCartStore from '../../store/cartStore';

export default function DesignDetailsScreen() {
  const {
    id,
    title,
    sku,
    weight,
    status,
    imageUrl
  } = useLocalSearchParams();

  const addToCart = useCartStore(
    (s: any) => s.addToCart
  );

  const handleAddToCart = () => {
    addToCart({
      _id: id,
      title,
      sku,
      weight,
      status,
      imageUrl
    });

    Alert.alert(
      'Added To Cart',
      'Design added successfully'
    );
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#F8F8F8'
      }}
    >
      <View
        style={{
          paddingTop: 80,
          paddingHorizontal: 20,
          paddingBottom: 40
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
            marginBottom: 24
          }}
        >
          <Text style={{ fontSize: 22 }}>‹</Text>
        </TouchableOpacity>

        {imageUrl ? (
          <Image
            source={{
              uri: `https://apis.27012610.xyz${imageUrl}`
            }}
            style={{
              width: '100%',
              height: 340,
              borderRadius: 28,
              marginBottom: 24
            }}
            resizeMode="cover"
          />
        ) : null}

        <Text
          style={{
            fontSize: 34,
            fontWeight: '700',
            color: '#111'
          }}
        >
          {title}
        </Text>

        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 24,
            marginTop: 24
          }}
        >
          <Text
            style={{
              color: '#777',
              marginBottom: 8,
              fontSize: 14
            }}
          >
            SKU
          </Text>

          <Text
            style={{
              fontSize: 22,
              fontWeight: '600',
              color: '#111'
            }}
          >
            {sku}
          </Text>

          <View
            style={{
              height: 1,
              backgroundColor: '#EEE',
              marginVertical: 20
            }}
          />

          <Text
            style={{
              color: '#777',
              marginBottom: 8,
              fontSize: 14
            }}
          >
            Weight
          </Text>

          <Text
            style={{
              fontSize: 22,
              fontWeight: '600',
              color: '#111'
            }}
          >
            {weight}g
          </Text>

          <View
            style={{
              height: 1,
              backgroundColor: '#EEE',
              marginVertical: 20
            }}
          />

          <Text
            style={{
              color: '#777',
              marginBottom: 8,
              fontSize: 14
            }}
          >
            Status
          </Text>

          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor:
                status === 'sold'
                  ? '#FFE5E5'
                  : '#E8F8EC',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                color:
                  status === 'sold'
                    ? '#D33'
                    : '#14833B'
              }}
            >
              {status}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleAddToCart}
          style={{
            backgroundColor: '#000',
            padding: 20,
            borderRadius: 20,
            alignItems: 'center',
            marginTop: 24
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: '700',
              fontSize: 16
            }}
          >
            Add To Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 20,
            alignItems: 'center',
            marginTop: 14
          }}
        >
          <Text
            style={{
              color: '#111',
              fontWeight: '700',
              fontSize: 16
            }}
          >
            Open Cart
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
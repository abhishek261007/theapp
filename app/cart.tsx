import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';

import { useState } from 'react';

import api from '../services/api';

import useCartStore from '../store/cartStore';

export default function CartScreen() {
  const items = useCartStore((s: any) => s.items);

  const removeFromCart = useCartStore(
    (s: any) => s.removeFromCart
  );

  const clearCart = useCartStore(
    (s: any) => s.clearCart
  );

  const [customerName, setCustomerName] =
    useState('');

  const [customerPhone, setCustomerPhone] =
    useState('');

  const placeOrder = async () => {
    if (!customerName || !customerPhone) {
      Alert.alert(
        'Missing Details',
        'Please enter customer details'
      );

      return;
    }

    if (items.length === 0) {
      Alert.alert(
        'Empty Cart',
        'Add designs first'
      );

      return;
    }

    try {
      await api.post('/public/orders', {
        customerName,
        customerPhone,
        items: items.map((i: any) => i._id)
      });

      clearCart();

      setCustomerName('');
      setCustomerPhone('');

      Alert.alert(
        'Order Placed',
        'Your jewellery inquiry has been submitted.'
      );

    } catch (err) {
      console.log(err);

      Alert.alert(
        'Error',
        'Could not place order'
      );
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#F8F8F8'
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 120
          }}
        >
          <Text
            style={{
              fontSize: 34,
              fontWeight: '700',
              color: '#111',
              marginBottom: 20
            }}
          >
            Cart
          </Text>

          {items.map((item: any) => (
            <View
              key={item._id}
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
                    height: 200,
                    borderRadius: 18,
                    marginBottom: 16
                  }}
                  resizeMode="cover"
                />
              ) : null}

              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700'
                }}
              >
                {item.title}
              </Text>

              <Text
                style={{
                  color: '#777',
                  marginTop: 6
                }}
              >
                SKU: {item.sku}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  removeFromCart(item._id)
                }
                style={{
                  marginTop: 16,
                  backgroundColor: '#FFE5E5',
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center'
                }}
              >
                <Text
                  style={{
                    color: '#D33',
                    fontWeight: '700'
                  }}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <TextInput
            placeholder="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
            placeholderTextColor={"#888"}
            style={{
              backgroundColor: '#fff',
              padding: 18,
              borderRadius: 18,
              marginBottom: 14,
              fontSize: 16
            }}
          />

          <TextInput
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholderTextColor={"#888"}
            style={{
              backgroundColor: '#fff',
              padding: 18,
              borderRadius: 18,
              marginBottom: 18,
              fontSize: 16
            }}
          />

          <TouchableOpacity
            onPress={placeOrder}
            style={{
              backgroundColor: '#000',
              padding: 20,
              borderRadius: 20,
              alignItems: 'center'
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontWeight: '700',
                fontSize: 16
              }}
            >
              Place Order
            </Text>
          </TouchableOpacity>

          {items.length === 0 && (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 80
              }}
            >
              <Text
                style={{
                  fontSize: 26,
                  marginBottom: 12
                }}
              >
                🛒
              </Text>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#111'
                }}
              >
                Cart is empty
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View as RNView } from 'react-native';

type Point = {
  x: number;
  y: number;
};

type FlyPayload = Point & {
  imageUri?: string;
};

type CartFlyContextValue = {
  registerCartTarget: (point: Point) => void;
  flyToCart: (payload: FlyPayload) => void;
};

const CartFlyContext = createContext<CartFlyContextValue | null>(null);

type Flight = {
  id: number;
  start: Point;
  end: Point;
  imageUri?: string;
};

export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<Point | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const [flight, setFlight] = useState<Flight | null>(null);

  const registerCartTarget = useCallback((point: Point) => {
    targetRef.current = point;
  }, []);

  const flyToCart = useCallback((payload: FlyPayload) => {
    const fallbackTarget = targetRef.current || { x: 340, y: 28 };
    const nextFlight = {
      id: Date.now(),
      start: { x: payload.x, y: payload.y },
      end: fallbackTarget,
      imageUri: payload.imageUri,
    };

    progress.stopAnimation();
    progress.setValue(0);
    setFlight(nextFlight);

    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => setFlight(null));
  }, [progress]);

  const contextValue = useMemo(
    () => ({ registerCartTarget, flyToCart }),
    [flyToCart, registerCartTarget],
  );

  const translateX = flight
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [flight.start.x - 22, flight.end.x - 16],
      })
    : 0;
  const translateY = flight
    ? progress.interpolate({
        inputRange: [0, 0.58, 1],
        outputRange: [flight.start.y - 22, Math.min(flight.start.y, flight.end.y) - 92, flight.end.y - 16],
      })
    : 0;
  const scale = progress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 0.72, 0.28],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <CartFlyContext.Provider value={contextValue}>
      {children}
      {flight ? (
        <RNView pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.flyItem,
              {
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          >
            {flight.imageUri ? (
              <Image source={{ uri: flight.imageUri }} style={styles.flyImage} resizeMode="cover" />
            ) : (
              <RNView style={styles.flyFallback} />
            )}
          </Animated.View>
        </RNView>
      ) : null}
    </CartFlyContext.Provider>
  );
}

export function useCartFlyAnimation() {
  const context = useContext(CartFlyContext);
  if (!context) {
    return {
      registerCartTarget: () => undefined,
      flyToCart: () => undefined,
    };
  }
  return context;
}

const styles = StyleSheet.create({
  flyItem: {
    position: 'absolute',
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'hidden',
  },
  flyImage: {
    width: '100%',
    height: '100%',
  },
  flyFallback: {
    flex: 1,
    backgroundColor: '#f59e0b',
  },
});

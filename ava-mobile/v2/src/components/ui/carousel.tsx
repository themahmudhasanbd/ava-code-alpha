import * as React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

interface CarouselContextType {
  scrollPrev: () => void;
  scrollNext: () => void;
  orientation?: "horizontal" | "vertical";
}

const CarouselContext = React.createContext<CarouselContextType>({
  scrollPrev: () => {},
  scrollNext: () => {},
});

export function useCarousel() {
  return React.useContext(CarouselContext);
}

export interface CarouselProps {
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Carousel({
  orientation = "horizontal",
  style,
  children,
}: CarouselProps) {
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollOffsetRef = React.useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current =
      orientation === "horizontal"
        ? e.nativeEvent.contentOffset.x
        : e.nativeEvent.contentOffset.y;
  };

  const scrollPrev = () => {
    const nextOffset = Math.max(0, scrollOffsetRef.current - 280);
    scrollRef.current?.scrollTo({
      [orientation === "horizontal" ? "x" : "y"]: nextOffset,
      animated: true,
    });
  };

  const scrollNext = () => {
    const nextOffset = scrollOffsetRef.current + 280;
    scrollRef.current?.scrollTo({
      [orientation === "horizontal" ? "x" : "y"]: nextOffset,
      animated: true,
    });
  };

  return (
    <CarouselContext.Provider value={{ scrollPrev, scrollNext, orientation }}>
      <View style={[styles.carousel, style]}>
        <ScrollView
          ref={scrollRef}
          horizontal={orientation === "horizontal"}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.contentContainer}
        >
          {children}
        </ScrollView>
      </View>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CarouselItem({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.item, style]}>{children}</View>;
}

export function CarouselPrevious({ style }: { style?: StyleProp<ViewStyle> }) {
  const { scrollPrev } = useCarousel();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={scrollPrev}
      style={[styles.btn, styles.prevBtn, style]}
    >
      <ArrowLeft size={16} color={COLORS.foreground} />
    </TouchableOpacity>
  );
}

export function CarouselNext({ style }: { style?: StyleProp<ViewStyle> }) {
  const { scrollNext } = useCarousel();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={scrollNext}
      style={[styles.btn, styles.nextBtn, style]}
    >
      <ArrowRight size={16} color={COLORS.foreground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  carousel: {
    position: "relative",
    width: "100%",
  },
  contentContainer: {
    flexDirection: "row",
    gap: 12,
  },
  content: {
    flexDirection: "row",
    gap: 12,
  },
  item: {
    minWidth: 260,
  },
  btn: {
    position: "absolute",
    top: "50%",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    marginTop: -16,
  },
  prevBtn: {
    left: -16,
  },
  nextBtn: {
    right: -16,
  },
});
